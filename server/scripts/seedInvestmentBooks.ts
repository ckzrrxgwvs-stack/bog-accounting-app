/**
 * Seed both Robinhood investment ledgers (Agentic + Personal).
 * Usage: DATABASE_URL=... npx tsx server/scripts/seedInvestmentBooks.ts
 */
import { config } from 'dotenv';
import { ensureAllInvestmentBooks, INVESTMENT_BOOKS, type InvestmentBookId } from '../services/investmentBooks';
import { prisma } from '../lib/prisma';

config({ override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  await ensureAllInvestmentBooks();

  for (const bookId of Object.keys(INVESTMENT_BOOKS) as InvestmentBookId[]) {
    const def = INVESTMENT_BOOKS[bookId];
    const company = await prisma.company.findFirst({
      where: { name: def.companyName },
    });
    if (!company) continue;
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id },
      orderBy: { code: 'asc' },
    });
    console.log(`\n${def.companyName} (${def.robinhoodAccountMask})`);
    console.log(`  Company ID: ${company.id}`);
    console.log(`  Accounts (${accounts.length}):`);
    for (const a of accounts) {
      console.log(`    ${a.code}  ${a.name}`);
    }
    console.log(`  API: GET /api/accounts?book=${bookId}`);
    console.log(`  Journal sourceType: ${def.journalSourceType}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
