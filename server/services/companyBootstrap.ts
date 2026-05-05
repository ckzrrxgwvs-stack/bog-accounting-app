import type { AccountType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** Minimal GAAP-style starter chart for Module 1 (US baseline). */
const DEFAULT_COA: { code: string; name: string; type: AccountType }[] = [
  { code: '1100', name: 'Cash', type: 'ASSET' },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1300', name: 'Inventory', type: 'ASSET' },
  { code: '1500', name: 'Equipment', type: 'ASSET' },
  { code: '2100', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2150', name: 'Sales Tax Payable', type: 'LIABILITY' },
  { code: '2200', name: 'Notes Payable', type: 'LIABILITY' },
  { code: '3100', name: 'Common Stock', type: 'EQUITY' },
  { code: '3200', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '4100', name: 'Sales Revenue', type: 'REVENUE' },
  { code: '5100', name: 'Cost of Goods Sold', type: 'COST_OF_GOODS_SOLD' },
  { code: '6100', name: 'Salaries & Wages', type: 'EXPENSE' },
  { code: '6200', name: 'Rent Expense', type: 'EXPENSE' },
  { code: '6300', name: 'Utilities Expense', type: 'EXPENSE' },
  { code: '6400', name: 'Marketing Expense', type: 'EXPENSE' },
  { code: '6500', name: 'Office Supplies', type: 'EXPENSE' },
];

/** Seed COA inside an existing transaction (e.g. tenant activation). */
export async function seedChartOfAccountsTx(tx: Prisma.TransactionClient, companyId: string): Promise<void> {
  for (const row of DEFAULT_COA) {
    await tx.account.create({
      data: {
        companyId,
        code: row.code,
        name: row.name,
        type: row.type,
        level: 0,
        isActive: true,
        allowPosting: true,
      },
    });
  }
}

export async function seedChartOfAccounts(companyId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await seedChartOfAccountsTx(tx, companyId);
  });
}

export async function getOrCreateDefaultCompany() {
  let company = await prisma.company.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'My Company',
        legalName: 'My Company LLC',
        country: 'US',
        currency: 'USD',
        fiscalYearStart: 1,
        useInventory: false,
        usePayroll: false,
        useMultiCurrency: false,
        useCostCenters: false,
      },
    });
    await seedChartOfAccounts(company.id);
    return company;
  }

  const count = await prisma.account.count({ where: { companyId: company.id } });
  if (count === 0) {
    await seedChartOfAccounts(company.id);
  }

  return company;
}
