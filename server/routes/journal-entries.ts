// API routes for journal entries (demo mock data)

import { Router } from 'express';

const router = Router();

type JournalLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

type JournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: 'DRAFT' | 'POSTED';
  lines: JournalLine[];
  createdAt: string;
};

let mockEntries: JournalEntry[] = [
  {
    id: 'je-1',
    entryNumber: 'JE-2026-0001',
    date: '2026-04-15',
    description: 'Record monthly rent',
    status: 'POSTED',
    createdAt: '2026-04-15T10:00:00.000Z',
    lines: [
      { accountId: '12', accountCode: '6200', accountName: 'Rent Expense', debit: 17000, credit: 0 },
      { accountId: '1', accountCode: '1100', accountName: 'Cash', debit: 0, credit: 17000 },
    ],
  },
  {
    id: 'je-2',
    entryNumber: 'JE-2026-0002',
    date: '2026-04-28',
    description: 'Customer payment on account',
    status: 'DRAFT',
    createdAt: '2026-04-28T14:30:00.000Z',
    lines: [
      { accountId: '1', accountCode: '1100', accountName: 'Cash', debit: 5200, credit: 0 },
      { accountId: '2', accountCode: '1200', accountName: 'Accounts Receivable', debit: 0, credit: 5200 },
    ],
  },
];

router.get('/', (req, res) => {
  const { startDate, endDate, status } = req.query;
  let list = [...mockEntries];

  if (status) {
    list = list.filter(e => e.status === status);
  }
  if (startDate) {
    list = list.filter(e => e.date >= String(startDate));
  }
  if (endDate) {
    list = list.filter(e => e.date <= String(endDate));
  }

  res.json({ journalEntries: list });
});

router.get('/:id', (req, res) => {
  const entry = mockEntries.find(e => e.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Journal entry not found' });
    return;
  }
  res.json({ journalEntry: entry });
});

router.post('/', (req, res) => {
  const body = req.body as Partial<JournalEntry>;
  const id = `je-${mockEntries.length + 1}`;
  const entry: JournalEntry = {
    id,
    entryNumber: body.entryNumber ?? `JE-2026-${String(mockEntries.length + 1).padStart(4, '0')}`,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    description: body.description ?? '',
    status: 'DRAFT',
    lines: Array.isArray(body.lines) ? body.lines : [],
    createdAt: new Date().toISOString(),
  };
  mockEntries = [...mockEntries, entry];
  res.status(201).json({ journalEntry: entry });
});

router.post('/:id/post', (req, res) => {
  const idx = mockEntries.findIndex(e => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Journal entry not found' });
    return;
  }
  const updated = { ...mockEntries[idx], status: 'POSTED' as const };
  mockEntries = mockEntries.map(e => (e.id === updated.id ? updated : e));
  res.json({ journalEntry: updated });
});

export { router as journalEntriesRouter };
