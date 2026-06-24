import bcrypt from 'bcryptjs';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { useDatabase } from '../lib/dbMode';

const DEMO_PASSWORD = process.env.BOG_BOOTSTRAP_PASSWORD?.trim() || 'demo123';

const USERS: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
}[] = [
  { email: 'admin@company.com', firstName: 'Admin', lastName: 'President', role: 'PRESIDENT' },
  { email: 'cfo@company.com', firstName: 'Chief', lastName: 'Financial', role: 'CFO' },
  { email: 'accountant@company.com', firstName: 'Staff', lastName: 'Accountant', role: 'ACCOUNTANT' },
  { email: 'controller@company.com', firstName: 'Ops', lastName: 'Controller', role: 'CONTROLLER' },
];

let bootstrapped = false;

/** First deploy only: company + COA + users when User table is empty. */
export async function ensureProgramBootstrap(): Promise<void> {
  if (!useDatabase() || bootstrapped) return;

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    bootstrapped = true;
    return;
  }

  const company = await getOrCreateDefaultCompany();
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: process.env.BOG_COMPANY_NAME?.trim() || 'BOG Commerce',
      legalName: 'BOG Commerce LLC',
    },
  });

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        companyId: company.id,
        isActive: true,
        mfaEnabled: false,
      },
    });
  }

  console.log(`   ✓ Program bootstrap: seeded ${USERS.length} users (empty database)`);
  bootstrapped = true;
}
