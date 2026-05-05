import { Router } from 'express';
import type { Request } from 'express';
import { AuditAction, InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { postInvoiceToGeneralLedger } from '../services/invoiceGlPost';
import { writeAuditLog } from '../lib/auditLog';
import { requireJwtForGlPost } from '../middleware/requireJwtForGl';
import { requireGlPostRole } from '../middleware/requireGlPostRole';
import { requireInvoiceGlClerkScope } from '../middleware/requireGlClerkScopeForGl';
import { convertCurrencyAmount } from '../services/exchangeRateService';

const router = Router();

type CompanyFx = { id: string; currency: string; useMultiCurrency: boolean };

const mockInvoices = [
  { id: '1', number: 'INV-2026-1024', type: 'AR_INVOICE', customer: 'Acme Corporation', vendor: '', amount: 5200, balance: 5200, status: 'SENT', dueDate: '2026-05-20', date: '2026-04-20', paid: 0 },
  { id: '6', number: 'AP-2026-001', type: 'AP_INVOICE', customer: '', vendor: 'Office Depot', amount: 1250, balance: 1250, status: 'DRAFT', dueDate: '2026-05-25', date: '2026-04-25', paid: 0 },
];

function mapInvoiceList(i: {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  issueDate: Date;
  total: unknown;
  paidAmount: unknown;
  balance: unknown;
  dueDate: Date;
  customer: { name: string } | null;
  vendor: { name: string } | null;
  glPostedAt?: Date | null;
  glJournalEntryId?: string | null;
  currency?: string;
}) {
  const paid = dec(i.paidAmount as never);
  const total = dec(i.total as never);
  const cur = (i.currency ?? 'USD').toUpperCase();
  return {
    id: i.id,
    number: i.invoiceNumber,
    invoiceNumber: i.invoiceNumber,
    type: i.type,
    customer: i.customer?.name ?? '',
    vendor: i.vendor?.name ?? '',
    amount: total,
    paid,
    balance: dec(i.balance as never),
    currency: cur,
    status: i.status,
    date: i.issueDate.toISOString().slice(0, 10),
    dueDate: i.dueDate.toISOString().slice(0, 10),
    glPostedAt: i.glPostedAt ? i.glPostedAt.toISOString() : null,
    glJournalEntryId: i.glJournalEntryId ?? null,
  };
}

async function enrichInvoiceRow(
  row: Parameters<typeof mapInvoiceList>[0] & { issueDate: Date; currency?: string },
  company: CompanyFx
) {
  const mapped = mapInvoiceList(row);
  const fc = (company.currency ?? 'USD').toUpperCase();
  const cur = mapped.currency;
  const asOf = row.issueDate;
  if (!company.useMultiCurrency || cur === fc) {
    return {
      ...mapped,
      functionalAmount: mapped.amount,
      functionalBalance: mapped.balance,
      functionalPaid: mapped.paid,
      fxMissing: false,
    };
  }
  const [functionalAmount, functionalBalance, functionalPaid] = await Promise.all([
    convertCurrencyAmount(company.id, mapped.amount, cur, fc, asOf),
    convertCurrencyAmount(company.id, mapped.balance, cur, fc, asOf),
    convertCurrencyAmount(company.id, mapped.paid, cur, fc, asOf),
  ]);
  return {
    ...mapped,
    functionalAmount,
    functionalBalance,
    functionalPaid,
    fxMissing: functionalAmount === null || functionalBalance === null || functionalPaid === null,
  };
}

// GET /api/invoices
router.get('/', async (req, res) => {
  const { type, status } = req.query;

  if (!useDatabase()) {
    let invoices = [...mockInvoices].map((m) => ({
      ...m,
      invoiceNumber: m.number,
      paid: m.paid ?? 0,
      date: m.date ?? new Date().toISOString().slice(0, 10),
      currency: 'USD',
      functionalAmount: m.amount,
      functionalBalance: m.balance,
      functionalPaid: m.paid ?? 0,
      fxMissing: false,
    }));
    if (type === 'AR') invoices = invoices.filter((i) => i.type === 'AR_INVOICE');
    if (type === 'AP') invoices = invoices.filter((i) => i.type === 'AP_INVOICE');
    if (status) invoices = invoices.filter((i) => i.status === status);
    res.json({ invoices });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const where: Prisma.InvoiceWhereInput = { companyId: company.id };
    if (type === 'AR') where.type = { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] };
    if (type === 'AP') where.type = { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] };
    if (status && typeof status === 'string') where.status = status as InvoiceStatus;

    const rows = await prisma.invoice.findMany({
      where,
      include: { customer: true, vendor: true },
      orderBy: { issueDate: 'desc' },
    });
    const invoices = await Promise.all(rows.map((r) => enrichInvoiceRow(r, companyFx)));
    res.json({ invoices });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/ar', async (_req, res) => {
  if (!useDatabase()) {
    const arInvoices = mockInvoices
      .filter((i) => i.type === 'AR_INVOICE')
      .map((m) => ({
        ...m,
        invoiceNumber: m.number,
        paid: m.paid ?? 0,
        date: m.date ?? new Date().toISOString().slice(0, 10),
        currency: 'USD',
        functionalAmount: m.amount,
        functionalBalance: m.balance,
        functionalPaid: m.paid ?? 0,
        fxMissing: false,
      }));
    const total = arInvoices.reduce((sum, i) => sum + i.balance, 0);
    res.json({
      invoices: arInvoices,
      summary: { total, current: total, days31to60: 0, over60Days: 0 },
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const rows = await prisma.invoice.findMany({
      where: { companyId: company.id, type: { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] } },
      include: { customer: true, vendor: true },
      orderBy: { issueDate: 'desc' },
    });
    const invoices = await Promise.all(rows.map((r) => enrichInvoiceRow(r, companyFx)));
    const total = invoices.reduce((s, inv) => s + (inv.functionalBalance ?? inv.balance), 0);
    res.json({
      invoices,
      summary: { total, current: total, days31to60: 0, over60Days: 0 },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/ap', async (_req, res) => {
  if (!useDatabase()) {
    const apInvoices = mockInvoices
      .filter((i) => i.type === 'AP_INVOICE')
      .map((m) => ({
        ...m,
        invoiceNumber: m.number,
        paid: m.paid ?? 0,
        date: m.date ?? new Date().toISOString().slice(0, 10),
        currency: 'USD',
        functionalAmount: m.amount,
        functionalBalance: m.balance,
        functionalPaid: m.paid ?? 0,
        fxMissing: false,
      }));
    const total = apInvoices.reduce((sum, i) => sum + i.balance, 0);
    res.json({
      invoices: apInvoices,
      summary: { total, dueThisWeek: 0, overdue: 0, readyToPay: total },
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const rows = await prisma.invoice.findMany({
      where: { companyId: company.id, type: { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] } },
      include: { customer: true, vendor: true },
      orderBy: { issueDate: 'desc' },
    });
    const invoices = await Promise.all(rows.map((r) => enrichInvoiceRow(r, companyFx)));
    const total = invoices.reduce((s, inv) => s + (inv.functionalBalance ?? inv.balance), 0);
    res.json({
      invoices,
      summary: { total, dueThisWeek: 0, overdue: 0, readyToPay: total },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

function agingBucketsFromInvoices(rows: { balance: unknown; dueDate: Date }[]): { bucket: string; amount: number }[] {
  const buckets = [
    { label: 'Current', amount: 0 },
    { label: '1-30 days', amount: 0 },
    { label: '31-60 days', amount: 0 },
    { label: '60+ days', amount: 0 },
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 86400000;

  for (const r of rows) {
    const bal = dec(r.balance as never);
    if (bal <= 0) continue;
    const due = new Date(r.dueDate);
    due.setHours(0, 0, 0, 0);
    const daysPast = Math.floor((today.getTime() - due.getTime()) / dayMs);
    if (daysPast <= 0) buckets[0].amount += bal;
    else if (daysPast <= 30) buckets[1].amount += bal;
    else if (daysPast <= 60) buckets[2].amount += bal;
    else buckets[3].amount += bal;
  }

  return buckets.map((b) => ({ bucket: b.label, amount: Math.round(b.amount * 100) / 100 }));
}

router.get('/aging', async (_req, res) => {
  if (!useDatabase()) {
    res.json({
      arAging: agingBucketsFromInvoices(
        mockInvoices.filter((i) => i.type === 'AR_INVOICE').map((i) => ({
          balance: i.balance,
          dueDate: new Date(i.dueDate),
        }))
      ),
      apAging: agingBucketsFromInvoices(
        mockInvoices.filter((i) => i.type === 'AP_INVOICE').map((i) => ({
          balance: i.balance,
          dueDate: new Date(i.dueDate),
        }))
      ),
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const arRows = await prisma.invoice.findMany({
      where: {
        companyId: company.id,
        type: { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] },
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { balance: true, dueDate: true },
    });
    const apRows = await prisma.invoice.findMany({
      where: {
        companyId: company.id,
        type: { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] },
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { balance: true, dueDate: true },
    });
    res.json({
      arAging: agingBucketsFromInvoices(arRows),
      apAging: agingBucketsFromInvoices(apRows),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    type?: string;
    customerId?: string;
    vendorId?: string;
    amount?: number;
    number?: string;
    dueDate?: string;
    status?: string;
    currency?: string;
  };

  if (!useDatabase()) {
    const rawAmt = Number(req.body.amount);
    const amount = Number.isFinite(rawAmt) ? rawAmt : 0;
    const num = req.body.number ?? `INV-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const invoice = {
      id: String(mockInvoices.length + 1),
      number: num,
      invoiceNumber: num,
      type: req.body.type ?? 'AR_INVOICE',
      customer: req.body.customer ?? '',
      vendor: req.body.vendor ?? '',
      amount,
      currency: 'USD',
      functionalAmount: amount,
      functionalBalance: amount,
      functionalPaid: 0,
      fxMissing: false,
      paid: 0,
      balance: amount,
      status: req.body.status ?? 'DRAFT',
      date: today,
      dueDate: req.body.dueDate ?? today,
    };
    res.status(201).json({ invoice });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const invType = (body.type as InvoiceType) ?? 'AR_INVOICE';
    const amt = Number(body.amount);
    if (!Number.isFinite(amt) || amt < 0) {
      res.status(400).json({ error: 'Valid amount required' });
      return;
    }

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

    const invNum =
      body.number ??
      `INV-${Date.now()}`;
    const issue = new Date();
    const due = body.dueDate ? new Date(body.dueDate) : new Date(issue.getTime() + 30 * 86400000);

    const invoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        invoiceNumber: invNum,
        type: invType,
        customerId: body.customerId || null,
        vendorId: body.vendorId || null,
        issueDate: issue,
        dueDate: due,
        currency,
        subtotal: amt,
        taxAmount: 0,
        discountAmount: 0,
        total: amt,
        paidAmount: 0,
        balance: amt,
        status: (body.status as InvoiceStatus) ?? 'DRAFT',
        lines: {
          create: [
            {
              description: invType.startsWith('AR') ? 'Sales' : 'Purchase',
              quantity: 1,
              unitPrice: amt,
              discount: 0,
              total: amt,
            },
          ],
        },
      },
      include: { customer: true, vendor: true },
    });

    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const payload = await enrichInvoiceRow(invoice, companyFx);
    res.status(201).json({ invoice: payload });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Invoice number already exists' : 'Could not create invoice' });
  }
});

router.post(
  '/:id/post-to-ledger',
  requireJwtForGlPost,
  requireGlPostRole,
  requireInvoiceGlClerkScope,
  async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required for GL posting' });
    return;
  }

  const company = await getOrCreateDefaultCompany();
  const userId = (req as Request & { glAuth?: { sub?: string } }).glAuth?.sub ?? null;

  try {
    const result = await postInvoiceToGeneralLedger(req.params.id);
    await writeAuditLog({
      companyId: company.id,
      userId,
      action: AuditAction.API_CALL,
      module: 'invoice_gl',
      resourceId: req.params.id,
      resourceType: 'Invoice',
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
      module: 'invoice_gl',
      resourceId: req.params.id,
      resourceType: 'Invoice',
      success: false,
      errorMessage: msg,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    res.status(400).json({ error: msg });
  }
});

router.put('/:id/status', async (req, res) => {
  if (!useDatabase()) {
    const inv = mockInvoices.find((i) => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    const status = req.body?.status ?? inv.status;
    res.json({ invoice: { ...inv, status } });
    return;
  }

  try {
    const status = req.body?.status as InvoiceStatus | undefined;
    if (!status) {
      res.status(400).json({ error: 'status required' });
      return;
    }
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status },
      include: { customer: true, vendor: true },
    });
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: invoice.companyId },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const payload = await enrichInvoiceRow(invoice, companyFx);
    res.json({ invoice: payload });
  } catch {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const invoice = mockInvoices.find((i) => i.id === req.params.id);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json({ invoice });
    return;
  }

  try {
    const row = await prisma.invoice.findFirst({
      where: { id: req.params.id },
      include: { customer: true, vendor: true, lines: true },
    });
    if (!row) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    const companyFx = await prisma.company.findUniqueOrThrow({
      where: { id: row.companyId },
      select: { id: true, currency: true, useMultiCurrency: true },
    });
    const base = await enrichInvoiceRow(row, companyFx);
    res.json({
      invoice: {
        ...base,
        lines: row.lines,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as invoicesRouter };
