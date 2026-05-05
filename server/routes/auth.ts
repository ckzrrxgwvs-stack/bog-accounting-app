/**
 * API login against Postgres User rows (bcrypt). Demo-only UI can still use localStorage fallback.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';

const router = Router();

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }

  if (!useDatabase()) {
    res.status(503).json({ error: 'DATABASE_URL required for API authentication' });
    return;
  }

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

    const secret = process.env.JWT_SECRET || 'dev-only-set-JWT_SECRET-in-production';
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'JWT_SECRET must be set in production' });
      return;
    }

    const token = jwt.sign(
      {
        sub: user.id,
        companyId: user.companyId,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    );

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
    res.status(500).json({ error: 'Login failed' });
  }
});

export { router as authRouter };
