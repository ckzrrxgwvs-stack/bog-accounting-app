/**
 * One-time production setup — apply schema + seed company/COA/users.
 * POST /api/setup/init with header x-agent-org-secret = AGENT_ORG_CRON_SECRET
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { ensureDatabaseSchema } from '../services/ensureDatabaseSchema';
import { ensureProgramBootstrap } from '../services/ensureProgramBootstrap';

const router = Router();

function secretOk(req: { headers: Record<string, unknown> }): boolean {
  const secret = process.env.AGENT_ORG_CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers['x-agent-org-secret'];
  return typeof header === 'string' && header === secret;
}

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
