/**
 * Agent org API — event spine, work queue, bookkeeper job, PM digest.
 * See docs/AGENT_ORGANIZATION.md
 */
import { Router } from 'express';
import type { Request } from 'express';
import {
  AccountingEventSource,
  AccountingEventType,
  AccountingEventStatus,
  AgentRole,
  AgentWorkStatus,
  UserRoleType,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { requireJwt } from '../middleware/requireJwt';
import { requireAuthRoles, type JwtPayload } from '../middleware/requireAuthRoles';
import { ingestAccountingEvent } from '../services/agentOrg/ingestEvent';
import { runBookkeeperJob } from '../services/agentOrg/bookkeeperJob';
import { buildPmDigest } from '../services/agentOrg/pmDigest';
import { BUILD_AGENT_ROLES } from '../services/agentOrg/types';

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
  if (jwt.companyId && jwt.companyId !== user.companyId) return null;
  return { userId: user.id, companyId: user.companyId, role: user.role };
}

function cronSecretOk(req: Request): boolean {
  const secret = process.env.AGENT_ORG_CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers['x-agent-org-secret'];
  return typeof header === 'string' && header === secret;
}

router.use((_req, res, next) => {
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'Database required for agent org features' });
    return;
  }
  next();
});

// --- Events (Connector / manual ingest) ---
router.post('/events', requireJwt, async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const body = req.body as {
    source?: string;
    eventType?: string;
    externalId?: string;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
  };

  const sources = Object.values(AccountingEventSource);
  const types = Object.values(AccountingEventType);
  if (!body.source || !sources.includes(body.source as AccountingEventSource)) {
    res.status(400).json({ error: `source must be one of: ${sources.join(', ')}` });
    return;
  }
  if (!body.eventType || !types.includes(body.eventType as AccountingEventType)) {
    res.status(400).json({ error: `eventType must be one of: ${types.join(', ')}` });
    return;
  }
  if (!body.payload || typeof body.payload !== 'object') {
    res.status(400).json({ error: 'payload object is required' });
    return;
  }

  try {
    const result = await ingestAccountingEvent({
      companyId: resolved.companyId,
      source: body.source as AccountingEventSource,
      eventType: body.eventType as AccountingEventType,
      externalId: body.externalId,
      idempotencyKey: body.idempotencyKey,
      payload: body.payload,
    });
    res.status(result.replay ? 200 : 201).json({
      event: result.event,
      idempotentReplay: result.replay,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not ingest event' });
  }
});

router.get('/events', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const statuses = Object.values(AccountingEventStatus);
  const whereStatus =
    status && statuses.includes(status as AccountingEventStatus)
      ? (status as AccountingEventStatus)
      : undefined;

  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const events = await prisma.accountingEvent.findMany({
    where: {
      companyId: resolved.companyId,
      ...(whereStatus ? { status: whereStatus } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json({ events });
});

router.patch('/events/:id', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const body = req.body as { status?: string; statusMessage?: string };
  const allowed = ['NEEDS_REVIEW', 'REJECTED', 'POSTED', 'DRAFT_READY'] as const;
  if (!body.status || !allowed.includes(body.status as (typeof allowed)[number])) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    return;
  }

  try {
    const updated = await prisma.accountingEvent.updateMany({
      where: { id: req.params.id, companyId: resolved.companyId },
      data: {
        status: body.status as AccountingEventStatus,
        statusMessage: typeof body.statusMessage === 'string' ? body.statusMessage.slice(0, 2000) : undefined,
        processedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const event = await prisma.accountingEvent.findFirst({
      where: { id: req.params.id, companyId: resolved.companyId },
    });
    res.json({ event });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not update event' });
  }
});

// --- Bookkeeper job ---
router.post('/run-bookkeeper', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  try {
    const result = await runBookkeeperJob(resolved.companyId);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Bookkeeper job failed' });
  }
});

router.post('/run-bookkeeper-cron', async (req, res) => {
  if (!cronSecretOk(req)) {
    res.status(401).json({ error: 'Invalid or missing x-agent-org-secret' });
    return;
  }

  try {
    const result = await runBookkeeperJob();
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Bookkeeper cron failed' });
  }
});

// --- Work queue (PM + build tickets) ---
router.get('/work', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const agentRole =
    role && BUILD_AGENT_ROLES.includes(role as AgentRole) ? (role as AgentRole) : undefined;

  const items = await prisma.agentWorkItem.findMany({
    where: {
      companyId: resolved.companyId,
      ...(agentRole ? { agentRole } : {}),
      status: { not: 'CANCELLED' },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  res.json({ workItems: items });
});

router.post('/work', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const body = req.body as {
    agentRole?: string;
    title?: string;
    description?: string;
    priority?: number;
    buildSpecJson?: Record<string, unknown>;
    eventId?: string;
  };

  if (!body.agentRole || !BUILD_AGENT_ROLES.includes(body.agentRole as AgentRole)) {
    res.status(400).json({ error: `agentRole must be one of: ${BUILD_AGENT_ROLES.join(', ')}` });
    return;
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : '';
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const item = await prisma.agentWorkItem.create({
      data: {
        companyId: resolved.companyId,
        agentRole: body.agentRole as AgentRole,
        title,
        description: typeof body.description === 'string' ? body.description.slice(0, 12_000) : null,
        priority: Number.isFinite(body.priority) ? Math.max(1, Math.min(99, Number(body.priority))) : 50,
        buildSpecJson: body.buildSpecJson ?? undefined,
        eventId: body.eventId?.trim() || null,
        createdBy: resolved.role,
      },
    });
    res.status(201).json({ workItem: item });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create work item' });
  }
});

router.patch('/work/:id', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const body = req.body as { status?: string; description?: string };
  const statuses = Object.values(AgentWorkStatus);
  if (!body.status || !statuses.includes(body.status as AgentWorkStatus)) {
    res.status(400).json({ error: `status must be one of: ${statuses.join(', ')}` });
    return;
  }

  const data: { status: AgentWorkStatus; description?: string; completedAt?: Date | null } = {
    status: body.status as AgentWorkStatus,
  };
  if (typeof body.description === 'string') {
    data.description = body.description.slice(0, 12_000);
  }
  if (body.status === 'DONE' || body.status === 'CANCELLED') {
    data.completedAt = new Date();
  }

  try {
    const updated = await prisma.agentWorkItem.updateMany({
      where: { id: req.params.id, companyId: resolved.companyId },
      data,
    });
    if (updated.count === 0) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }
    const workItem = await prisma.agentWorkItem.findFirst({
      where: { id: req.params.id, companyId: resolved.companyId },
    });
    res.json({ workItem });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not update work item' });
  }
});

// --- PM digest ---
router.get('/digest', requireAuthRoles(...EXEC_ROLES), async (req, res) => {
  const resolved = await resolveUserCompany(req);
  if (!resolved) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const digest = await buildPmDigest(resolved.companyId);
  res.json(digest);
});

export { router as agentOrgRouter };
