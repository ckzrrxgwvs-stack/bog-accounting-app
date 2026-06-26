import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { UserRoleType } from '@prisma/client';
import { requireDatabase } from '../lib/requireDatabase';
import { requireAuthRoles } from '../middleware/requireAuthRoles';
import { requireJwt } from '../middleware/requireJwt';
import { getTesterAccessInfo } from '../lib/testerAccess';
import {
  claimTesterInvite,
  getTesterInvitePublic,
  issueTesterInviteLink,
  listTesterInviteLinks,
  revokeTesterInviteLink,
} from '../services/testerInviteService';

const router = Router();

const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.TESTER_CLAIM_MAX_PER_HOUR ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Try again later.' },
});

const presidentChain = [requireAuthRoles(UserRoleType.PRESIDENT)];

function issuerSecretOk(req: { headers: Record<string, unknown> }): boolean {
  const testerSecret = process.env.TESTER_INVITE_ISSUER_SECRET?.trim();
  if (testerSecret) {
    const header = req.headers['x-tester-invite-secret'];
    if (typeof header === 'string' && header === testerSecret) return true;
  }
  const cronSecret = process.env.AGENT_ORG_CRON_SECRET?.trim();
  if (cronSecret) {
    const cronHeader = req.headers['x-agent-org-secret'];
    if (typeof cronHeader === 'string' && cronHeader === cronSecret) return true;
  }
  return false;
}

function requirePresidentOrIssuerSecret(req: Request, res: Response, next: NextFunction) {
  if (issuerSecretOk(req)) {
    next();
    return;
  }
  requireAuthRoles(UserRoleType.PRESIDENT)(req, res, next);
}

/** Authenticated tester: days remaining on sandbox. */
router.get('/me/access', requireJwt, async (req, res) => {
  if (!requireDatabase(res)) return;
  const userId = (req as Request & { authJwt?: { sub?: string } }).authJwt?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }
  try {
    const info = await getTesterAccessInfo(userId);
    res.json(info);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load tester access' });
  }
});

/** List beta links + recent enrollments (President). */
router.get('/', ...presidentChain, async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const links = await listTesterInviteLinks();
    res.json({ links });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list beta invites' });
  }
});

/** Issue a new shareable beta link (President or x-tester-invite-secret). */
router.post('/issue', requirePresidentOrIssuerSecret, async (req, res) => {
  if (!requireDatabase(res)) return;

  const body = req.body as { label?: string; trialDays?: number };
  const issuedById = (req as Request & { authJwt?: { sub?: string } }).authJwt?.sub ?? null;

  try {
    const trialDays =
      typeof body.trialDays === 'number' ? body.trialDays : Number(process.env.TESTER_TRIAL_DAYS ?? 15);
    const out = await issueTesterInviteLink({
      label: body.label ?? null,
      trialDays,
      issuedById,
    });
    res.status(201).json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not issue invite';
    res.status(400).json({ error: msg });
  }
});

router.post('/:id/revoke', ...presidentChain, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    await revokeTesterInviteLink(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not revoke invite' });
  }
});

/** Public: validate a shareable beta invite link. */
router.get('/:token', async (req, res) => {
  if (!requireDatabase(res)) return;
  if (req.params.token === 'me') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    const info = await getTesterInvitePublic(req.params.token);
    res.json(info);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid invite';
    res.status(400).json({ error: msg });
  }
});

/** Public: create sandbox + President account; trial clock starts now. */
router.post('/:token/claim', claimLimiter, async (req, res) => {
  if (!requireDatabase(res)) return;

  const body = req.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    generatePassword?: boolean;
    companyName?: string;
  };

  if (!body.email?.trim() || !body.firstName?.trim() || !body.lastName?.trim()) {
    res.status(400).json({ error: 'email, firstName, and lastName are required' });
    return;
  }

  try {
    const result = await claimTesterInvite({
      token: req.params.token,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
      generatePassword: Boolean(body.generatePassword),
      companyName: body.companyName,
    });
    res.status(201).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Signup failed';
    res.status(400).json({ error: msg });
  }
});

export { router as testerInvitesRouter };
