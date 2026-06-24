/**
 * Product intelligence: tenant feedback, allow-listed intel digest, developer spec drafts.
 */
import { Router } from 'express';
import type { Request } from 'express';
import { ProductFeedbackCategory, ProductFeedbackStatus, UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { requireJwt } from '../middleware/requireJwt';
import { requireAuthRoles, type JwtPayload } from '../middleware/requireAuthRoles';
import {
  assertSafeIntelUrl,
  runIntelDigestJob,
  seedIntelFeedsFromEnvIfEmpty,
} from '../services/intelDigestService';
import { draftProductSpecMarkdown } from '../services/productSpecAssistant';

const router = Router();

const EXEC_ROLES = [UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER] as const;

async function resolveUserCompany(req: Request): Promise<{ userId: string; companyId: string; role: string } | null> {
  const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
  if (!jwt?.sub) return null;
  const user = await prisma.user.findFirst({
    where: { id: jwt.sub, isActive: true },
    select: { id: true, companyId: true, role: true },
  });
  if (!user) return null;
  if (jwt.companyId && jwt.companyId !== user.companyId) {
    return null;
  }
  return { userId: user.id, companyId: user.companyId, role: user.role };
}

router.use((_req, res, next) => {
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'Database required for product intelligence features' });
    return;
  }
  next();
});

// --- Feedback (any authenticated user in tenant) ---
router.post('/feedback', requireJwt, async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const body = req.body as { category?: string; title?: string; body?: string };
  const cat = body.category as ProductFeedbackCategory | undefined;
  const categories = Object.values(ProductFeedbackCategory);
  if (!cat || !categories.includes(cat)) {
    res.status(400).json({ error: `category must be one of: ${categories.join(', ')}` });
    return;
  }
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text || text.length > 12_000) {
    res.status(400).json({ error: 'body is required (max 12000 chars)' });
    return;
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : null;

  try {
    const row = await prisma.productFeedback.create({
      data: {
        companyId: resolved.companyId,
        userId: resolved.userId,
        userRole: resolved.role,
        category: cat,
        title,
        body: text,
      },
    });
    res.status(201).json({ feedback: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not save feedback' });
  }
});

router.get('/feedback/mine', requireJwt, async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  try {
    const rows = await prisma.productFeedback.findMany({
      where: { companyId: resolved.companyId, userId: resolved.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ feedback: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load feedback' });
  }
});

router.get('/feedback', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  try {
    const rows = await prisma.productFeedback.findMany({
      where: { companyId: resolved.companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    res.json({ feedback: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load feedback' });
  }
});

router.patch('/feedback/:id', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const status = req.body?.status as ProductFeedbackStatus | undefined;
  const statuses = Object.values(ProductFeedbackStatus);
  if (!status || !statuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${statuses.join(', ')}` });
    return;
  }

  try {
    const updated = await prisma.productFeedback.updateMany({
      where: { id: req.params.id, companyId: resolved.companyId },
      data: { status },
    });
    if (updated.count === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const row = await prisma.productFeedback.findFirst({
      where: { id: req.params.id, companyId: resolved.companyId },
    });
    res.json({ feedback: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not update feedback' });
  }
});

// --- Intel feeds & digest (executives or INTEL_DIGEST_SECRET cron) ---
router.get('/intel/sources', requireAuthRoles(...EXEC_ROLES), async (_req, res) => {
  try {
    const rows = await prisma.intelFeedSource.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ sources: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load sources' });
  }
});

router.post('/intel/sources', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const body = req.body as { label?: string; url?: string };
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) : '';
  const urlRaw = typeof body.url === 'string' ? body.url.trim() : '';
  if (!label || !urlRaw) {
    res.status(400).json({ error: 'label and url required' });
    return;
  }
  try {
    assertSafeIntelUrl(urlRaw);
    const row = await prisma.intelFeedSource.create({
      data: { label, url: urlRaw, enabled: true },
    });
    res.status(201).json({ source: row });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid source' });
  }
});

router.delete('/intel/sources/:id', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  try {
    await prisma.intelFeedSource.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

async function execIntelDigest(res: import('express').Response) {
  try {
    await seedIntelFeedsFromEnvIfEmpty();
    const out = await runIntelDigestJob();
    res.json({
      ok: true,
      sourcesProcessed: out.sourcesProcessed,
      itemsWritten: out.itemsWritten,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Digest run failed' });
  }
}

/** GitHub Actions / cron: send header `x-intel-digest-secret: $INTEL_DIGEST_SECRET` */
router.post('/intel/run-cron', async (req, res) => {
  const secret = process.env.INTEL_DIGEST_SECRET?.trim();
  const hdr = req.headers['x-intel-digest-secret'];
  if (!secret || hdr !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await execIntelDigest(res);
});

router.post('/intel/run', requireAuthRoles(...EXEC_ROLES), async (_req, res) => {
  await execIntelDigest(res);
});

router.get('/intel/digests', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const lim = Math.min(Math.max(Number(req.query.limit ?? 40), 1), 120);
  try {
    const rows = await prisma.intelDigestItem.findMany({
      orderBy: { fetchedAt: 'desc' },
      take: lim,
      include: { source: { select: { label: true, url: true } } },
    });
    res.json({ digests: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load digests' });
  }
});

// --- Spec draft assistant (executives) ---
router.post('/spec-draft', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const body = req.body as { topic?: string; context?: string };
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic || topic.length > 800) {
    res.status(400).json({ error: 'topic required (max 800 chars)' });
    return;
  }
  try {
    const markdown = await draftProductSpecMarkdown(topic, body.context);
    res.json({ markdown });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not draft spec' });
  }
});

export { router as productIntelRouter };
