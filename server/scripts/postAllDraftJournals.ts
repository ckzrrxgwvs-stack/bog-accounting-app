/**
 * Post all DRAFT journal entries (commerce + investment books).
 * Run: pnpm run post:draft-journals
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { EntryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { getOrCreateInvestmentCompany } from '../services/investmentBooks';
import { assertPeriodOpen } from '../services/periodClose';
import { createLedgerEntriesForJournal } from '../services/ledgerFromJournal';

async function postDraftsForCompany(companyId: string, label: string) {
  const drafts = await prisma.journalEntry.findMany({
    where: { companyId, status: EntryStatus.DRAFT },
    include: { lines: { include: { account: true } } },
    orderBy: { date: 'asc' },
  });

  console.log(`\n${label}: ${drafts.length} DRAFT entr${drafts.length === 1 ? 'y' : 'ies'}`);

  for (const row of drafts) {
    try {
      await prisma.$transaction(async (tx) => {
        await assertPeriodOpen(companyId, row.date);
        const updated = await tx.journalEntry.update({
          where: { id: row.id },
          data: { status: EntryStatus.POSTED },
          include: { lines: { include: { account: true } } },
        });
        await createLedgerEntriesForJournal(tx, {
          companyId,
          journalEntryId: updated.id,
          journalDate: updated.date,
          description: updated.description,
          lines: updated.lines.map((l) => ({
            id: l.id,
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
          })),
        });
      });
      console.log(`  POSTED ${row.description.slice(0, 60)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  FAIL ${row.id}: ${msg}`);
    }
  }
}

async function main() {
  const commerce = await getOrCreateDefaultCompany();
  await postDraftsForCompany(commerce.id, 'Commerce');

  for (const book of ['investment_sma', 'investment_personal'] as const) {
    const inv = await getOrCreateInvestmentCompany(book);
    await postDraftsForCompany(inv.id, book);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
