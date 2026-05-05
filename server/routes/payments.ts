import { Router } from 'express';
import { PaymentMethod, PaymentStatus, AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { postPaymentToGeneralLedger } from '../services/paymentGlPost';
import { writeAuditLog } from '../lib/auditLog';
import { requireJwtForGlPost } from '../middleware/requireJwtForGl';
import { requireGlPostRole } from '../middleware/requireGlPostRole';
import { requirePaymentGlClerkScope } from '../middleware/requireGlClerkScopeForGl';
import type { Request } from 'express';
import { convertCurrencyAmount } from '../services/exchangeRateService';

const router = Router();

type CompanyFx = { id: string; currency: string; useMultiCurrency: boolean };

const mockPayments = [
  {
    id: 'p1',
    date: '2026-04-20',
    amount: 5200,
    currency: 'USD',
    method: 'ACH',
    reference: 'PMT-001',
    type: 'AR' as const,
    status: 'PROCESSED',
    appliedAmount: 5200,
    glJournalEntryId: null,
    glPostedAt: null,
  },
  {
    id: 'p2',
    date: '2026-04-18',
    amount: 2200,
    currency: 'USD',
    method: 'WIRE_TRANSFER',
    reference: 'PMT-002',
    type: 'AP' as const,
    status: 'PROCESSED',
    appliedAmount: 2200,
    glJournalEntryId: null,
    glPostedAt: null,
  },
];

function parsePaymentMethod(raw: string | undefined): PaymentMethod {
  if (!raw) return 'CHECK';
  const s = String(raw).toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, PaymentMethod> = {
    CHECK: 'CHECK',
    CASH: 'CASH',
    ACH: 'ACH',
    WIRE: 'WIRE_TRANSFER',
    WIRE_TRANSFER: 'WIRE_TRANSFER',
    CREDIT_CARD: 'CREDIT_CARD',
    CARD: 'CREDIT_CARD',
    OTHER: 'OTHER',
  };
  return map[s] ?? 'OTHER';
}

function inferPaymentType(
  apps: { invoice: { type: string } }[] | undefined
): 'AR' | 'AP' {
  if (!apps?.length) return 'AR';
  const ap = apps.some((a) => a.invoice.type.startsWith('AP'));
  return ap ? 'AP' : 'AR';
}

function mapPaymentRow(p: {
  id: string;
  paymentNumber: string;
  date: Date;
  amount: unknown;
  currency?: string;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  appliedAmount: unknown;
  glPostedAt?: Date | null;
  glJournalEntryId?: string | null;
  invoices?: { invoice: { type: string } }[];
}) {
  return {
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    amount: dec(p.amount as never),
    currency: (p.currency ?? 'USD').toUpperCase(),
    method: p.method,
    reference: p.reference ?? p.paymentNumber,
    type: inferPaymentType(p.invoices),
    status: p.status,
    appliedAmount: dec(p.appliedAmount as never),
    glPostedAt: p.glPostedAt ? p.glPostedAt.toISOString() : null,
    glJournalEntryId: p.glJournalEntryId ?? null,
  };
}

async function enrichPaymentRow(
  p: Parameters<typeof mapPaymentRow>[0] & { date: Date; currency?: string },
  company: CompanyFx
) {
  const mapped = mapPaymentRow(p);
  const fc = (company.currency ?? 'USD').toUpperCase();
  const cur = mapped.currency;
  const asOf = p.date;
  if (!company.useMultiCurrency || cur === fc) {
    return { ...mapped, functionalAmount: mapped.amount, fxMissing: false };
  }
  const functionalAmount = await convertCurrencyAmount(company.id, mapped.amount, cur, fc, asOf);
  return { ...mapped, functionalAmount, fxMissing: functionalAmount === null };
}

router.get('/', async (req, res) => {
  const { type } = req.query;

  if (!useDatabase()) {
    let list = [...mockPayments].map((p) => ({
      ...p,
      functionalAmount: p.amount,
      fxMissing: false,
    }));
    if (type === 'AR' || type === 'AP') list = list.filter((p) => p.type === type);
    res.json({ payments: list });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const rows = await prisma.payment.findMany({
      where: { companyId: company.id },
      include: {
        invoices: { include: { invoice: { select: { type: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    let mapped = await Promise.all(rows.map((r) => enrichPaymentRow(r, companyFx)));
    if (type === 'AR' || type === 'AP') {
      mapped = mapped.filter((p) => p.type === type);
    }
    res.json({ payments: mapped });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    date?: string;
    amount?: number;
    method?: string;
    reference?: string;
    type?: 'AR' | 'AP';
    invoiceId?: string;
    applyAmount?: number;
    currency?: string;
  };

  if (!useDatabase()) {
    const rawAmt = Number(body.amount) || 0;
    const payment = {
      id: `p-${Date.now()}`,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      amount: rawAmt,
      currency: 'USD',
      functionalAmount: rawAmt,
      fxMissing: false,
      method: parsePaymentMethod(body.method),
      reference: body.reference ?? '',
      type: body.type ?? 'AR',
    };
    res.status(201).json({ payment });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const coRow = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { currency: true, useMultiCurrency: true },
    });
    const fc = (coRow.currency ?? 'USD').toUpperCase();
    let currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : fc;
    if (!coRow.useMultiCurrency) currency = fc;
    if (!/^[A-Z]{3}$/.test(currency)) {
      res.status(400).json({ error: 'currency must be a 3-letter ISO code (e.g. USD, EUR, MXN)' });
      return;
    }

    const amt = Number(body.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'Valid amount required' });
      return;
    }

    const paymentNumber = body.reference?.startsWith('PMT-')
      ? body.reference
      : `PMT-${Date.now()}`;
    const d = body.date ? new Date(body.date) : new Date();
    const method = parsePaymentMethod(body.method);

    let apply = 0;
    let invoiceConnect:
      | { create: { amount: number; invoiceId: string } }
      | undefined;

    if (body.invoiceId) {
      const applyAmt = Number(body.applyAmount ?? amt);
      const inv = await prisma.invoice.findFirst({
        where: { id: body.invoiceId, companyId: company.id },
      });
      if (!inv) {
        res.status(400).json({ error: 'Invoice not found' });
        return;
      }
      const invCur = (inv.currency ?? fc).toUpperCase();
      if (invCur !== currency) {
        res.status(400).json({
          error: `Payment currency (${currency}) must match invoice currency (${invCur}) for this allocation`,
        });
        return;
      }
      apply = Math.min(applyAmt, dec(inv.balance), amt);
      invoiceConnect = {
        create: { amount: apply, invoiceId: inv.id },
      };
    }

    const created = await prisma.payment.create({
      data: {
        companyId: company.id,
        paymentNumber,
        date: d,
        amount: amt,
        currency,
        method,
        reference: body.reference ?? null,
        status: 'PROCESSED' as PaymentStatus,
        appliedAmount: apply,
        ...(invoiceConnect ? { invoices: invoiceConnect } : {}),
      },
      include: {
        invoices: { include: { invoice: { select: { type: true } } } },
      },
    });

    if (body.invoiceId && created.invoices.length > 0) {
      const invId = body.invoiceId;
      const inv = await prisma.invoice.findFirst({ where: { id: invId } });
      if (inv) {
        const paid = dec(inv.paidAmount) + dec(created.appliedAmount);
        const bal = Math.max(0, dec(inv.total) - paid);
        await prisma.invoice.update({
          where: { id: invId },
          data: {
            paidAmount: paid,
            balance: bal,
            status: bal <= 0.005 ? 'PAID' : paid > 0 ? 'PARTIAL' : inv.status,
          },
        });
      }
    }

    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const paymentPayload = await enrichPaymentRow(
      {
        ...created,
        invoices: created.invoices.map((x) => ({
          invoice: x.invoice,
        })),
      },
      companyFx
    );
    res.status(201).json({ payment: paymentPayload });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Payment reference already exists' : 'Could not create payment' });
  }
});

router.post(
  '/:id/post-to-ledger',
  requireJwtForGlPost,
  requireGlPostRole,
  requirePaymentGlClerkScope,
  async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required for GL posting' });
    return;
  }

  const company = await getOrCreateDefaultCompany();
  const userId = (req as Request & { glAuth?: { sub?: string } }).glAuth?.sub ?? null;

  try {
    const result = await postPaymentToGeneralLedger(req.params.id);
    await writeAuditLog({
      companyId: company.id,
      userId,
      action: AuditAction.API_CALL,
      module: 'payment_gl',
      resourceId: req.params.id,
      resourceType: 'Payment',
      changes: { journalEntryId: result.journalEntryId, alreadyPosted: result.alreadyPosted ?? false },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      success: true,
    });
    res.json({
      journalEntryId: result.journalEntryId,
      alreadyPosted: result.alreadyPosted ?? false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Post failed';
    await writeAuditLog({
      companyId: company.id,
      userId,
      action: AuditAction.API_CALL,
      module: 'payment_gl',
      resourceId: req.params.id,
      resourceType: 'Payment',
      success: false,
      errorMessage: msg,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    res.status(400).json({ error: msg });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const p = mockPayments.find((x) => x.id === req.params.id);
    if (!p) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({ payment: p });
    return;
  }

  try {
    const row = await prisma.payment.findFirst({
      where: { id: req.params.id },
      include: {
        invoices: {
          include: {
            invoice: { include: { customer: true, vendor: true } },
          },
        },
      },
    });
    if (!row) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: row.companyId },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const base = await enrichPaymentRow(
      {
        ...row,
        invoices: row.invoices.map((app) => ({
          invoice: { type: app.invoice.type },
        })),
      },
      companyFx
    );
    res.json({
      payment: {
        ...base,
        applications: row.invoices.map((app) => ({
          invoiceId: app.invoiceId,
          amount: dec(app.amount),
          invoice: app.invoice,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as paymentsRouter };
