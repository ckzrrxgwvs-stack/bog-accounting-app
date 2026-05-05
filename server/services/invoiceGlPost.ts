import { InvoiceStatus, InvoiceType, EntryStatus, Prisma } from '@prisma/client';
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

/**
 * Creates a posted journal entry for an invoice (AR or AP) and ledger detail lines.
 * Idempotent if glJournalEntryId already set.
 */
export async function postInvoiceToGeneralLedger(
  invoiceId: string
): Promise<{ journalEntryId: string; alreadyPosted?: true }> {
  const company = await getOrCreateDefaultCompany();

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: company.id },
    include: { lines: true, customer: true, vendor: true },
  });

  if (!inv) {
    throw new Error('Invoice not found');
  }
  if (inv.glJournalEntryId) {
    return { journalEntryId: inv.glJournalEntryId, alreadyPosted: true as const };
  }
  if (inv.status === InvoiceStatus.DRAFT || inv.status === InvoiceStatus.CANCELLED) {
    throw new Error('Invoice must be active (not draft/cancelled) to post to GL');
  }

  const d = inv.issueDate;
  await assertPeriodOpen(company.id, d);
  const { period, year } = periodParts(d);

  const co = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });
  const fc = (co.currency ?? 'USD').toUpperCase();
  const txCur = (inv.currency ?? fc).toUpperCase();

  const totalRaw = dec(inv.total as never);
  const taxRaw = dec(inv.taxAmount as never);

  let total = totalRaw;
  let tax = taxRaw;
  if (txCur !== fc) {
    total = await requireConvertedAmount(company.id, totalRaw, txCur, fc, d);
    tax = taxRaw > 0.005 ? await requireConvertedAmount(company.id, taxRaw, txCur, fc, d) : 0;
  }
  const revenueAmount = tax > 0.005 ? Math.max(0, total - tax) : total;

  const lines: { accountId: string; debit: number; credit: number; note: string }[] = [];

  if (inv.type === InvoiceType.AR_INVOICE) {
    if (!inv.customerId) throw new Error('AR invoice requires a customer');
    const arId = await requireAccountIdByCode(company.id, co.glArAccountCode ?? '1200');
    const revId = await requireAccountIdByCode(company.id, co.glRevenueAccountCode ?? '4100');
    lines.push({ accountId: arId, debit: total, credit: 0, note: `AR ${inv.invoiceNumber}` });
    if (tax > 0.005) {
      const taxId = await requireAccountIdByCode(company.id, co.glSalesTaxPayableAccountCode ?? '2150');
      lines.push({ accountId: revId, debit: 0, credit: revenueAmount, note: `Revenue ${inv.invoiceNumber}` });
      lines.push({ accountId: taxId, debit: 0, credit: tax, note: `Sales tax ${inv.invoiceNumber}` });
    } else {
      lines.push({ accountId: revId, debit: 0, credit: total, note: `Revenue ${inv.invoiceNumber}` });
    }
  } else if (inv.type === InvoiceType.AR_CREDIT_MEMO) {
    if (!inv.customerId) throw new Error('AR credit memo requires a customer');
    const arId = await requireAccountIdByCode(company.id, co.glArAccountCode ?? '1200');
    const revId = await requireAccountIdByCode(company.id, co.glRevenueAccountCode ?? '4100');
    lines.push({ accountId: arId, debit: 0, credit: total, note: `AR credit ${inv.invoiceNumber}` });
    if (tax > 0.005) {
      const taxId = await requireAccountIdByCode(company.id, co.glSalesTaxPayableAccountCode ?? '2150');
      lines.push({ accountId: revId, debit: revenueAmount, credit: 0, note: `Revenue reversal ${inv.invoiceNumber}` });
      lines.push({ accountId: taxId, debit: tax, credit: 0, note: `Tax reversal ${inv.invoiceNumber}` });
    } else {
      lines.push({ accountId: revId, debit: total, credit: 0, note: `Revenue reversal ${inv.invoiceNumber}` });
    }
  } else if (inv.type === InvoiceType.AP_INVOICE) {
    if (!inv.vendorId) throw new Error('AP invoice requires a vendor');
    const apId = await requireAccountIdByCode(company.id, co.glApAccountCode ?? '2100');
    const expId = await requireAccountIdByCode(
      company.id,
      co.glPurchasesExpenseAccountCode ?? co.glExpenseAccountCode ?? '5100'
    );
    lines.push({ accountId: expId, debit: total, credit: 0, note: `Expense ${inv.invoiceNumber}` });
    lines.push({ accountId: apId, debit: 0, credit: total, note: `AP ${inv.invoiceNumber}` });
  } else if (inv.type === InvoiceType.AP_CREDIT_MEMO) {
    if (!inv.vendorId) throw new Error('AP credit memo requires a vendor');
    const apId = await requireAccountIdByCode(company.id, co.glApAccountCode ?? '2100');
    const expId = await requireAccountIdByCode(
      company.id,
      co.glPurchasesExpenseAccountCode ?? co.glExpenseAccountCode ?? '5100'
    );
    lines.push({ accountId: expId, debit: 0, credit: total, note: `Expense reversal ${inv.invoiceNumber}` });
    lines.push({ accountId: apId, debit: total, credit: 0, note: `AP credit ${inv.invoiceNumber}` });
  } else {
    throw new Error('Unsupported invoice type for GL posting');
  }

  let dr = 0;
  let cr = 0;
  for (const l of lines) {
    dr += l.debit;
    cr += l.credit;
  }
  if (Math.abs(dr - cr) > 0.02) {
    throw new Error('Internal error: GL lines not balanced');
  }

  const jeId = await prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        companyId: company.id,
        date: d,
        description: `Invoice ${inv.invoiceNumber}`,
        reference: inv.id,
        status: EntryStatus.POSTED,
        period,
        year,
        createdBy: 'system:invoice',
        sourceType: 'INVOICE',
        sourceId: inv.id,
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

    await tx.invoice.update({
      where: { id: inv.id },
      data: {
        glPostedAt: new Date(),
        glJournalEntryId: je.id,
      },
    });

    return je.id;
  });

  if (inv.customerId) await syncCustomerBalance(inv.customerId);
  if (inv.vendorId) await syncVendorBalance(inv.vendorId);

  return { journalEntryId: jeId };
}
