/**
 * API login against Postgres User rows (bcrypt). Demo-only UI can still use localStorage fallback.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { issueAuthToken } from '../lib/issueAuthToken';

const router = Router();

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }

  if (!requireDatabase(res)) return;

  try {
    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = issueAuthToken({
      id: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : 'Login failed';
    if (!requireDatabase(res)) return;
    res.status(500).json({ error: 'Login failed', hint: msg.slice(0, 200) });
  }
});

export { router as authRouter };
