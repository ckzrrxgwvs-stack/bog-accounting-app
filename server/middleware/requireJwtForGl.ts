import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { databaseConfigured } from '../lib/dbMode';

export type GlAuthPayload = { sub?: string; companyId?: string; role?: string };

/**
 * When DATABASE_URL is set and SKIP_GL_AUTH is not "true", GL posting routes require a valid Bearer JWT.
 */
export const requireJwtForGlPost: RequestHandler = (req, res, next) => {
  if (!databaseConfigured() || process.env.SKIP_GL_AUTH === 'true') {
    next();
    return;
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required for GL posting' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'dev-only-set-JWT_SECRET-in-production';
  try {
    const payload = jwt.verify(auth.slice(7), secret) as GlAuthPayload;
    (req as Request & { glAuth?: GlAuthPayload }).glAuth = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
