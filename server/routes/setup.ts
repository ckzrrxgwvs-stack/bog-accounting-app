/**
 * Production setup — schema init (secret) + public first-run owner setup (P60).
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { requireDatabase } from '../lib/requireDatabase';
import { ensureDatabaseSchema } from '../services/ensureDatabaseSchema';
import { ensureProgramBootstrap } from '../services/ensureProgramBootstrap';
import { completeOwnerSetup, getOwnerSetupStatus } from '../services/ownerSetup';
import { requireAuthRoles } from '../middleware/requireAuthRoles';
import { UserRoleType } from '@prisma/client';

const router = Router();

const ownerSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.OWNER_SETUP_MAX_PER_HOUR ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many setup attempts. Try again later.' },
});

function secretOk(req: { headers: Record<string, unknown> }): boolean {
  const secret = process.env.AGENT_ORG_CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers['x-agent-org-secret'];
  return typeof header === 'string' && header === secret;
}

/** Public: first-run owner setup status + available options (now vs later). */
router.get('/owner-status', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const status = await getOwnerSetupStatus();
    res.json(status);
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

/** Public: create Human President account (once per tenant). */
router.post('/owner', ownerSetupLimiter, async (req, res) => {
  if (!requireDatabase(res)) return;

  const body = req.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    generatePassword?: boolean;
    companyName?: string;
    deactivateBootstrapUsers?: boolean;
  };

  if (!body.email?.trim() || !body.firstName?.trim() || !body.lastName?.trim()) {
    res.status(400).json({ error: 'email, firstName, and lastName are required' });
    return;
  }
  if (!body.companyName?.trim()) {
    res.status(400).json({ error: 'Business name is required' });
    return;
  }

  try {
    const result = await completeOwnerSetup({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
      generatePassword: Boolean(body.generatePassword),
      companyName: body.companyName,
      deactivateBootstrapUsers: body.deactivateBootstrapUsers,
    });
    res.status(201).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Owner setup failed';
    res.status(400).json({ error: msg });
  }
});

router.post('/init', async (req, res) => {
  if (!secretOk(req)) {
    res.status(401).json({ error: 'Invalid or missing x-agent-org-secret' });
    return;
  }
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'DATABASE_URL not configured' });
    return;
  }

  try {
    await ensureDatabaseSchema();
    await ensureProgramBootstrap({ force: true });
    const [companyCount, accountCount, userCount] = await Promise.all([
      prisma.company.count(),
      prisma.account.count(),
      prisma.user.count(),
    ]);
    res.json({
      ok: true,
      companyCount,
      accountCount,
      userCount,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Setup failed',
    });
  }
});

export { router as setupRouter };
