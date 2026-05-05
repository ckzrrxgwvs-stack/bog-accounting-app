import type { Prisma } from '@prisma/client';
import { dec } from '../lib/serialize';

type Line = { id: string; accountId: string; debit: unknown; credit: unknown };

/**
 * Creates LedgerEntry rows for a posted journal (one per line) with running balance per account.
 * Same-JE, same-account lines are ordered by journal line id; intra-entry amounts accumulate correctly.
 */
export async function createLedgerEntriesForJournal(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string;
    journalEntryId: string;
    journalDate: Date;
    description: string;
    lines: Line[];
  }
): Promise<void> {
  const { companyId, journalEntryId, journalDate, description, lines } = params;
  const sorted = [...lines].sort((a, b) => a.id.localeCompare(b.id));
  const intraByAccount = new Map<string, number>();

  for (const line of sorted) {
    const dr = dec(line.debit as never);
    const cr = dec(line.credit as never);
    if (dr < 0.005 && cr < 0.005) continue;

    const existing = await tx.ledgerEntry.findMany({
      where: {
        companyId,
        accountId: line.accountId,
        NOT: { transactionId: journalEntryId },
      },
    });
    const base = existing.reduce((s, r) => s + dec(r.debit as never) - dec(r.credit as never), 0);
    const intra = intraByAccount.get(line.accountId) ?? 0;
    const running = base + intra + dr - cr;
    intraByAccount.set(line.accountId, intra + dr - cr);

    await tx.ledgerEntry.create({
      data: {
        companyId,
        accountId: line.accountId,
        date: journalDate,
        transactionId: journalEntryId,
        transactionType: 'JOURNAL',
        description: description.slice(0, 500),
        debit: dr,
        credit: cr,
        runningBalance: running,
        journalLineId: line.id,
      },
    });
  }
}
