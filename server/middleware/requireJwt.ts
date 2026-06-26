import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from './requireAuthRoles';
import { getTesterAccessBlock } from '../lib/testerAccess';

/** Requires Bearer JWT (any authenticated user). Sets `req.authJwt`. */
export const requireJwt: RequestHandler = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'dev-only-set-JWT_SECRET-in-production';
  try {
    const payload = jwt.verify(auth.slice(7), secret) as JwtPayload;
    const blocked = await getTesterAccessBlock(payload.sub);
    if (blocked) {
      res.status(403).json({ error: blocked, code: 'TESTER_EXPIRED' });
      return;
    }
    (req as Request & { authJwt?: JwtPayload }).authJwt = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
