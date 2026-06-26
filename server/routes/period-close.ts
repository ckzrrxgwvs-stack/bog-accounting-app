import { Router } from 'express';
import { EntryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { aggregatePostedJournalThrough } from '../services/journalAggregates';

const router = Router();

function monthEnd(year: number, period: number): Date {
  return new Date(year, period, 0, 23, 59, 59, 999);
}

router.get('/preview', async (req, res) => {
  const year = Number(req.query.year);
  const period = Number(req.query.period);
  if (!Number.isFinite(year) || !Number.isFinite(period) || period < 1 || period > 12) {
    res.status(400).json({ error: 'year and period (1–12) query params required' });
    return;
  }
  if (!requireDatabase(res)) return;

  try {
    const company = await getOrCreateDefaultCompany();
    const end = monthEnd(year, period);

    const [closed, agg, accounts, openRows] = await Promise.all([
      prisma.closedPeriod.findUnique({
        where: { companyId_year_period: { companyId: company.id, year, period } },
      }),
      aggregatePostedJournalThrough(company.id, end),
      prisma.account.findMany({ where: { companyId: company.id } }),
      prisma.journalEntry.findMany({
        where: {
          companyId: company.id,
          year,
          period,
          status: { in: [EntryStatus.DRAFT, EntryStatus.PENDING_APPROVAL] },
        },
        orderBy: { entryNumber: 'asc' },
        select: {
          id: true,
          entryNumber: true,
          date: true,
          description: true,
          status: true,
        },
      }),
    ]);

    let td = 0;
    let tc = 0;
    for (const ac of accounts) {
      const v = agg.get(ac.id) ?? { debit: 0, credit: 0 };
      td += v.debit;
      tc += v.credit;
    }
    td = Math.round(td * 100) / 100;
    tc = Math.round(tc * 100) / 100;

    res.json({
      year,
      period,
      alreadyClosed: !!closed,
      closedAt: closed?.closedAt.toISOString() ?? null,
      trialBalance: {
        totalDebits: td,
        totalCredits: tc,
        isBalanced: Math.abs(td - tc) < 0.02,
      },
      openJournals: openRows.map((r) => ({
        id: r.id,
        entryNumber: r.entryNumber,
        date: r.date.toISOString().slice(0, 10),
        description: r.description,
        status: r.status,
      })),
      canClose: !closed && openRows.length === 0 && Math.abs(td - tc) < 0.02,
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/closed', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.closedPeriod.findMany({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { period: 'desc' }],
    });
    res.json({
      periods: rows.map((r) => ({
        id: r.id,
        year: r.year,
        period: r.period,
        closedAt: r.closedAt.toISOString(),
        closedBy: r.closedBy,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/close', async (req, res) => {
  const year = Number(req.body?.year);
  const period = Number(req.body?.period);
  const closedBy = typeof req.body?.closedBy === 'string' ? req.body.closedBy : null;
  if (!Number.isFinite(year) || !Number.isFinite(period) || period < 1 || period > 12) {
    res.status(400).json({ error: 'year and period (1–12) required' });
    return;
  }
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.closedPeriod.create({
      data: {
        companyId: company.id,
        year,
        period,
        closedBy,
      },
    });
    res.status(201).json({
      period: {
        id: row.id,
        year: row.year,
        period: row.period,
        closedAt: row.closedAt.toISOString(),
        closedBy: row.closedBy,
      },
    });
  } catch (e: unknown) {
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Period already closed' : 'Could not close period' });
  }
});

router.post('/reopen', async (req, res) => {
  const year = Number(req.body?.year);
  const period = Number(req.body?.period);
  if (!Number.isFinite(year) || !Number.isFinite(period) || period < 1 || period > 12) {
    res.status(400).json({ error: 'year and period (1–12) required' });
    return;
  }
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    await prisma.closedPeriod.delete({
      where: { companyId_year_period: { companyId: company.id, year, period } },
    });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Closed period not found' });
  }
});

export { router as periodCloseRouter };
