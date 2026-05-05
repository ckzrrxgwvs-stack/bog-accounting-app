import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

const router = Router();

router.get('/closed', async (_req, res) => {
  if (!useDatabase()) {
    res.json({ periods: [] });
    return;
  }
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
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required' });
    return;
  }
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
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required' });
    return;
  }
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
