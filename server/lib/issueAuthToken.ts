import jwt from 'jsonwebtoken';
import { UserRoleType } from '@prisma/client';

export function issueAuthToken(user: { id: string; companyId: string; role: UserRoleType | string }): string {
  const secret = process.env.JWT_SECRET || 'dev-only-set-JWT_SECRET-in-production';
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
    },
    secret,
    { expiresIn: '7d' }
  );
}
