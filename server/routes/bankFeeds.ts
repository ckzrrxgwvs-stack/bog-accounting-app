import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { importBankFeedCsv, parseCsvTransactions } from '../services/bankFeedImport';

const router = Router();

router.get('/accounts', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.bankFeedAccount.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });
    res.json({
      accounts: rows.map((a) => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        accountMask: a.accountMask,
        currency: a.currency,
        transactionCount: a._count.transactions,
      })),
      useBankFeeds: company.useBankFeeds,
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/transactions', async (req, res) => {
  if (!requireDatabase(res)) return;
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.bankFeedTransaction.findMany({
      where: {
        companyId: company.id,
        ...(accountId ? { bankFeedAccountId: accountId } : {}),
      },
      orderBy: { postedDate: 'desc' },
      take: limit,
      include: { bankFeedAccount: { select: { name: true, accountMask: true } } },
    });
    res.json({
      transactions: rows.map((t) => ({
        id: t.id,
        accountId: t.bankFeedAccountId,
        accountName: t.bankFeedAccount.name,
        accountMask: t.bankFeedAccount.accountMask,
        date: t.postedDate.toISOString().slice(0, 10),
        amount: dec(t.amount),
        memo: t.memo ?? '',
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/import-csv', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    csv?: string;
    rows?: { date: string; amount: number; memo?: string }[];
    accountName?: string;
    accountMask?: string;
    institution?: string;
    dryRun?: boolean;
  };

  const accountName = typeof body.accountName === 'string' ? body.accountName.trim() : '';
  if (!accountName) {
    res.status(400).json({ error: 'accountName is required' });
    return;
  }

  let rows = Array.isArray(body.rows)
    ? body.rows.map((r) => ({
        date: String(r.date),
        amount: Number(r.amount),
        memo: typeof r.memo === 'string' ? r.memo : '',
      }))
    : [];
  if (rows.length === 0 && typeof body.csv === 'string') {
    rows = parseCsvTransactions(body.csv);
  }
  if (rows.length === 0) {
    res.status(400).json({ error: 'No valid rows — provide csv or rows array (date, amount, memo)' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const dryRun = body.dryRun !== false;
    const result = await importBankFeedCsv({
      companyId: company.id,
      accountName,
      accountMask: body.accountMask,
      institution: body.institution,
      rows,
      dryRun,
    });
    res.json({
      dryRun,
      accountId: result.accountId,
      imported: result.imported,
      skipped: result.skipped,
      previewCount: result.preview.length,
      preview: result.preview.slice(0, 10),
      hint: dryRun ? 'Set dryRun:false to commit import' : undefined,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Import failed' });
  }
});

export { router as bankFeedsRouter };
