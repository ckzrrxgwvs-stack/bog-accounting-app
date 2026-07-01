/**
 * Seed vendors + customers for Investment SMA (and optional store company).
 * Usage:
 *   DATABASE_URL=... npx tsx server/scripts/seedInvestmentCounterparties.ts
 *   DATABASE_URL=... npx tsx server/scripts/seedInvestmentCounterparties.ts --store
 */
import { config } from 'dotenv';
import { getOrCreateInvestmentSmaCompany } from '../services/investmentSmaBootstrap';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import {
  INVESTMENT_SMA_COUNTERPARTIES,
  STORE_COUNTERPARTIES,
  seedCustomersTx,
  seedVendorsTx,
} from '../services/counterpartySeed';
import { prisma } from '../lib/prisma';

config({ override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const includeStore = process.argv.includes('--store');

  const sma = await getOrCreateInvestmentSmaCompany();
  const smaResult = await prisma.$transaction(async (tx) => {
    const vendors = await seedVendorsTx(tx, sma.id, INVESTMENT_SMA_COUNTERPARTIES.vendors);
    const customers = await seedCustomersTx(tx, sma.id, INVESTMENT_SMA_COUNTERPARTIES.customers);
    return { vendors, customers };
  });

  console.log(`Investment SMA (${sma.name})`);
  console.log(`  Vendors:   +${smaResult.vendors.created} created, ${smaResult.vendors.skipped} existing`);
  console.log(`  Customers: +${smaResult.customers.created} created, ${smaResult.customers.skipped} existing`);

  if (includeStore) {
    const store = await getOrCreateDefaultCompany();
    const storeResult = await prisma.$transaction(async (tx) => {
      const vendors = await seedVendorsTx(tx, store.id, STORE_COUNTERPARTIES.vendors);
      const customers = await seedCustomersTx(tx, store.id, STORE_COUNTERPARTIES.customers);
      return { vendors, customers };
    });
    console.log(`\nStore company (${store.name})`);
    console.log(`  Vendors:   +${storeResult.vendors.created} created, ${storeResult.vendors.skipped} existing`);
    console.log(`  Customers: +${storeResult.customers.created} created, ${storeResult.customers.skipped} existing`);
  } else {
    console.log('\nTip: pass --store to seed dropship vendors on default company too.');
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
