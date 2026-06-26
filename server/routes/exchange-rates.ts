import { Router } from 'express';
import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { requireAuthRoles } from '../middleware/requireAuthRoles';
import {
  convertCurrencyAmount,
  refreshMarketRatesForCompany,
  utcDay,
} from '../services/exchangeRateService';

const router = Router();

const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.FX_REFRESH_MAX_PER_HOUR ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many FX refresh requests' },
});

async function resolveCompanyId(req: Request): Promise<string> {
  const jwt = (req as Request & { authJwt?: { companyId?: string } }).authJwt;
  if (jwt?.companyId) return jwt.companyId;
  const c = await getOrCreateDefaultCompany();
  return c.id;
}

const readers = [
  requireAuthRoles(
    UserRoleType.PRESIDENT,
    UserRoleType.CFO,
    UserRoleType.CONTROLLER,
    UserRoleType.ACCOUNTANT,
    UserRoleType.AR_CLERK,
    UserRoleType.AP_CLERK,
    UserRoleType.READONLY
  ),
];

const refreshers = [
  refreshLimiter,
  requireAuthRoles(
    UserRoleType.PRESIDENT,
    UserRoleType.CFO,
    UserRoleType.CONTROLLER,
    UserRoleType.ACCOUNTANT
  ),
];

/** List stored rates (latest rows first). */
router.get('/', ...readers, async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const companyId = await resolveCompanyId(req);
    const limit = Math.min(Number(req.query.limit ?? 120) || 120, 500);
    const rows = await prisma.exchangeRate.findMany({
      where: { companyId },
      orderBy: [{ date: 'desc' }, { fromCurrency: 'asc' }, { toCurrency: 'asc' }],
      take: limit,
    });

    res.json({
      rates: rows.map((r) => ({
        id: r.id,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: Number(r.rate),
        date: r.date.toISOString().slice(0, 10),
        source: r.source,
        isActive: r.isActive,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load exchange rates' });
  }
});

/** Fetch daily (or historical) rates from Frankfurter and store. */
router.post('/refresh', ...refreshers, async (req, res) => {
  if (!requireDatabase(res)) return;

  const body = req.body as {
    quoteCurrencies?: string[];
    date?: string;
    baseCurrency?: string;
  };

  try {
    const companyId = await resolveCompanyId(req);
    const out = await refreshMarketRatesForCompany(companyId, {
      quoteCurrencies: body.quoteCurrencies,
      date: body.date,
      baseCurrency: body.baseCurrency,
    });
    res.json({
      message: 'Rates updated from Frankfurter (ECB reference)',
      ...out,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Refresh failed';
    console.error(e);
    res.status(400).json({ error: msg });
  }
});

/** Convert amount using stored rates for the given calendar day (UTC). */
router.get('/convert', ...readers, async (req, res) => {
  if (!requireDatabase(res)) return;

  const amount = Number(req.query.amount);
  const from = typeof req.query.from === 'string' ? req.query.from : '';
  const to = typeof req.query.to === 'string' ? req.query.to : '';
  const dateRaw = typeof req.query.date === 'string' ? req.query.date : undefined;

  if (!Number.isFinite(amount) || !from || !to) {
    res.status(400).json({ error: 'Query params amount, from, and to are required' });
    return;
  }

  const asOf = dateRaw ? utcDay(new Date(dateRaw + 'T12:00:00.000Z')) : utcDay(new Date());

  try {
    const companyId = await resolveCompanyId(req);
    const converted = await convertCurrencyAmount(companyId, amount, from, to, asOf);
    if (converted === null) {
      res.status(404).json({
        error: 'No exchange rate for this pair and date — run POST /api/exchange-rates/refresh first',
      });
      return;
    }

    res.json({
      amount,
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
      convertedAmount: converted,
      date: asOf.toISOString().slice(0, 10),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

export { router as exchangeRatesRouter };
