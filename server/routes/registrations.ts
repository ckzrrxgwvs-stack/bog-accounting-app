import { Router } from 'express';
import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { formatRegistrationDisplay } from '../lib/registrationCode';
import { requireAuthRoles } from '../middleware/requireAuthRoles';
import {
  activateRegistration,
  issueRegistrationCode,
  revokeRegistration,
} from '../services/customerRegistrationService';

const router = Router();

const ISSUER_ROLE_ALLOWLIST = process.env.REGISTRATION_ISSUER_ROLES?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function issuerRoleAllowed(role: string): boolean {
  if (ISSUER_ROLE_ALLOWLIST?.length) {
    return ISSUER_ROLE_ALLOWLIST.includes(role);
  }
  return [UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER].includes(role as UserRoleType);
}

const activateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.REGISTRATION_ACTIVATE_MAX_PER_HOUR ?? 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many activation attempts. Try again later.' },
});

/** Public: redeem product-style registration code → creates tenant company + COA. */
router.post('/activate', activateLimiter, async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required for activation' });
    return;
  }

  const body = req.body as { code?: string; organizationName?: string };
  const code = typeof body.code === 'string' ? body.code : '';
  if (!code.trim()) {
    res.status(400).json({ error: 'Registration code is required' });
    return;
  }

  try {
    const out = await activateRegistration({
      codeRaw: code,
      organizationName: body.organizationName,
    });
    res.json({
      displayCode: out.displayCode,
      companyId: out.companyId,
      companyName: out.companyName,
      alreadyActivated: out.alreadyActivated,
      message: out.alreadyActivated
        ? 'This code was already activated; returning your organization.'
        : 'Organization created and chart of accounts seeded.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Activation failed';
    res.status(400).json({ error: msg });
  }
});

const issuerChain = [
  requireAuthRoles(UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER),
];

/** Issue a new registration code for a signed customer (tracked record). */
router.post('/issue', ...issuerChain, async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required' });
    return;
  }

  const authRole = (req as Request & { authJwt?: { role?: string } }).authJwt?.role ?? '';
  if (!issuerRoleAllowed(authRole)) {
    res.status(403).json({ error: 'Your role cannot issue registration codes' });
    return;
  }

  const body = req.body as {
    customerName?: string;
    contactEmail?: string;
    internalNotes?: string;
    expiresAt?: string;
  };

  try {
    const expiresAt =
      body.expiresAt && typeof body.expiresAt === 'string' ? new Date(body.expiresAt) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      res.status(400).json({ error: 'Invalid expiresAt date' });
      return;
    }

    const out = await issueRegistrationCode({
      customerName: body.customerName ?? null,
      contactEmail: body.contactEmail ?? null,
      internalNotes: body.internalNotes ?? null,
      expiresAt: expiresAt ?? null,
    });

    res.status(201).json({
      id: out.id,
      registrationCode: out.displayCode,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not issue registration code' });
  }
});

/** List all issued registrations (vendor-side CRM trail). */
router.get('/', ...issuerChain, async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required' });
    return;
  }

  const authRole = (req as Request & { authJwt?: { role?: string } }).authJwt?.role ?? '';
  if (!issuerRoleAllowed(authRole)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const rows = await prisma.customerRegistration.findMany({
      orderBy: { issuedAt: 'desc' },
      include: { company: { select: { id: true, name: true } } },
    });

    res.json({
      registrations: rows.map((r) => ({
        id: r.id,
        registrationCode: formatRegistrationDisplay(r.codeNormalized),
        customerName: r.customerName,
        contactEmail: r.contactEmail,
        internalNotes: r.internalNotes,
        status: r.status,
        issuedAt: r.issuedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
        activatedAt: r.activatedAt?.toISOString() ?? null,
        revokedAt: r.revokedAt?.toISOString() ?? null,
        companyId: r.companyId,
        companyName: r.company?.name ?? null,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list registrations' });
  }
});

router.post('/:id/revoke', ...issuerChain, async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required' });
    return;
  }

  const authRole = (req as Request & { authJwt?: { role?: string } }).authJwt?.role ?? '';
  if (!issuerRoleAllowed(authRole)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const row = await prisma.customerRegistration.findUnique({ where: { id: req.params.id } });
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (row.status === 'ACTIVATED') {
      res.status(400).json({ error: 'Cannot revoke an activated registration' });
      return;
    }
    await revokeRegistration(row.id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not revoke' });
  }
});

export { router as registrationsRouter };
