import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';

export type CsvRow = { date: string; amount: number; memo: string };

/** Parse simple CSV: date, amount, memo (header row optional). */
export function parseCsvTransactions(csv: string): CsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const start = /^date/i.test(lines[0]) ? 1 : 0;
  const rows: CsvRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 2) continue;
    const date = parts[0];
    const amount = Number(parts[1].replace(/[$,]/g, ''));
    const memo = parts.slice(2).join(', ') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) continue;
    rows.push({ date, amount, memo });
  }
  return rows;
}

function externalIdFor(row: CsvRow, index: number): string {
  const raw = `${row.date}|${row.amount}|${row.memo}|${index}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export async function importBankFeedCsv(opts: {
  companyId: string;
  accountName: string;
  accountMask?: string;
  institution?: string;
  rows: CsvRow[];
  dryRun: boolean;
}): Promise<{
  accountId: string | null;
  imported: number;
  skipped: number;
  preview: CsvRow[];
}> {
  const { companyId, accountName, rows, dryRun } = opts;
  if (rows.length === 0) {
    return { accountId: null, imported: 0, skipped: 0, preview: [] };
  }

  let account = await prisma.bankFeedAccount.findFirst({
    where: { companyId, name: accountName },
  });

  if (!account && !dryRun) {
    account = await prisma.bankFeedAccount.create({
      data: {
        companyId,
        name: accountName,
        accountMask: opts.accountMask ?? null,
        institution: opts.institution ?? null,
      },
    });
  }

  const accountId = account?.id ?? null;
  let imported = 0;
  let skipped = 0;
  const preview: CsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const externalId = externalIdFor(row, i);
    const existing = await prisma.bankFeedTransaction.findFirst({
      where: { companyId, externalId },
    });
    if (existing) {
      skipped++;
      continue;
    }
    preview.push(row);
    if (dryRun || !accountId) continue;

    await prisma.bankFeedTransaction.create({
      data: {
        companyId,
        bankFeedAccountId: accountId,
        externalId,
        postedDate: new Date(`${row.date}T12:00:00.000Z`),
        amount: row.amount,
        memo: row.memo || null,
      },
    });
    imported++;
  }

  return { accountId, imported, skipped, preview };
}
