// API routes for user directory (demo — no real auth)

import { Router } from 'express';

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

router.get('/', (_req, res) => {
  res.json({ users: mockUsers });
});

router.post('/', (req, res) => {
  const { email, firstName, lastName, role } = req.body;
  if (!email || !firstName || !lastName || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
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
});

router.put('/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: { ...user, ...req.body, id: user.id } });
});

router.put('/:id/role', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { role } = req.body;
  if (!role) {
    res.status(400).json({ error: 'role required' });
    return;
  }
  res.json({ user: { ...user, role } });
});

router.delete('/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ success: true });
});

export { router as usersRouter };
