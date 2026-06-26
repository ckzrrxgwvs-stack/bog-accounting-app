// User directory — PostgreSQL via Prisma.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { requireAuthRoles } from '../middleware/requireAuthRoles';
import { isBootstrapUserEmail } from '../lib/bootstrapUsers';
import { generateSecurePassword } from '../services/ownerSetup';
import { ensureDefaultPortfolioBooks } from '../services/portfolioBooks';
import { setUserFullAccess } from '../services/accessControl';
import { canAssignAccessToTarget, isExecutiveRole } from '../lib/delegatableModules';
import type { JwtPayload } from '../middleware/requireAuthRoles';
import type { Request } from 'express';

const router = Router();

const adminRoles = [UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER] as const;
const adminChain = [requireAuthRoles(...adminRoles)];
const directoryChain = [requireAuthRoles(...adminRoles, UserRoleType.ACCOUNTANT)];

function mapUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  isActive: boolean;
  mfaEnabled: boolean;
  canViewPortfolio: boolean;
  companyId: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  bookAccess?: { bookId: string; book: { id: string; label: string; slug: string } }[];
  moduleGrants?: { module: string; canDelegate: boolean }[];
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isActive: u.isActive,
    mfaEnabled: u.mfaEnabled,
    canViewPortfolio: u.canViewPortfolio,
    companyId: u.companyId,
    bookIds: u.bookAccess?.map((a) => a.bookId) ?? [],
    books: u.bookAccess?.map((a) => ({ id: a.book.id, label: a.book.label, slug: a.book.slug })) ?? [],
    moduleGrants: u.moduleGrants?.map((g) => ({ module: g.module, canDelegate: g.canDelegate })) ?? [],
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  };
}

router.get('/', ...directoryChain, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (!jwt?.sub) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const granter = await prisma.user.findUnique({
      where: { id: jwt.sub },
      include: { moduleGrants: true },
    });
    if (!granter) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const canList =
      isExecutiveRole(granter.role) || granter.moduleGrants.some((g) => g.canDelegate);
    if (!canList) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const company = await getOrCreateDefaultCompany();
    await ensureDefaultPortfolioBooks(company.id);
    const rows = await prisma.user.findMany({
      where: { companyId: company.id },
      include: {
        bookAccess: { include: { book: { select: { id: true, label: true, slug: true } } } },
        moduleGrants: { select: { module: true, canDelegate: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const users = isExecutiveRole(granter.role)
      ? rows
      : rows.filter((u) => canAssignAccessToTarget(granter.role, u.role));
    res.json({ users: users.map(mapUser) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', ...adminChain, async (req, res) => {
  if (!requireDatabase(res)) return;
  const { email, firstName, lastName, role, password, generatePassword, canViewPortfolio, bookIds, modules } =
    req.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      password?: string;
      generatePassword?: boolean;
      canViewPortfolio?: boolean;
      bookIds?: string[];
      modules?: Array<{ module: string; canDelegate?: boolean }>;
    };
  if (!email || !firstName || !lastName || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  let plainPassword = password?.trim() ?? '';
  let generatedPassword: string | undefined;
  if (generatePassword) {
    generatedPassword = generateSecurePassword();
    plainPassword = generatedPassword;
  }
  if (plainPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters (or choose generate password)' });
    return;
  }
  if (isBootstrapUserEmail(email)) {
    res.status(400).json({ error: 'Bootstrap email addresses are reserved' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    await ensureDefaultPortfolioBooks(company.id);
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (!jwt?.sub) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const created = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        firstName,
        lastName,
        role: role as UserRoleType,
        companyId: company.id,
        passwordHash,
        mfaEnabled: false,
        isActive: true,
        canViewPortfolio: false,
      },
    });

    if (
      (typeof canViewPortfolio === 'boolean' && Array.isArray(bookIds)) ||
      (Array.isArray(modules) && modules.length > 0)
    ) {
      await setUserFullAccess({
        granterId: jwt.sub,
        userId: created.id,
        portfolioCompanyId: company.id,
        canViewPortfolio: typeof canViewPortfolio === 'boolean' ? canViewPortfolio : undefined,
        bookIds: Array.isArray(bookIds) ? bookIds : undefined,
        modules: Array.isArray(modules) ? modules : undefined,
      });
    }

    const full = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        bookAccess: { include: { book: { select: { id: true, label: true, slug: true } } } },
        moduleGrants: { select: { module: true, canDelegate: true } },
      },
    });

    res.status(201).json({
      user: mapUser(full),
      generatedPassword,
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Email already in use' : 'Could not create user' });
  }
});

router.put('/:id', ...adminChain, async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const body = req.body as Partial<{
      firstName: string;
      lastName: string;
      isActive: boolean;
      mfaEnabled: boolean;
      password: string;
    }>;
    const data: Prisma.UserUpdateInput = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.mfaEnabled !== undefined) data.mfaEnabled = body.mfaEnabled;
    if (body.password !== undefined && body.password.length >= 8) {
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      include: {
        bookAccess: { include: { book: { select: { id: true, label: true, slug: true } } } },
        moduleGrants: { select: { module: true, canDelegate: true } },
      },
    });

    res.json({ user: mapUser(updated) });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

router.put('/:id/role', ...adminChain, async (req, res) => {
  if (!requireDatabase(res)) return;
  const { role } = req.body as { role?: string };
  if (!role) {
    res.status(400).json({ error: 'role required' });
    return;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: role as UserRoleType },
      include: {
        bookAccess: { include: { book: { select: { id: true, label: true, slug: true } } } },
        moduleGrants: { select: { module: true, canDelegate: true } },
      },
    });
    res.json({ user: mapUser(updated) });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

router.delete('/:id', ...adminChain, async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (target.role === UserRoleType.PRESIDENT) {
      const presidents = await prisma.user.count({
        where: { companyId: target.companyId, role: UserRoleType.PRESIDENT, isActive: true },
      });
      if (presidents <= 1) {
        res.status(400).json({ error: 'Cannot delete the only active President' });
        return;
      }
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

export { router as usersRouter };
