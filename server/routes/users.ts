// User directory — PostgreSQL via Prisma.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

const router = Router();

function mapUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  isActive: boolean;
  mfaEnabled: boolean;
  companyId: string;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isActive: u.isActive,
    mfaEnabled: u.mfaEnabled,
    companyId: u.companyId,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get('/', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.user.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ users: rows.map(mapUser) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  if (!requireDatabase(res)) return;
  const { email, firstName, lastName, role, password } = req.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    password?: string;
  };
  if (!email || !firstName || !lastName || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        firstName,
        lastName,
        role: role as UserRoleType,
        companyId: company.id,
        passwordHash,
        mfaEnabled: true,
        isActive: true,
      },
    });
    res.status(201).json({ user: mapUser(created) });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Email already in use' : 'Could not create user' });
  }
});

router.put('/:id', async (req, res) => {
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
    });
    res.json({ user: mapUser(updated) });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

router.put('/:id/role', async (req, res) => {
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
    });
    res.json({ user: mapUser(updated) });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

export { router as usersRouter };
