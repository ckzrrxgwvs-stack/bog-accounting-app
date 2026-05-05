import type { Request, RequestHandler } from 'express';
import { UserRoleType } from '@prisma/client';
import { databaseConfigured } from '../lib/dbMode';
import type { GlAuthPayload } from './requireJwtForGl';

/** Roles allowed to post invoices/payments to the general ledger. READONLY is excluded. */
const GL_POST_ROLES = new Set<UserRoleType>([
  UserRoleType.PRESIDENT,
  UserRoleType.CFO,
  UserRoleType.CONTROLLER,
  UserRoleType.ACCOUNTANT,
  UserRoleType.AR_CLERK,
  UserRoleType.AP_CLERK,
]);

/**
 * After JWT validation: ensures the user role may post to GL.
 * Skipped when DB is off or SKIP_GL_AUTH=true (same as JWT middleware).
 */
export const requireGlPostRole: RequestHandler = (req, res, next) => {
  if (!databaseConfigured() || process.env.SKIP_GL_AUTH === 'true') {
    next();
    return;
  }

  const role = (req as Request & { glAuth?: GlAuthPayload }).glAuth?.role;
  if (!role) {
    res.status(403).json({ error: 'Role required for GL posting' });
    return;
  }

  if (!GL_POST_ROLES.has(role as UserRoleType)) {
    res.status(403).json({ error: 'Your role cannot post to the general ledger' });
    return;
  }

  next();
};
