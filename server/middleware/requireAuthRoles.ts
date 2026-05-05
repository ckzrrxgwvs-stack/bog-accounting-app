import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UserRoleType } from '@prisma/client';

export type JwtPayload = { sub?: string; companyId?: string; role?: string };

/**
 * Requires Authorization Bearer JWT with role in the allowed list.
 */
export function requireAuthRoles(...allowed: UserRoleType[]): RequestHandler {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization required' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'dev-only-set-JWT_SECRET-in-production';
    try {
      const payload = jwt.verify(auth.slice(7), secret) as JwtPayload;
      const role = payload.role as UserRoleType | undefined;
      if (!role || !allowed.includes(role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      (req as Request & { authJwt?: JwtPayload }).authJwt = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
