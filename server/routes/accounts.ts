// API routes for Chart of Accounts

import { Router } from 'express';

const router = Router();

// Mock data for demo
const mockAccounts = [
  { id: '1', code: '1100', name: 'Cash', type: 'ASSET', balance: 52800 },
  { id: '2', code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: 43700 },
  { id: '3', code: '1300', name: 'Inventory', type: 'ASSET', balance: 25000 },
  { id: '4', code: '1500', name: 'Equipment', type: 'ASSET', balance: 75000 },
  { id: '5', code: '2100', name: 'Accounts Payable', type: 'LIABILITY', balance: 29500 },
  { id: '6', code: '2200', name: 'Notes Payable', type: 'LIABILITY', balance: 50000 },
  { id: '7', code: '3100', name: 'Common Stock', type: 'EQUITY', balance: 100000 },
  { id: '8', code: '3200', name: 'Retained Earnings', type: 'EQUITY', balance: 55000 },
  { id: '9', code: '4100', name: 'Sales Revenue', type: 'REVENUE', balance: 124500 },
  { id: '10', code: '5100', name: 'Cost of Goods Sold', type: 'COST_OF_GOODS_SOLD', balance: 45200 },
  { id: '11', code: '6100', name: 'Salaries & Wages', type: 'EXPENSE', balance: 50000 },
  { id: '12', code: '6200', name: 'Rent Expense', type: 'EXPENSE', balance: 17000 },
  { id: '13', code: '6300', name: 'Utilities Expense', type: 'EXPENSE', balance: 5000 },
  { id: '14', code: '6400', name: 'Marketing Expense', type: 'EXPENSE', balance: 11000 },
  { id: '15', code: '6500', name: 'Office Supplies', type: 'EXPENSE', balance: 3500 },
];

// GET /api/accounts - List all accounts
router.get('/', (req, res) => {
  const { type, search } = req.query;

  let accounts = [...mockAccounts];

  if (type) {
    accounts = accounts.filter(a => a.type === type);
  }

  if (search) {
    const searchLower = String(search).toLowerCase();
    accounts = accounts.filter(a =>
      a.name.toLowerCase().includes(searchLower) ||
      a.code.includes(searchLower)
    );
  }

  res.json({ accounts });
});

// Static paths must be registered before /:id so "reports" is not captured as an id
// GET /api/accounts/reports/trial-balance - Get trial balance
router.get('/reports/trial-balance', (_req, res) => {
  const assets = mockAccounts.filter(a => a.type === 'ASSET');
  const liabilities = mockAccounts.filter(a => a.type === 'LIABILITY');

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const nonAsset = mockAccounts.filter(
    a => a.type === 'LIABILITY' || a.type === 'EQUITY' || a.type === 'REVENUE' || a.type === 'COST_OF_GOODS_SOLD' || a.type === 'EXPENSE'
  );
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);

  res.json({
    accounts: mockAccounts,
    totalDebits: totalAssets,
    totalCredits: totalLiabilities + nonAsset.filter(a => a.type !== 'LIABILITY').reduce((sum, a) => sum + a.balance, 0),
    isBalanced: true,
    period: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
});

// GET /api/accounts/:id - Get single account
router.get('/:id', (req, res) => {
  const account = mockAccounts.find(a => a.id === req.params.id);

  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.json({ account });
});

// POST /api/accounts - Create account (demo)
router.post('/', (req, res) => {
  const { code, name, type } = req.body;
  if (!code || !name || !type) {
    res.status(400).json({ error: 'code, name, and type are required' });
    return;
  }
  const account = {
    id: String(mockAccounts.length + 1),
    code: String(code),
    name: String(name),
    type: String(type),
    balance: 0,
  };
  res.status(201).json({ account });
});

export { router as accountsRouter };
