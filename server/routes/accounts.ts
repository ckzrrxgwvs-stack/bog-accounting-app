// API routes for Chart of Accounts — Module 1: PostgreSQL when DATABASE_URL is set

import { Router } from 'express';
import { AccountType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

const router = Router();

/** Fallback mock when no DB (local UI-only dev). */
const mockAccounts = [
  { id: '1', code: '1100', name: 'Cash', type: 'ASSET', balance: 0 },
  { id: '2', code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: 0 },
  { id: '3', code: '2100', name: 'Accounts Payable', type: 'LIABILITY', balance: 0 },
];

function useDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

const accountTypes = new Set<string>(Object.values(AccountType));

// Static paths before /:id
router.get('/reports/trial-balance', async (_req, res) => {
  if (!useDatabase()) {
    res.json({
      accounts: mockAccounts,
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: true,
      period: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { code: 'asc' },
    });
    const mapped = accounts.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      balance: 0,
    }));
    res.json({
      accounts: mapped,
      totalDebits: 0,
      totalCredits: 0,
      isBalanced: true,
      period: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// GET /api/accounts
router.get('/', async (req, res) => {
  const { type, search } = req.query;

  if (!useDatabase()) {
    let list = [...mockAccounts];
    if (type) list = list.filter((a) => a.type === type);
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(s) || a.code.includes(s));
    }
    res.json({ accounts: list });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const q = search ? String(search).trim() : '';

    const where: import('@prisma/client').Prisma.AccountWhereInput = {
      companyId: company.id,
      isActive: true,
      ...(type && accountTypes.has(String(type)) ? { type: type as AccountType } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q } },
            ],
          }
        : {}),
    };

    const rows = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    const accounts = rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      description: a.description,
      isActive: a.isActive,
      allowPosting: a.allowPosting,
      balance: 0,
    }));

    res.json({ accounts });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// GET /api/accounts/:id
router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const account = mockAccounts.find((a) => a.id === req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ account });
    return;
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
    });
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({
      account: {
        ...account,
        balance: 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// POST /api/accounts
router.post('/', async (req, res) => {
  const { code, name, type, description } = req.body;
  if (!code || !name || !type) {
    res.status(400).json({ error: 'code, name, and type are required' });
    return;
  }
  if (!accountTypes.has(String(type))) {
    res.status(400).json({ error: 'Invalid account type' });
    return;
  }

  if (!useDatabase()) {
    const account = {
      id: String(mockAccounts.length + 1),
      code: String(code),
      name: String(name),
      type: String(type),
      balance: 0,
    };
    res.status(201).json({ account });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const account = await prisma.account.create({
      data: {
        companyId: company.id,
        code: String(code),
        name: String(name),
        type: type as AccountType,
        description: description ? String(description) : null,
        level: 0,
        isActive: true,
        allowPosting: true,
      },
    });
    res.status(201).json({
      account: {
        ...account,
        balance: 0,
      },
    });
  } catch (e: unknown) {
    console.error(e);
    const msg = e && typeof e === 'object' && 'code' in e && e.code === 'P2002' ? 'Account code already exists' : 'Could not create account';
    res.status(400).json({ error: msg });
  }
});

export { router as accountsRouter };
