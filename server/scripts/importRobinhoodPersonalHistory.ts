/**
 * Import Robinhood filled equity orders JSON into Investment — Personal (••••2686).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx server/scripts/importRobinhoodPersonalHistory.ts path/to/orders.json
 *
 * JSON shape: { "orders": [ ...get_equity_orders rows... ] } or a bare orders array.
 */
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { prisma } from '../lib/prisma';
import { importRobinhoodEquityOrders } from '../services/robinhood/importEquityOrders';
import type { RobinhoodEquityOrder } from '../services/robinhood/equityOrderTypes';

config({ override: true });

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: npx tsx server/scripts/importRobinhoodPersonalHistory.ts <orders.json>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(path, 'utf8')) as
    | { orders?: RobinhoodEquityOrder[]; data?: { orders?: RobinhoodEquityOrder[] } }
    | RobinhoodEquityOrder[];
  const orders = Array.isArray(raw)
    ? raw
    : raw.orders ?? raw.data?.orders ?? [];

  if (orders.length === 0) {
    console.error('No orders in file');
    process.exit(1);
  }

  const result = await importRobinhoodEquityOrders('investment_personal', orders);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
