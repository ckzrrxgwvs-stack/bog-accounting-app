/**
 * One-shot bootstrap: company + COA + executive demo users (API login).
 * Usage: pnpm run db:bootstrap
 */
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { bootstrapUsersEnabled } from '../lib/bootstrapUsers';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

config({ override: true });

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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required. Try local:');
    console.error('  docker compose up -d');
    console.error('  DATABASE_URL=postgresql://postgres:boglocal@localhost:5433/accounting pnpm run db:bootstrap');
    process.exit(1);
  }

  const company = await getOrCreateDefaultCompany();
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: process.env.BOG_COMPANY_NAME?.trim() || 'BOG Commerce',
      legalName: 'BOG Commerce LLC',
      useShopifyConnector: true,
    },
  });

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  if (bootstrapUsersEnabled()) {
    for (const u of USERS) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        if (process.env.BOG_BOOTSTRAP_RESET === '1') {
          await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash: hash, companyId: company.id, isActive: true, mfaEnabled: false },
          });
          console.log(`  reset password ${u.email}`);
        } else {
          console.log(`  skip existing ${u.email}`);
        }
        continue;
      }
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
      console.log(`  created user ${u.email} (${u.role})`);
    }
  } else {
    console.log('  skip demo users (set BOG_BOOTSTRAP_USERS=1 for admin@company.com / demo123)');
  }

  const accountCount = await prisma.account.count({ where: { companyId: company.id } });
  console.log('\n✓ BOG program bootstrap complete');
  console.log(`  Company: ${company.id}`);
  console.log(`  Chart of accounts: ${accountCount} accounts`);
  if (bootstrapUsersEnabled()) {
    console.log(`  Login (API): admin@company.com / ${DEMO_PASSWORD}`);
  } else {
    console.log('  Next: open http://localhost:5173/setup-owner to create your President login');
  }
  console.log('  Next: pnpm run dev:program → http://localhost:5173');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
