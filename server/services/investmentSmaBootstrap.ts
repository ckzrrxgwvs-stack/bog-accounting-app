import type { AccountType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** Chart for investment-fund-crew ↔ separate BOG company (not store/dropship). */
export const INVESTMENT_SMA_COA: { code: string; name: string; type: AccountType }[] = [
  { code: '1200', name: 'Cash — Investment Brokerage (Agentic)', type: 'ASSET' },
  { code: '1210', name: 'Securities at cost', type: 'ASSET' },
  { code: '1211', name: 'Unrealized gain on securities', type: 'ASSET' },
  { code: '1212', name: 'Unrealized loss on securities', type: 'ASSET' },
  { code: '4500', name: 'Dividend income', type: 'REVENUE' },
  { code: '4610', name: 'Realized gain on securities', type: 'REVENUE' },
  { code: '4611', name: 'Realized loss on securities', type: 'EXPENSE' },
  { code: '6310', name: 'Brokerage commissions & fees', type: 'EXPENSE' },
];

export const INVESTMENT_SMA_COMPANY_NAME = 'Investment SMA (Agentic)';

export async function seedInvestmentSmaChartTx(tx: Prisma.TransactionClient, companyId: string): Promise<void> {
  for (const row of INVESTMENT_SMA_COA) {
    const existing = await tx.account.findFirst({
      where: { companyId, code: row.code },
    });
    if (existing) continue;
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

export async function getOrCreateInvestmentSmaCompany() {
  let company = await prisma.company.findFirst({
    where: { name: INVESTMENT_SMA_COMPANY_NAME },
    orderBy: { createdAt: 'asc' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: INVESTMENT_SMA_COMPANY_NAME,
        legalName: 'Investment SMA — Robinhood Agentic ••••2117',
        country: 'US',
        currency: 'USD',
        fiscalYearStart: 1,
        useInventory: false,
        usePayroll: false,
        useMultiCurrency: false,
        useCostCenters: false,
      },
    });
  }

  const count = await prisma.account.count({ where: { companyId: company.id } });
  if (count === 0) {
    await prisma.$transaction(async (tx) => {
      await seedInvestmentSmaChartTx(tx, company!.id);
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await seedInvestmentSmaChartTx(tx, company!.id);
    });
  }

  return company;
}
