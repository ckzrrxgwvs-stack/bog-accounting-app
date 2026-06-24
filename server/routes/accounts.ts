// API routes for Chart of Accounts — balances from posted journal lines; PATCH for edits.

import { Router } from 'express';
import { AccountType, AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { getOrCreateInvestmentSmaCompany } from '../services/investmentSmaBootstrap';
import { aggregatePostedJournalThrough, signedBalanceForAccount } from '../services/journalAggregates';
import { writeAuditLog } from '../services/auditLog';

const router = Router();

let mockAccounts: {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  description?: string | null;
  isActive?: boolean;
  allowPosting?: boolean;
}[] = [
  { id: '1', code: '1100', name: 'Cash', type: 'ASSET', balance: 0, isActive: true, allowPosting: true },
  { id: '2', code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: 0, isActive: true, allowPosting: true },
  { id: '3', code: '2100', name: 'Accounts Payable', type: 'LIABILITY', balance: 0, isActive: true, allowPosting: true },
  { id: '4', code: '4100', name: 'Sales Revenue', type: 'REVENUE', balance: 0, isActive: true, allowPosting: true },
  { id: '5', code: '5100', name: 'Cost of Goods Sold', type: 'COST_OF_GOODS_SOLD', balance: 0, isActive: true, allowPosting: true },
];

/** Separate mock book for investment-fund-crew (not store). */
let mockInvestmentAccounts: {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  isActive?: boolean;
  allowPosting?: boolean;
}[] = [
  { id: 'inv-1', code: '1200', name: 'Cash — Investment Brokerage (Agentic)', type: 'ASSET', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-2', code: '1210', name: 'Securities at cost', type: 'ASSET', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-3', code: '1211', name: 'Unrealized gain on securities', type: 'ASSET', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-4', code: '1212', name: 'Unrealized loss on securities', type: 'ASSET', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-5', code: '4500', name: 'Dividend income', type: 'REVENUE', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-6', code: '4610', name: 'Realized gain on securities', type: 'REVENUE', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-7', code: '4611', name: 'Realized loss on securities', type: 'EXPENSE', balance: 0, isActive: true, allowPosting: true },
  { id: 'inv-8', code: '6310', name: 'Brokerage commissions & fees', type: 'EXPENSE', balance: 0, isActive: true, allowPosting: true },
];

function isInvestmentBook(req: { query: Record<string, unknown> }): boolean {
  return req.query.book === 'investment_sma';
}

async function resolveCompany(req: { query: Record<string, unknown> }) {
  if (isInvestmentBook(req)) {
    if (!useDatabase()) return null; // GET / uses mockInvestmentAccounts directly
    return getOrCreateInvestmentSmaCompany();
  }
  return getOrCreateDefaultCompany();
}

function mockListForBook(req: { query: Record<string, unknown> }) {
  return isInvestmentBook(req) ? [...mockInvestmentAccounts] : [...mockAccounts];
}

function useDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

const accountTypes = new Set<string>(Object.values(AccountType));

// Static paths before /:id
router.get('/reports/trial-balance', async (req, res) => {
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
    const company = await resolveCompany(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const asOf = new Date();
    const agg = await aggregatePostedJournalThrough(company.id, asOf);
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { code: 'asc' },
    });
    let td = 0;
    let tc = 0;
    const rows: { id: string; code: string; name: string; type: string; balance: number; debit: number; credit: number }[] = [];
    for (const a of accounts) {
      const v = agg.get(a.id) ?? { debit: 0, credit: 0 };
      if (v.debit < 0.005 && v.credit < 0.005) continue;
      rows.push({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        balance: signedBalanceForAccount(a.type, v.debit, v.credit),
        debit: v.debit,
        credit: v.credit,
      });
      td += v.debit;
      tc += v.credit;
    }
    res.json({
      accounts: rows,
      totalDebits: Math.round(td * 100) / 100,
      totalCredits: Math.round(tc * 100) / 100,
      isBalanced: Math.abs(td - tc) < 0.02,
      period: asOf.getMonth() + 1,
      year: asOf.getFullYear(),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// GET /api/accounts
router.get('/', async (req, res) => {
  const { type, search, includeInactive } = req.query;
  const showInactive = includeInactive === '1' || includeInactive === 'true';

  if (!useDatabase()) {
    let list = mockListForBook(req);
    if (!showInactive) list = list.filter((a) => a.isActive !== false);
    if (type) list = list.filter((a) => a.type === type);
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(s) || a.code.includes(s));
    }
    res.json({ accounts: list });
    return;
  }

  try {
    const company = await resolveCompany(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const q = search ? String(search).trim() : '';
    const asOf = new Date();
    const agg = await aggregatePostedJournalThrough(company.id, asOf);

    const where: import('@prisma/client').Prisma.AccountWhereInput = {
      companyId: company.id,
      ...(!showInactive ? { isActive: true } : {}),
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

    const accounts = rows.map((a) => {
      const v = agg.get(a.id) ?? { debit: 0, credit: 0 };
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        description: a.description,
        isActive: a.isActive,
        allowPosting: a.allowPosting,
        balance: signedBalanceForAccount(a.type, v.debit, v.credit),
      };
    });

    res.json({ accounts });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

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
    const company = await resolveCompany(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const asOf = new Date();
    const agg = await aggregatePostedJournalThrough(company.id, asOf);
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const v = agg.get(account.id) ?? { debit: 0, credit: 0 };
    res.json({
      account: {
        ...account,
        balance: signedBalanceForAccount(account.type, v.debit, v.credit),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

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
      isActive: true,
      allowPosting: true,
      description: description ? String(description) : null,
    };
    mockAccounts = [...mockAccounts, account];
    res.status(201).json({ account });
    return;
  }

  try {
    const company = await resolveCompany(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
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
    await writeAuditLog({
      companyId: company.id,
      action: AuditAction.CREATE,
      module: 'account',
      resourceId: account.id,
      resourceType: 'Account',
      changes: { after: { code: account.code, name: account.name } },
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

router.patch('/:id', async (req, res) => {
  const allowed = ['name', 'description', 'subtype', 'isActive', 'allowPosting', 'cashFlowCategory'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  if (!useDatabase()) {
    const idx = mockAccounts.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const prev = mockAccounts[idx];
    const next = {
      ...prev,
      ...(typeof data.name === 'string' ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description as string | null } : {}),
      ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
      ...(typeof data.allowPosting === 'boolean' ? { allowPosting: data.allowPosting } : {}),
    };
    mockAccounts = mockAccounts.map((a, i) => (i === idx ? next : a));
    res.json({ account: { ...next, balance: 0 } });
    return;
  }

  try {
    const company = await resolveCompany(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: {
        ...(typeof data.name === 'string' ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description === null || data.description === '' ? null : String(data.description) }
          : {}),
        ...(typeof data.subtype === 'string' || data.subtype === null
          ? { subtype: data.subtype === null || data.subtype === '' ? null : String(data.subtype) }
          : {}),
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
        ...(typeof data.allowPosting === 'boolean' ? { allowPosting: data.allowPosting } : {}),
        ...(typeof data.cashFlowCategory === 'string' || data.cashFlowCategory === null
          ? {
              cashFlowCategory:
                data.cashFlowCategory === null || data.cashFlowCategory === ''
                  ? null
                  : String(data.cashFlowCategory),
            }
          : {}),
      },
    });
    const asOf = new Date();
    const agg = await aggregatePostedJournalThrough(company.id, asOf);
    const v = agg.get(account.id) ?? { debit: 0, credit: 0 };
    await writeAuditLog({
      companyId: company.id,
      action: AuditAction.UPDATE,
      module: 'account',
      resourceId: account.id,
      resourceType: 'Account',
      changes: { before: { name: existing.name }, after: { name: account.name } },
    });
    res.json({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        description: account.description,
        isActive: account.isActive,
        allowPosting: account.allowPosting,
        balance: signedBalanceForAccount(account.type, v.debit, v.credit),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not update account' });
  }
});

export { router as accountsRouter };
