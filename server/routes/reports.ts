// API routes for Financial Reports

import { Router } from 'express';

const router = Router();

// GET /api/reports/income-statement
router.get('/income-statement', (req, res) => {
  res.json({
    title: 'Income Statement',
    period: 'April 2026',
    lines: [
      { label: 'Revenue', level: 0, amount: 124500, isBold: false, isTotal: false },
      { label: 'Sales Revenue', level: 1, amount: 120000, isBold: false, isTotal: false },
      { label: 'Service Revenue', level: 1, amount: 4500, isBold: false, isTotal: false },
      { label: 'Cost of Goods Sold', level: 0, amount: -45200, isBold: false, isTotal: false },
      { label: 'GROSS PROFIT', level: 0, amount: 79300, isBold: true, isTotal: true },
      { label: 'Operating Expenses', level: 0, amount: -44000, isBold: false, isTotal: false },
      { label: 'Salaries & Wages', level: 1, amount: -25000, isBold: false, isTotal: false },
      { label: 'Rent & Utilities', level: 1, amount: -8500, isBold: false, isTotal: false },
      { label: 'Marketing', level: 1, amount: -5500, isBold: false, isTotal: false },
      { label: 'Other Expenses', level: 1, amount: -5000, isBold: false, isTotal: false },
      { label: 'NET INCOME', level: 0, amount: 35300, isBold: true, isTotal: true },
    ],
    totals: {
      revenue: 124500,
      cogs: 45200,
      grossProfit: 79300,
      expenses: 44000,
      netIncome: 35300,
    },
  });
});

// GET /api/reports/balance-sheet
router.get('/balance-sheet', (req, res) => {
  res.json({
    title: 'Balance Sheet',
    date: 'April 29, 2026',
    assets: [
      { label: 'Current Assets', amount: 121500 },
      { label: 'Cash', amount: 52800 },
      { label: 'Accounts Receivable', amount: 43700 },
      { label: 'Inventory', amount: 25000 },
      { label: 'Fixed Assets', amount: 75000 },
      { label: 'Equipment (net)', amount: 75000 },
      { label: 'TOTAL ASSETS', amount: 196500 },
    ],
    liabilities: [
      { label: 'Current Liabilities', amount: 79500 },
      { label: 'Accounts Payable', amount: 29500 },
      { label: 'Notes Payable', amount: 50000 },
    ],
    equity: [
      { label: 'Stockholders\' Equity', amount: 117000 },
      { label: 'Common Stock', amount: 100000 },
      { label: 'Retained Earnings', amount: 17000 },
    ],
    totals: {
      assets: 196500,
      liabilities: 79500,
      equity: 117000,
    },
  });
});

// GET /api/reports/cash-flow
router.get('/cash-flow', (req, res) => {
  res.json({
    title: 'Statement of Cash Flows',
    period: 'April 2026',
    operating: [
      { label: 'Cash from Operations', amount: 45000 },
      { label: 'Net Income', amount: 35300 },
      { label: 'Changes in AR', amount: -5200 },
      { label: 'Changes in AP', amount: 8900 },
    ],
    investing: [
      { label: 'Cash from Investing', amount: -25000 },
      { label: 'Equipment Purchase', amount: -25000 },
    ],
    financing: [
      { label: 'Cash from Financing', amount: 0 },
    ],
    netChange: 20000,
    beginningCash: 32800,
    endingCash: 52800,
  });
});

// GET /api/reports/trial-balance
router.get('/trial-balance', (req, res) => {
  res.json({
    title: 'Trial Balance',
    date: 'April 29, 2026',
    accounts: [
      { code: '1100', name: 'Cash', debit: 52800, credit: 0 },
      { code: '1200', name: 'Accounts Receivable', debit: 43700, credit: 0 },
      { code: '1300', name: 'Inventory', debit: 25000, credit: 0 },
      { code: '1500', name: 'Equipment', debit: 75000, credit: 0 },
      { code: '2100', name: 'Accounts Payable', debit: 0, credit: 29500 },
      { code: '2200', name: 'Notes Payable', debit: 0, credit: 50000 },
      { code: '3100', name: 'Common Stock', debit: 0, credit: 100000 },
      { code: '3200', name: 'Retained Earnings', debit: 0, credit: 55000 },
      { code: '4100', name: 'Sales Revenue', debit: 0, credit: 124500 },
      { code: '5100', name: 'Cost of Goods Sold', debit: 45200, credit: 0 },
      { code: '6100', name: 'Salaries & Wages', debit: 50000, credit: 0 },
      { code: '6200', name: 'Rent Expense', debit: 17000, credit: 0 },
      { code: '6300', name: 'Utilities Expense', debit: 5000, credit: 0 },
      { code: '6400', name: 'Marketing Expense', debit: 11000, credit: 0 },
    ],
    totals: {
      debit: 319700,
      credit: 359000,
    },
    isBalanced: true,
  });
});

export { router as reportsRouter };