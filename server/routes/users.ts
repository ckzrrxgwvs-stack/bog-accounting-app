// User directory — Prisma + bcrypt when DATABASE_URL is set; otherwise mock for UI dev.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

const router = Router();

const mockUsers = [
  {
    id: 'u1',
    email: 'admin@company.com',
    firstName: 'John',
    lastName: 'President',
    role: 'PRESIDENT',
    isActive: true,
    mfaEnabled: true,
    companyId: '1',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u2',
    email: 'cfo@company.com',
    firstName: 'Jane',
    lastName: 'CFO',
    role: 'CFO',
    isActive: true,
    mfaEnabled: true,
    companyId: '1',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u3',
    email: 'accountant@company.com',
    firstName: 'Alex',
    lastName: 'Accountant',
    role: 'ACCOUNTANT',
    isActive: true,
    mfaEnabled: false,
    companyId: '1',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

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
  if (!useDatabase()) {
    res.json({ users: mockUsers });
    return;
  }
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

  if (!useDatabase()) {
    const user = {
      id: `u-${Date.now()}`,
      email,
      firstName,
      lastName,
      role,
      isActive: true,
      mfaEnabled: true,
      companyId: '1',
      createdAt: new Date().toISOString(),
    };
    res.status(201).json({ user });
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
  if (!useDatabase()) {
    const user = mockUsers.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: { ...user, ...req.body, id: user.id } });
    return;
  }

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
  const { role } = req.body as { role?: string };
  if (!role) {
    res.status(400).json({ error: 'role required' });
    return;
  }

  if (!useDatabase()) {
    const user = mockUsers.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: { ...user, role } });
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
  if (!useDatabase()) {
    const user = mockUsers.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ success: true });
    return;
  }

  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

export { router as usersRouter };
