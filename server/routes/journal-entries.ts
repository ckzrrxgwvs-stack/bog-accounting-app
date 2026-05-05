import { Router } from 'express';
import { EntryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { assertPeriodOpen } from '../services/periodClose';
import { createLedgerEntriesForJournal } from '../services/ledgerFromJournal';

const router = Router();

type JournalLineOut = {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

type JournalEntryOut = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  lines: JournalLineOut[];
  createdAt: string;
};

let mockEntries: JournalEntryOut[] = [
  {
    id: 'je-1',
    entryNumber: '1001',
    date: '2026-04-15',
    description: 'Record monthly rent',
    status: 'POSTED',
    createdAt: '2026-04-15T10:00:00.000Z',
    lines: [
      { accountId: '12', accountCode: '6200', accountName: 'Rent Expense', debit: 17000, credit: 0 },
      { accountId: '1', accountCode: '1100', accountName: 'Cash', debit: 0, credit: 17000 },
    ],
  },
];

function requireJournalApproval(): boolean {
  return process.env.JOURNAL_REQUIRE_APPROVAL === '1' || process.env.JOURNAL_REQUIRE_APPROVAL === 'true';
}

function serializeJe(je: {
  id: string;
  entryNumber: number;
  date: Date;
  description: string;
  status: EntryStatus;
  createdAt: Date;
  lines: {
    accountId: string;
    debit: unknown;
    credit: unknown;
    account: { code: string; name: string };
  }[];
}): JournalEntryOut {
  return {
    id: je.id,
    entryNumber: String(je.entryNumber),
    date: je.date.toISOString().slice(0, 10),
    description: je.description,
    status: je.status,
    createdAt: je.createdAt.toISOString(),
    lines: je.lines.map((l) => ({
      accountId: l.accountId,
      accountCode: l.account.code,
      accountName: l.account.name,
      debit: dec(l.debit as never),
      credit: dec(l.credit as never),
    })),
  };
}

router.get('/', async (req, res) => {
  const { startDate, endDate, status } = req.query;

  if (!useDatabase()) {
    let list = [...mockEntries];
    if (status) list = list.filter((e) => e.status === status);
    if (startDate) list = list.filter((e) => e.date >= String(startDate));
    if (endDate) list = list.filter((e) => e.date <= String(endDate));
    res.json({ journalEntries: list });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const where: import('@prisma/client').Prisma.JournalEntryWhereInput = {
      companyId: company.id,
    };
    if (status && typeof status === 'string') {
      where.status = status as EntryStatus;
    }
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (startDate) dateRange.gte = new Date(String(startDate));
    if (endDate) dateRange.lte = new Date(String(endDate));
    if (Object.keys(dateRange).length > 0) where.date = dateRange;

    const rows = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: { include: { account: true } },
      },
      orderBy: [{ date: 'desc' }, { entryNumber: 'desc' }],
    });

    res.json({ journalEntries: rows.map(serializeJe) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    date?: string;
    description?: string;
    lines?: { accountId: string; debit?: number; credit?: number }[];
  };

  if (!useDatabase()) {
    const id = `je-${mockEntries.length + 1}`;
    const entry: JournalEntryOut = {
      id,
      entryNumber: String(1000 + mockEntries.length + 1),
      date: body.date ?? new Date().toISOString().slice(0, 10),
      description: body.description ?? '',
      status: 'DRAFT',
      lines: Array.isArray(body.lines)
        ? body.lines.map((l) => ({
            accountId: l.accountId,
            accountCode: '',
            accountName: '',
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          }))
        : [],
      createdAt: new Date().toISOString(),
    };
    mockEntries = [...mockEntries, entry];
    res.status(201).json({ journalEntry: entry });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    let debitSum = 0;
    let creditSum = 0;
    for (const l of linesIn) {
      debitSum += Number(l.debit) || 0;
      creditSum += Number(l.credit) || 0;
    }
    if (linesIn.length > 0 && Math.abs(debitSum - creditSum) > 0.005) {
      res.status(400).json({ error: 'Debits must equal credits' });
      return;
    }

    const d = body.date ? new Date(body.date) : new Date();

    const period = d.getMonth() + 1;
    const year = d.getFullYear();

    const entry = await prisma.$transaction(async (tx) => {
      const je = await tx.journalEntry.create({
        data: {
          companyId: company.id,
          date: d,
          description: body.description ?? '',
          status: 'DRAFT',
          period,
          year,
          createdBy: 'app',
          lines: {
            create: linesIn.map((l) => ({
              accountId: l.accountId,
              debit: (Number(l.debit) || 0) > 0 ? Number(l.debit) : null,
              credit: (Number(l.credit) || 0) > 0 ? Number(l.credit) : null,
            })),
          },
        },
        include: {
          lines: { include: { account: true } },
        },
      });
      return je;
    });

    res.status(201).json({ journalEntry: serializeJe(entry) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not create journal entry';
    console.error(e);
    res.status(400).json({ error: msg });
  }
});

/** DRAFT → PENDING_APPROVAL */
router.post('/:id/submit', async (req, res) => {
  if (!useDatabase()) {
    res.status(400).json({ error: 'Submit for approval requires database' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!row) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    if (row.status !== EntryStatus.DRAFT) {
      res.status(400).json({ error: 'Only draft entries can be submitted' });
      return;
    }
    const updated = await prisma.journalEntry.update({
      where: { id: row.id },
      data: { status: EntryStatus.PENDING_APPROVAL },
      include: { lines: { include: { account: true } } },
    });
    res.json({ journalEntry: serializeJe(updated) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not submit' });
  }
});

/** PENDING_APPROVAL → APPROVED */
router.post('/:id/approve', async (req, res) => {
  if (!useDatabase()) {
    res.status(400).json({ error: 'Approval requires database' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!row) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    if (row.status !== EntryStatus.PENDING_APPROVAL) {
      res.status(400).json({ error: 'Only pending entries can be approved' });
      return;
    }
    const approver = typeof req.body?.approvedBy === 'string' ? req.body.approvedBy : 'app';
    const updated = await prisma.journalEntry.update({
      where: { id: row.id },
      data: {
        status: EntryStatus.APPROVED,
        approvedBy: approver,
        approvedAt: new Date(),
      },
      include: { lines: { include: { account: true } } },
    });
    res.json({ journalEntry: serializeJe(updated) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not approve' });
  }
});

router.post('/:id/post', async (req, res) => {
  if (!useDatabase()) {
    const idx = mockEntries.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    const updated = { ...mockEntries[idx], status: 'POSTED' };
    mockEntries = mockEntries.map((e) => (e.id === updated.id ? updated : e));
    res.json({ journalEntry: updated });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const require = requireJournalApproval();

    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.journalEntry.findFirst({
        where: { id: req.params.id, companyId: company.id },
        include: { lines: { include: { account: true } } },
      });
      if (!row) {
        return { error: 404 as const, message: 'Journal entry not found' };
      }
      if (row.status === EntryStatus.POSTED) {
        return { error: 400 as const, message: 'Entry already posted' };
      }
      if (require) {
        if (row.status !== EntryStatus.APPROVED) {
          return { error: 400 as const, message: 'Entry must be approved before posting' };
        }
      } else {
        if (row.status !== EntryStatus.DRAFT && row.status !== EntryStatus.APPROVED) {
          return { error: 400 as const, message: 'Only draft or approved entries can be posted' };
        }
      }

      await assertPeriodOpen(company.id, row.date);

      const updated = await tx.journalEntry.update({
        where: { id: row.id },
        data: { status: EntryStatus.POSTED },
        include: { lines: { include: { account: true } } },
      });

      await createLedgerEntriesForJournal(tx, {
        companyId: company.id,
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

      return { entry: updated };
    });

    if ('error' in result && result.error === 404) {
      res.status(404).json({ error: result.message });
      return;
    }
    if ('error' in result && result.error === 400) {
      res.status(400).json({ error: result.message });
      return;
    }
    if ('entry' in result) {
      res.json({ journalEntry: serializeJe(result.entry) });
      return;
    }
    res.status(500).json({ error: 'Unexpected post result' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not post';
    console.error(e);
    res.status(400).json({ error: msg });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const entry = mockEntries.find((e) => e.id === req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    res.json({ journalEntry: entry });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, companyId: company.id },
      include: { lines: { include: { account: true } } },
    });
    if (!row) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    res.json({ journalEntry: serializeJe(row) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as journalEntriesRouter };
