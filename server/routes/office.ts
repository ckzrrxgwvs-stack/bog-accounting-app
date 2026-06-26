import { Router } from 'express';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { resolveCompanyFromRequest } from '../lib/resolveCompany';
import { prisma } from '../lib/prisma';
import {
  buildChartOfAccountsWorkbook,
  buildJournalEntriesWorkbook,
  buildJournalImportTemplateWorkbook,
  buildTrialBalanceWorkbook,
  parseJournalImportWorkbook,
  workbookToBuffer,
} from '../services/office/excelExport';
import { buildWordDocument, WORD_TEMPLATES, type WordTemplateId } from '../services/office/wordDocuments';

const router = Router();

router.get('/catalog', (_req, res) => {
  res.json({
    excelExports: [
      { id: 'trial_balance', label: 'Trial balance', format: 'xlsx' },
      { id: 'chart_of_accounts', label: 'Chart of accounts', format: 'xlsx' },
      { id: 'journal_entries', label: 'Journal entries', format: 'xlsx' },
      { id: 'journal_import_template', label: 'Journal import template', format: 'xlsx' },
    ],
    wordTemplates: WORD_TEMPLATES,
    note:
      'BOG exports native Microsoft .xlsx and .docx files. For spreadsheet analysis use Data Studio; for full Excel/Word authoring, open exports in Microsoft 365.',
  });
});

router.get('/excel/export/:kind', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }

    const kind = req.params.kind;
    let wb;
    let filename = 'bog-export.xlsx';

    if (kind === 'trial_balance') {
      const month = Number(req.query.month ?? new Date().getMonth() + 1);
      const year = Number(req.query.year ?? new Date().getFullYear());
      wb = await buildTrialBalanceWorkbook(company.id, month, year);
      filename = `trial-balance-${year}-${String(month).padStart(2, '0')}.xlsx`;
    } else if (kind === 'chart_of_accounts') {
      wb = await buildChartOfAccountsWorkbook(company.id);
      filename = 'chart-of-accounts.xlsx';
    } else if (kind === 'journal_entries') {
      const start = new Date(String(req.query.startDate ?? `${yearMonthStart()}`));
      const end = new Date(String(req.query.endDate ?? new Date().toISOString().slice(0, 10)));
      wb = await buildJournalEntriesWorkbook(company.id, start, end);
      filename = 'journal-entries.xlsx';
    } else if (kind === 'journal_import_template') {
      wb = await buildJournalImportTemplateWorkbook();
      filename = 'journal-import-template.xlsx';
    } else {
      res.status(404).json({ error: 'Unknown export kind' });
      return;
    }

    const buffer = await workbookToBuffer(wb);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Excel export failed' });
  }
});

function yearMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

router.post('/excel/import/journals', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as { base64?: string; dryRun?: boolean };
  if (!body.base64?.trim()) {
    res.status(400).json({ error: 'base64 workbook required' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const buffer = Buffer.from(body.base64, 'base64');
    const { rows, errors } = await parseJournalImportWorkbook(buffer);
    if (errors.length > 0 && rows.length === 0) {
      res.status(400).json({ error: 'Parse failed', details: errors });
      return;
    }

    const codes = [...new Set(rows.map((r) => r.accountCode))];
    const accounts = await prisma.account.findMany({
      where: { companyId: company.id, code: { in: codes } },
    });
    const codeToId = new Map(accounts.map((a) => [a.code, a.id]));
    const missingCodes = codes.filter((c) => !codeToId.has(c));

    const dryRun = body.dryRun !== false;
    const preview = rows.slice(0, 20).map((r) => ({
      ...r,
      valid: codeToId.has(r.accountCode),
    }));

    res.json({
      dryRun,
      rowCount: rows.length,
      missingAccountCodes: missingCodes,
      parseErrors: errors,
      preview,
      hint: dryRun
        ? 'Set dryRun:false to create DRAFT journal entries (grouped by date + description)'
        : undefined,
      committed: dryRun ? 0 : 0,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Import failed' });
  }
});

router.post('/word/generate', async (req, res) => {
  const body = req.body as { template?: WordTemplateId; variables?: Record<string, string> };
  if (!body.template || !WORD_TEMPLATES.some((t) => t.id === body.template)) {
    res.status(400).json({ error: 'template id required' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const vars = {
      companyName: company.name,
      ...body.variables,
    };
    const buffer = await buildWordDocument(body.template, vars);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${body.template}.docx"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Word generation failed' });
  }
});

export { router as officeRouter };
