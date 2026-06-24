/**
 * Seed separate BOG company for investment-fund-crew (not store/dropship).
 * Usage: DATABASE_URL=... npx tsx server/scripts/seedInvestmentSmaCompany.ts
 */
import { config } from 'dotenv';
import {
  getOrCreateInvestmentSmaCompany,
  INVESTMENT_SMA_COA,
  INVESTMENT_SMA_COMPANY_NAME,
} from '../services/investmentSmaBootstrap';
import { prisma } from '../lib/prisma';

config({ override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const company = await getOrCreateInvestmentSmaCompany();
  const accounts = await prisma.account.findMany({
    where: { companyId: company.id },
    orderBy: { code: 'asc' },
  });

  console.log(`Company: ${INVESTMENT_SMA_COMPANY_NAME}`);
  console.log(`ID: ${company.id}`);
  console.log(`Accounts (${accounts.length}):`);
  for (const a of accounts) {
    console.log(`  ${a.code}  ${a.name}`);
  }
  console.log('\nExpected chart codes:', INVESTMENT_SMA_COA.map((c) => c.code).join(', '));
  console.log('\nSet in investment-fund-crew/.env:');
  console.log(`BOG_COMPANY_ID=${company.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
