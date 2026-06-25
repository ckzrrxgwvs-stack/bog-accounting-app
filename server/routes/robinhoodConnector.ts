/**
 * Robinhood connector — historical equity order backfill into investment ledgers.
 */
import { Router } from 'express';
import { databaseConfigured } from '../lib/dbMode';
import {
  importRobinhoodEquityOrders,
  investmentBookForRobinhoodMask,
} from '../services/robinhood/importEquityOrders';
import type { RobinhoodEquityOrder } from '../services/robinhood/equityOrderTypes';

const router = Router();

function secretOk(req: { headers: Record<string, unknown> }): boolean {
  const secret = process.env.AGENT_ORG_CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers['x-agent-org-secret'];
  return typeof header === 'string' && header === secret;
}

router.use((_req, res, next) => {
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'Database required for Robinhood connector' });
    return;
  }
  next();
});

/**
 * POST /api/connectors/robinhood/backfill-equity
 * Body: { account_mask: "2686", orders: [...] }  — filled equity orders from get_equity_orders
 */
router.post('/backfill-equity', async (req, res) => {
  if (!secretOk(req)) {
    res.status(401).json({ error: 'Invalid or missing x-agent-org-secret' });
    return;
  }

  const mask = typeof req.body?.account_mask === 'string' ? req.body.account_mask.trim() : '';
  const bookId = investmentBookForRobinhoodMask(mask);
  if (!bookId) {
    res.status(400).json({ error: 'account_mask must be 2686 (personal) or 2117 (agentic)' });
    return;
  }

  const orders = Array.isArray(req.body?.orders) ? (req.body.orders as RobinhoodEquityOrder[]) : [];
  if (orders.length === 0) {
    res.status(400).json({ error: 'orders array required' });
    return;
  }

  try {
    const result = await importRobinhoodEquityOrders(bookId, orders);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Robinhood backfill failed',
    });
  }
});

export { router as robinhoodConnectorRouter };
