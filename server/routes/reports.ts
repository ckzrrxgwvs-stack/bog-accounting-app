import { Router } from 'express';
import { AccountType, InvoiceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { resolveCompanyFromRequest } from '../lib/resolveCompany';
import { requireDatabase } from '../lib/requireDatabase';
import { dec } from '../lib/serialize';
import { aggregatePostedJournal, aggregatePostedJournalThrough } from '../services/journalAggregates';

const router = Router();

function monthBounds(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function parsePeriod(req: { query: Record<string, unknown> }) {
  const m = Number(req.query.month ?? req.query.period ?? 4);
  const y = Number(req.query.year ?? 2026);
  const month = Number.isFinite(m) ? Math.min(12, Math.max(1, m)) : 4;
  const year = Number.isFinite(y) ? y : 2026;
  return { month, year, ...monthBounds(month, year) };
}

router.get('/income-statement', async (req, res) => {
  const { month, year, start, end } = parsePeriod(req);

  if (!requireDatabase(res)) return;

  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const agg = await aggregatePostedJournal(company.id, start, end);
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id },
    });
    const byId = new Map(accounts.map((a) => [a.id, a]));

    let revenue = 0;
    let cogs = 0;
    let expenses = 0;
    for (const [aid, v] of agg) {
      const ac = byId.get(aid);
      if (!ac) continue;
      if (ac.type === AccountType.REVENUE) revenue += v.credit - v.debit;
      else if (ac.type === AccountType.COST_OF_GOODS_SOLD) cogs += v.debit - v.credit;
      else if (ac.type === AccountType.EXPENSE) expenses += v.debit - v.credit;
    }

    if (agg.size === 0) {
      const periodLabel = new Date(year, month - 1, 1).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      res.json({
        title: 'Income Statement',
        period: periodLabel,
        lines: [
          { label: 'Revenue', level: 0, amount: 0, isBold: false, isTotal: false },
          { label: 'Cost of Goods Sold', level: 0, amount: 0, isBold: false, isTotal: false },
          { label: 'GROSS PROFIT', level: 0, amount: 0, isBold: true, isTotal: true },
          { label: 'Operating Expenses', level: 0, amount: 0, isBold: false, isTotal: false },
          { label: 'NET INCOME', level: 0, amount: 0, isBold: true, isTotal: true },
        ],
        totals: { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netIncome: 0 },
        empty: true,
      });
      return;
    }

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    const periodLabel = new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    res.json({
      title: 'Income Statement',
      period: periodLabel,
      lines: [
        { label: 'Revenue', level: 0, amount: revenue, isBold: false, isTotal: false },
        { label: 'Cost of Goods Sold', level: 0, amount: -cogs, isBold: false, isTotal: false },
        { label: 'GROSS PROFIT', level: 0, amount: grossProfit, isBold: true, isTotal: true },
        { label: 'Operating Expenses', level: 0, amount: -expenses, isBold: false, isTotal: false },
        { label: 'NET INCOME', level: 0, amount: netIncome, isBold: true, isTotal: true },
      ],
      totals: {
        revenue,
        cogs,
        grossProfit,
        expenses,
        netIncome,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/balance-sheet', async (req, res) => {
  const { month, year, end } = parsePeriod(req);

  if (!requireDatabase(res)) return;

  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const agg = await aggregatePostedJournalThrough(company.id, end);
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id },
      orderBy: { code: 'asc' },
    });

    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    const assetLines: { label: string; amount: number }[] = [];
    const liabLines: { label: string; amount: number }[] = [];
    const eqLines: { label: string; amount: number }[] = [];

    for (const ac of accounts) {
      const v = agg.get(ac.id) ?? { debit: 0, credit: 0 };
      let net = 0;
      if (ac.type === AccountType.ASSET) net = v.debit - v.credit;
      else if (ac.type === AccountType.LIABILITY || ac.type === AccountType.EQUITY) net = v.credit - v.debit;
      else continue;

      if (Math.abs(net) < 0.005) continue;

      const line = { label: `${ac.code} — ${ac.name}`, amount: net };
      if (ac.type === AccountType.ASSET) {
        assets += net;
        assetLines.push(line);
      } else if (ac.type === AccountType.LIABILITY) {
        liabilities += net;
        liabLines.push(line);
      } else if (ac.type === AccountType.EQUITY) {
        equity += net;
        eqLines.push(line);
      }
    }

    if (assetLines.length === 0 && liabLines.length === 0 && eqLines.length === 0) {
      res.json({
        title: 'Balance Sheet',
        date: end.toLocaleDateString('en-US', { dateStyle: 'long' }),
        assets: [],
        liabilities: [],
        equity: [],
        totals: { assets: 0, liabilities: 0, equity: 0 },
        period: `${month}/${year}`,
        empty: true,
      });
      return;
    }

    assetLines.push({ label: 'TOTAL ASSETS', amount: assets });
    liabLines.push({ label: 'TOTAL LIABILITIES', amount: liabilities });
    eqLines.push({ label: 'TOTAL EQUITY', amount: equity });

    res.json({
      title: 'Balance Sheet',
      date: end.toLocaleDateString('en-US', { dateStyle: 'long' }),
      assets: assetLines,
      liabilities: liabLines,
      equity: eqLines,
      totals: {
        assets,
        liabilities,
        equity,
      },
      period: `${month}/${year}`,
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/cash-flow', async (req, res) => {
  const { month, year } = parsePeriod(req);
  if (!requireDatabase(res)) return;

  res.json({
    title: 'Statement of Cash Flows',
    period: `${month}/${year}`,
    operating: [{ label: 'Indirect method — tie to cash accounts when ledger posts cash flows', amount: 0 }],
    investing: [],
    financing: [],
    netChange: 0,
    beginningCash: 0,
    endingCash: 0,
    note: 'Detailed cash flow classification requires posted cash accounts; expand when ledger entries tag cash flow.',
  });
});

router.get('/trial-balance', async (req, res) => {
  const { month, year, end } = parsePeriod(req);

  if (!requireDatabase(res)) return;

  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const agg = await aggregatePostedJournalThrough(company.id, end);
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id },
      orderBy: { code: 'asc' },
    });

    let td = 0;
    let tc = 0;
    const rows: { code: string; name: string; debit: number; credit: number }[] = [];

    for (const ac of accounts) {
      const v = agg.get(ac.id) ?? { debit: 0, credit: 0 };
      if (v.debit < 0.005 && v.credit < 0.005) continue;
      rows.push({
        code: ac.code,
        name: ac.name,
        debit: Math.round(v.debit * 100) / 100,
        credit: Math.round(v.credit * 100) / 100,
      });
      td += v.debit;
      tc += v.credit;
    }

    if (rows.length === 0) {
      res.json({
        title: 'Trial Balance',
        date: end.toLocaleDateString('en-US', { dateStyle: 'long' }),
        accounts: [],
        totals: { debit: 0, credit: 0 },
        isBalanced: true,
        period: `${month}/${year}`,
        empty: true,
      });
      return;
    }

    const debit = Math.round(td * 100) / 100;
    const credit = Math.round(tc * 100) / 100;

    if (String(req.query.format).toLowerCase() === 'csv') {
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = [
        ['Code', 'Name', 'Debit', 'Credit'].join(','),
        ...rows.map((r) => [esc(r.code), esc(r.name), r.debit, r.credit].join(',')),
        ['TOTAL', '', debit, credit].join(','),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="trial-balance-${year}-${String(month).padStart(2, '0')}.csv"`
      );
      res.send(lines.join('\n'));
      return;
    }

    res.json({
      title: 'Trial Balance',
      date: end.toLocaleDateString('en-US', { dateStyle: 'long' }),
      accounts: rows,
      totals: { debit, credit },
      isBalanced: Math.abs(debit - credit) < 0.02,
      period: `${month}/${year}`,
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

function bucketsFromRows(rows: { balance: unknown; dueDate: Date }[]) {
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

router.get('/ar-aging', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const rows = await prisma.invoice.findMany({
      where: {
        companyId: company.id,
        type: { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] },
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { balance: true, dueDate: true },
    });
    res.json({ buckets: bucketsFromRows(rows) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/ap-aging', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const rows = await prisma.invoice.findMany({
      where: {
        companyId: company.id,
        type: { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] },
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { balance: true, dueDate: true },
    });
    res.json({ buckets: bucketsFromRows(rows) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as reportsRouter };
