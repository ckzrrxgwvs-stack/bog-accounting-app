import { EntryStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { dec } from '../lib/serialize';
import { assertPeriodOpen } from './periodClose';
import { requireAccountIdByCode } from './glAccounts';
import { createLedgerEntriesForJournal } from './ledgerFromJournal';
import { syncCustomerBalance, syncVendorBalance } from './subledgerSync';
import { requireConvertedAmount } from './exchangeRateService';

function periodParts(d: Date) {
  return { period: d.getMonth() + 1, year: d.getFullYear() };
}

/** From payment applications: AP if any applied invoice is AP family; otherwise AR. */
export function inferArApFromApplications(
  apps: { invoice: { type: string } }[]
): 'AR' | 'AP' | null {
  if (!apps.length) return null;
  const anyAp = apps.some((a) => a.invoice.type.startsWith('AP'));
  return anyAp ? 'AP' : 'AR';
}

/**
 * Posts cash ↔ AR/AP journal for a processed payment with invoice applications.
 */
export async function postPaymentToGeneralLedger(
  paymentId: string
): Promise<{ journalEntryId: string; alreadyPosted?: true }> {
  const company = await getOrCreateDefaultCompany();
  const co = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });

  const pay = await prisma.payment.findFirst({
    where: { id: paymentId, companyId: company.id },
    include: {
      invoices: {
        include: { invoice: { select: { id: true, type: true, customerId: true, vendorId: true } } },
      },
    },
  });

  if (!pay) {
    throw new Error('Payment not found');
  }
  if (pay.glJournalEntryId) {
    return { journalEntryId: pay.glJournalEntryId, alreadyPosted: true };
  }
  if (pay.status !== PaymentStatus.PROCESSED) {
    throw new Error('Only processed payments can post to GL');
  }
  if (!pay.invoices.length) {
    throw new Error('Payment has no invoice applications — allocate to invoices before GL posting');
  }

  const mode = inferArApFromApplications(pay.invoices.map((x) => ({ invoice: x.invoice })));
  if (!mode) throw new Error('Could not infer AR vs AP');

  const d = pay.date;
  await assertPeriodOpen(company.id, d);
  const { period, year } = periodParts(d);

  const cashId = await requireAccountIdByCode(company.id, co.glCashAccountCode ?? '1100');
  const fc = (co.currency ?? 'USD').toUpperCase();
  const txCur = (pay.currency ?? fc).toUpperCase();

  let amountGl = dec(pay.amount as never);
  if (txCur !== fc) {
    amountGl = await requireConvertedAmount(company.id, amountGl, txCur, fc, d);
  }

  const lines: { accountId: string; debit: number; credit: number; note: string }[] = [];

  if (mode === 'AR') {
    const arCode = co.glArAccountCode ?? '1200';
    lines.push({ accountId: cashId, debit: amountGl, credit: 0, note: `Receipt ${pay.paymentNumber}` });
    for (const app of pay.invoices) {
      const arId = await requireAccountIdByCode(company.id, arCode);
      let a = dec(app.amount as never);
      if (txCur !== fc) {
        a = await requireConvertedAmount(company.id, a, txCur, fc, d);
      }
      lines.push({
        accountId: arId,
        debit: 0,
        credit: a,
        note: `Apply to invoice ${app.invoiceId}`,
      });
    }
  } else {
    const apCode = co.glApAccountCode ?? '2100';
    lines.push({ accountId: cashId, debit: 0, credit: amountGl, note: `Disbursement ${pay.paymentNumber}` });
    for (const app of pay.invoices) {
      const apId = await requireAccountIdByCode(company.id, apCode);
      let a = dec(app.amount as never);
      if (txCur !== fc) {
        a = await requireConvertedAmount(company.id, a, txCur, fc, d);
      }
      lines.push({
        accountId: apId,
        debit: a,
        credit: 0,
        note: `Apply to bill ${app.invoiceId}`,
      });
    }
  }

  let dr = 0;
  let cr = 0;
  for (const l of lines) {
    dr += l.debit;
    cr += l.credit;
  }
  if (Math.abs(dr - cr) > 0.02) {
    throw new Error(
      'Payment applications must equal payment amount before GL posting (sum of applied amounts vs payment total)'
    );
  }

  const jeId = await prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        companyId: company.id,
        date: d,
        description: `Payment ${pay.paymentNumber}`,
        reference: pay.id,
        status: EntryStatus.POSTED,
        period,
        year,
        createdBy: 'system:payment',
        sourceType: 'PAYMENT',
        sourceId: pay.id,
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit > 0 ? new Prisma.Decimal(l.debit) : null,
            credit: l.credit > 0 ? new Prisma.Decimal(l.credit) : null,
            description: l.note,
          })),
        },
      },
      include: { lines: true },
    });

    await createLedgerEntriesForJournal(tx, {
      companyId: company.id,
      journalEntryId: je.id,
      journalDate: d,
      description: je.description,
      lines: je.lines.map((x) => ({
        id: x.id,
        accountId: x.accountId,
        debit: x.debit,
        credit: x.credit,
      })),
    });

    await tx.payment.update({
      where: { id: pay.id },
      data: {
        glPostedAt: new Date(),
        glJournalEntryId: je.id,
      },
    });

    return je.id;
  });

  const custIds = new Set<string>();
  const vendIds = new Set<string>();
  for (const app of pay.invoices) {
    if (app.invoice.customerId) custIds.add(app.invoice.customerId);
    if (app.invoice.vendorId) vendIds.add(app.invoice.vendorId);
  }
  for (const id of custIds) await syncCustomerBalance(id);
  for (const id of vendIds) await syncVendorBalance(id);

  return { journalEntryId: jeId };
}
