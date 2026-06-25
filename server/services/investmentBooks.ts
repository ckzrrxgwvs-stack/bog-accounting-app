import type { AccountType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** API `?book=` values — separate ledgers per Robinhood account. */
export type InvestmentBookId = 'investment_sma' | 'investment_personal';

export type InvestmentBookDef = {
  bookId: InvestmentBookId;
  companyName: string;
  legalName: string;
  robinhoodAccountMask: string;
  /** Journal `sourceType` that routes postings to this book. */
  journalSourceType: string;
  cashAccountName: string;
};

export const INVESTMENT_BOOKS: Record<InvestmentBookId, InvestmentBookDef> = {
  investment_sma: {
    bookId: 'investment_sma',
    companyName: 'Investment SMA (Agentic)',
    legalName: 'Investment SMA — Robinhood Agentic ••••2117',
    robinhoodAccountMask: '••••2117',
    journalSourceType: 'investment_fund_crew',
    cashAccountName: 'Cash — Investment Brokerage (Agentic)',
  },
  investment_personal: {
    bookId: 'investment_personal',
    companyName: 'Investment — Personal',
    legalName: 'Investment — Robinhood Personal ••••2686',
    robinhoodAccountMask: '••••2686',
    journalSourceType: 'investment_personal',
    cashAccountName: 'Cash — Investment Brokerage (Personal)',
  },
};

const SHARED_INVESTMENT_COA: { code: string; name: string; type: AccountType }[] = [
  { code: '1210', name: 'Securities at cost', type: 'ASSET' },
  { code: '1211', name: 'Unrealized gain on securities', type: 'ASSET' },
  { code: '1212', name: 'Unrealized loss on securities', type: 'ASSET' },
  { code: '4500', name: 'Dividend income', type: 'REVENUE' },
  { code: '4610', name: 'Realized gain on securities', type: 'REVENUE' },
  { code: '4611', name: 'Realized loss on securities', type: 'EXPENSE' },
  { code: '6310', name: 'Brokerage commissions & fees', type: 'EXPENSE' },
];

export function investmentCoaForBook(bookId: InvestmentBookId): { code: string; name: string; type: AccountType }[] {
  const def = INVESTMENT_BOOKS[bookId];
  return [
    { code: '1200', name: def.cashAccountName, type: 'ASSET' },
    ...SHARED_INVESTMENT_COA,
  ];
}

export function isInvestmentBookId(book: string | undefined): book is InvestmentBookId {
  return book === 'investment_sma' || book === 'investment_personal';
}

export function resolveInvestmentBookFromQuery(book: unknown): InvestmentBookId | null {
  if (typeof book !== 'string') return null;
  return isInvestmentBookId(book) ? book : null;
}

export function resolveInvestmentBookFromSourceType(sourceType: unknown): InvestmentBookId | null {
  if (typeof sourceType !== 'string') return null;
  for (const def of Object.values(INVESTMENT_BOOKS)) {
    if (def.journalSourceType === sourceType) return def.bookId;
  }
  return null;
}

export async function seedInvestmentChartTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  bookId: InvestmentBookId
): Promise<void> {
  for (const row of investmentCoaForBook(bookId)) {
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

export async function getOrCreateInvestmentCompany(bookId: InvestmentBookId) {
  const def = INVESTMENT_BOOKS[bookId];
  let company = await prisma.company.findFirst({
    where: { name: def.companyName },
    orderBy: { createdAt: 'asc' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: def.companyName,
        legalName: def.legalName,
        country: 'US',
        currency: 'USD',
        fiscalYearStart: 1,
        useInventory: false,
        usePayroll: false,
        useMultiCurrency: false,
        useCostCenters: false,
      },
    });
  } else if (company.legalName !== def.legalName) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { legalName: def.legalName },
    });
  }

  await prisma.$transaction(async (tx) => {
    await seedInvestmentChartTx(tx, company!.id, bookId);
  });

  return company;
}

/** Ensure both Robinhood investment ledgers exist (Agentic + Personal). */
export async function ensureAllInvestmentBooks(): Promise<void> {
  for (const bookId of Object.keys(INVESTMENT_BOOKS) as InvestmentBookId[]) {
    await getOrCreateInvestmentCompany(bookId);
  }
}
