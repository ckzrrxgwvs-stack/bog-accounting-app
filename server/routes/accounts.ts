// API routes for Chart of Accounts — balances from posted journal lines; PATCH for edits.

import { Router } from 'express';
import { AccountType, AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import {
  getOrCreateInvestmentCompany,
  INVESTMENT_BOOKS,
  resolveInvestmentBookFromQuery,
  type InvestmentBookId,
} from '../services/investmentBooks';
import { aggregatePostedJournalThrough, signedBalanceForAccount } from '../services/journalAggregates';
import { writeAuditLog } from '../services/auditLog';
import { requireDatabase } from '../lib/requireDatabase';

const router = Router();

function investmentBookId(req: { query: Record<string, unknown> }): InvestmentBookId | null {
  return resolveInvestmentBookFromQuery(req.query.book);
}

async function resolveCompany(req: { query: Record<string, unknown> }) {
  const book = investmentBookId(req);
  if (book) {
    return getOrCreateInvestmentCompany(book);
  }
  return getOrCreateDefaultCompany();
}

const accountTypes = new Set<string>(Object.values(AccountType));

// Static paths before /:id
router.get('/investment-books', async (_req, res) => {
  res.json({
    books: Object.values(INVESTMENT_BOOKS).map((b) => ({
      bookId: b.bookId,
      companyName: b.companyName,
      legalName: b.legalName,
      robinhoodAccountMask: b.robinhoodAccountMask,
      journalSourceType: b.journalSourceType,
      apiQuery: `?book=${b.bookId}`,
    })),
  });
});

// Static paths before /:id
router.get('/reports/trial-balance', async (req, res) => {
  if (!requireDatabase(res)) return;

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
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'P2021' || code.startsWith('P20')) {
      res.status(503).json({
        error: 'Database schema not applied',
        hint: 'Redeploy the API server or wait for startup schema sync.',
      });
      return;
    }
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// GET /api/accounts
router.get('/', async (req, res) => {
  const { type, search, includeInactive } = req.query;
  const showInactive = includeInactive === '1' || includeInactive === 'true';

  if (!requireDatabase(res)) return;

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
  if (!requireDatabase(res)) return;

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

  if (!requireDatabase(res)) return;

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

  if (!requireDatabase(res)) return;

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
