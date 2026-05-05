import { EntryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dec } from '../lib/serialize';
import type { AccountType } from '@prisma/client';

export type DebitCreditAgg = Map<string, { debit: number; credit: number }>;

export function addAgg(map: DebitCreditAgg, accountId: string, debit: number, credit: number) {
  const cur = map.get(accountId) ?? { debit: 0, credit: 0 };
  cur.debit += debit;
  cur.credit += credit;
  map.set(accountId, cur);
}

export async function aggregatePostedJournal(companyId: string, start: Date, end: Date): Promise<DebitCreditAgg> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      status: EntryStatus.POSTED,
      date: { gte: start, lte: end },
    },
    include: { lines: true },
  });
  const map: DebitCreditAgg = new Map();
  for (const je of entries) {
    for (const line of je.lines) {
      addAgg(map, line.accountId, dec(line.debit as never), dec(line.credit as never));
    }
  }
  return map;
}

export async function aggregatePostedJournalThrough(companyId: string, end: Date): Promise<DebitCreditAgg> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      status: EntryStatus.POSTED,
      date: { lte: end },
    },
    include: { lines: true },
  });
  const map: DebitCreditAgg = new Map();
  for (const je of entries) {
    for (const line of je.lines) {
      addAgg(map, line.accountId, dec(line.debit as never), dec(line.credit as never));
    }
  }
  return map;
}

/** Signed balance for UI: debit-normal accounts positive when debits exceed credits. */
export function signedBalanceForAccount(type: AccountType, debit: number, credit: number): number {
  if (type === 'ASSET' || type === 'EXPENSE' || type === 'COST_OF_GOODS_SOLD') {
    return debit - credit;
  }
  return credit - debit;
}
