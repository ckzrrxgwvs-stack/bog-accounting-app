// API routes for Invoices (AR/AP)

import { Router } from 'express';

const router = Router();

// Mock invoice data
const mockInvoices = [
  { id: '1', number: 'INV-2026-1024', type: 'AR_INVOICE', customer: 'Acme Corporation', amount: 5200, balance: 5200, status: 'SENT', dueDate: '2026-05-20' },
  { id: '2', number: 'INV-2026-1023', type: 'AR_INVOICE', customer: 'TechStart Inc', amount: 12500, balance: 0, status: 'PAID', dueDate: '2026-05-18' },
  { id: '3', number: 'INV-2026-1022', type: 'AR_INVOICE', customer: 'Global Ltd', amount: 8900, balance: 3900, status: 'PARTIAL', dueDate: '2026-04-30' },
  { id: '4', number: 'INV-2026-1021', type: 'AR_INVOICE', customer: 'Innovation Co', amount: 3500, balance: 3500, status: 'OVERDUE', dueDate: '2026-04-25' },
  { id: '5', number: 'INV-2026-1020', type: 'AR_INVOICE', customer: 'Data Systems', amount: 7500, balance: 7500, status: 'SENT', dueDate: '2026-05-05' },
  { id: '6', number: 'AP-2026-001', type: 'AP_INVOICE', vendor: 'Office Depot', amount: 1250, balance: 1250, status: 'PENDING', dueDate: '2026-05-25' },
  { id: '7', number: 'AP-2026-002', type: 'AP_INVOICE', vendor: 'Tech Solutions', amount: 3500, balance: 3500, status: 'APPROVED', dueDate: '2026-05-22' },
  { id: '8', number: 'AP-2026-003', type: 'AP_INVOICE', vendor: 'Amazon Business', amount: 890.50, balance: 890.50, status: 'PENDING', dueDate: '2026-05-20' },
  { id: '9', number: 'AP-2026-004', type: 'AP_INVOICE', vendor: 'Microsoft', amount: 2200, balance: 0, status: 'PAID', dueDate: '2026-05-18' },
];

// GET /api/invoices - List all invoices
router.get('/', (req, res) => {
  const { type, status } = req.query;

  let invoices = [...mockInvoices];

  if (type === 'AR') {
    invoices = invoices.filter(i => i.type === 'AR_INVOICE');
  } else if (type === 'AP') {
    invoices = invoices.filter(i => i.type === 'AP_INVOICE');
  }

  if (status) {
    invoices = invoices.filter(i => i.status === status);
  }

  res.json({ invoices });
});

// GET /api/invoices/ar - Accounts Receivable
router.get('/ar', (req, res) => {
  const arInvoices = mockInvoices.filter(i => i.type === 'AR_INVOICE');
  const total = arInvoices.reduce((sum, i) => sum + i.balance, 0);

  res.json({
    invoices: arInvoices,
    summary: {
      total: 43700,
      current: 18500,
      days31to60: 12300,
      over60Days: 4200,
    }
  });
});

// GET /api/invoices/ap - Accounts Payable
router.get('/ap', (req, res) => {
  const apInvoices = mockInvoices.filter(i => i.type === 'AP_INVOICE');
  const total = apInvoices.reduce((sum, i) => sum + i.balance, 0);

  res.json({
    invoices: apInvoices,
    summary: {
      total: 8290.50,
      dueThisWeek: 450,
      overdue: 0,
      readyToPay: 3500,
    }
  });
});

// GET /api/invoices/aging - AR/AP Aging Report
router.get('/aging', (req, res) => {
  res.json({
    arAging: [
      { bucket: 'Current', amount: 18500 },
      { bucket: '1-30 days', amount: 12300 },
      { bucket: '31-60 days', amount: 8700 },
      { bucket: '60+ days', amount: 4200 },
    ],
    apAging: [
      { bucket: 'Current', amount: 15200 },
      { bucket: '1-30 days', amount: 9800 },
      { bucket: '31-60 days', amount: 3400 },
      { bucket: '60+ days', amount: 1100 },
    ],
  });
});

// POST /api/invoices - Create invoice (demo)
router.post('/', (req, res) => {
  const rawAmt = Number(req.body.amount);
  const amount = Number.isFinite(rawAmt) ? rawAmt : 0;
  const invoice = {
    id: String(mockInvoices.length + 1),
    number: req.body.number ?? `INV-${Date.now()}`,
    type: req.body.type ?? 'AR_INVOICE',
    customer: req.body.customer,
    vendor: req.body.vendor,
    amount,
    balance: amount,
    status: req.body.status ?? 'PENDING',
    dueDate: req.body.dueDate ?? new Date().toISOString().slice(0, 10),
  };
  res.status(201).json({ invoice });
});

// PUT /api/invoices/:id/status — register before GET /:id if paths overlap (different methods OK)
router.put('/:id/status', (req, res) => {
  const inv = mockInvoices.find(i => i.id === req.params.id);
  if (!inv) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  const status = req.body?.status ?? inv.status;
  res.json({ invoice: { ...inv, status } });
});

// GET /api/invoices/:id
router.get('/:id', (req, res) => {
  const invoice = mockInvoices.find(i => i.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  res.json({ invoice });
});

export { router as invoicesRouter };