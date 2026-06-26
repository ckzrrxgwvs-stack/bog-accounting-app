import bcrypt from 'bcryptjs';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { bootstrapUsersEnabled } from '../lib/bootstrapUsers';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { ensureAllInvestmentBooks } from './investmentBooks';
import { ensureDefaultPortfolioBooks } from './portfolioBooks';
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

/** Ensure company, COA, and demo users exist (upsert — safe on every deploy). */
export async function ensureProgramBootstrap(options?: { force?: boolean }): Promise<void> {
  if (!useDatabase()) return;
  if (bootstrapped && !options?.force) return;

  try {
    const company = await getOrCreateDefaultCompany();
    await prisma.company.update({
      where: { id: company.id },
      data: {
        name: process.env.BOG_COMPANY_NAME?.trim() || 'BOG Commerce',
        legalName: 'BOG Commerce LLC',
      },
    });

    const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
    if (bootstrapUsersEnabled()) {
      for (const u of USERS) {
        await prisma.user.upsert({
          where: { email: u.email },
          create: {
            email: u.email,
            passwordHash: hash,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            companyId: company.id,
            isActive: true,
            mfaEnabled: false,
          },
          update: {
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
      console.log(`   ✓ Program bootstrap: ${USERS.length} demo users ready (BOG_BOOTSTRAP_USERS=1)`);
    } else {
      console.log('   ✓ Program bootstrap: company + COA (no demo users — use /setup-owner or BOG_BOOTSTRAP_USERS=1)');
    }

    await ensureAllInvestmentBooks();
    await ensureDefaultPortfolioBooks(company.id);
    console.log('   ✓ Investment books ready (Agentic ••••2117 + Personal ••••2686)');
    console.log('   ✓ Portfolio books linked under company');

    bootstrapped = true;
  } catch (e) {
    bootstrapped = false;
    console.error('   ⚠️  Program bootstrap failed:', e instanceof Error ? e.message : e);
    throw e;
  }
}
