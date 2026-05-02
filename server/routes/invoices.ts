import { Router } from 'express';
import { InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

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
}) {
  const paid = dec(i.paidAmount as never);
  const total = dec(i.total as never);
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
    status: i.status,
    date: i.issueDate.toISOString().slice(0, 10),
    dueDate: i.dueDate.toISOString().slice(0, 10),
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
    }));
    if (type === 'AR') invoices = invoices.filter((i) => i.type === 'AR_INVOICE');
    if (type === 'AP') invoices = invoices.filter((i) => i.type === 'AP_INVOICE');
    if (status) invoices = invoices.filter((i) => i.status === status);
    res.json({ invoices });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const where: Prisma.InvoiceWhereInput = { companyId: company.id };
    if (type === 'AR') where.type = { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] };
    if (type === 'AP') where.type = { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] };
    if (status && typeof status === 'string') where.status = status as InvoiceStatus;

    const rows = await prisma.invoice.findMany({
      where,
      include: { customer: true, vendor: true },
      orderBy: { issueDate: 'desc' },
    });
    res.json({ invoices: rows.map(mapInvoiceList) });
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
    const rows = await prisma.invoice.findMany({
      where: { companyId: company.id, type: { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] } },
      include: { customer: true, vendor: true },
      orderBy: { issueDate: 'desc' },
    });
    const invoices = rows.map(mapInvoiceList);
    const total = rows.reduce((s, r) => s + dec(r.balance), 0);
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
      }));
    const total = apInvoices.reduce((sum, i) => sum + i.balance, 0);
    res.json({
      invoices: apInvoices,
      summary: { total, dueThisWeek: 0, overdue: 0, readyToPay: 0 },
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.invoice.findMany({
      where: { companyId: company.id, type: { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] } },
      include: { customer: true, vendor: true },
      orderBy: { issueDate: 'desc' },
    });
    const invoices = rows.map(mapInvoiceList);
    const total = rows.reduce((s, r) => s + dec(r.balance), 0);
    res.json({
      invoices,
      summary: { total, dueThisWeek: 0, overdue: 0, readyToPay: total },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/aging', async (_req, res) => {
  res.json({
    arAging: [
      { bucket: 'Current', amount: 0 },
      { bucket: '1-30 days', amount: 0 },
      { bucket: '31-60 days', amount: 0 },
      { bucket: '60+ days', amount: 0 },
    ],
    apAging: [
      { bucket: 'Current', amount: 0 },
      { bucket: '1-30 days', amount: 0 },
      { bucket: '31-60 days', amount: 0 },
      { bucket: '60+ days', amount: 0 },
    ],
  });
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

    res.status(201).json({ invoice: mapInvoiceList(invoice) });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Invoice number already exists' : 'Could not create invoice' });
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
    res.json({ invoice: mapInvoiceList(invoice) });
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
    res.json({
      invoice: {
        ...mapInvoiceList(row),
        lines: row.lines,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as invoicesRouter };
