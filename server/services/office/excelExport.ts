import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { aggregatePostedJournalThrough } from '../journalAggregates';
import { dec } from '../../lib/serialize';

function moneyStyle(numFmt = '#,##0.00') {
  return { numFmt };
}

export async function buildTrialBalanceWorkbook(companyId: string, month: number, year: number) {
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const agg = await aggregatePostedJournalThrough(companyId, end);
  const accounts = await prisma.account.findMany({
    where: { companyId },
    orderBy: { code: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BOG Accounting';
  wb.created = new Date();
  const ws = wb.addWorksheet('Trial Balance', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = 'Trial Balance';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = `Period: ${month}/${year}`;
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };

  const header = ws.addRow(['Account Code', 'Account Name', 'Debit', 'Credit']);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
    c.border = { bottom: { style: 'thin' } };
  });

  let td = 0;
  let tc = 0;
  for (const ac of accounts) {
    const v = agg.get(ac.id) ?? { debit: 0, credit: 0 };
    if (v.debit < 0.005 && v.credit < 0.005) continue;
    const row = ws.addRow([ac.code, ac.name, v.debit, v.credit]);
    row.getCell(3).numFmt = '#,##0.00';
    row.getCell(4).numFmt = '#,##0.00';
    td += v.debit;
    tc += v.credit;
  }

  const total = ws.addRow(['', 'TOTAL', td, tc]);
  total.font = { bold: true };
  total.getCell(3).numFmt = '#,##0.00';
  total.getCell(4).numFmt = '#,##0.00';

  ws.columns = [
    { width: 14 },
    { width: 36 },
    { width: 14, style: moneyStyle() },
    { width: 14, style: moneyStyle() },
  ];

  return wb;
}

export async function buildChartOfAccountsWorkbook(companyId: string) {
  const accounts = await prisma.account.findMany({
    where: { companyId },
    orderBy: { code: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BOG Accounting';
  const ws = wb.addWorksheet('Chart of Accounts');
  const header = ws.addRow(['Code', 'Name', 'Type', 'Active']);
  header.font = { bold: true };
  for (const ac of accounts) {
    ws.addRow([ac.code, ac.name, ac.type, ac.isActive ? 'Yes' : 'No']);
  }
  ws.columns = [{ width: 12 }, { width: 40 }, { width: 22 }, { width: 10 }];
  return wb;
}

export async function buildJournalEntriesWorkbook(
  companyId: string,
  startDate: Date,
  endDate: Date
) {
  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ date: 'asc' }, { entryNumber: 'asc' }],
    include: {
      lines: { include: { account: { select: { code: true, name: true } } } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BOG Accounting';
  const ws = wb.addWorksheet('Journal Entries');
  const header = ws.addRow([
    'Entry #',
    'Date',
    'Status',
    'Description',
    'Account Code',
    'Account Name',
    'Debit',
    'Credit',
  ]);
  header.font = { bold: true };

  for (const je of entries) {
    for (const line of je.lines) {
      ws.addRow([
        je.entryNumber,
        je.date.toISOString().slice(0, 10),
        je.status,
        je.description,
        line.account.code,
        line.account.name,
        dec(line.debit as never),
        dec(line.credit as never),
      ]);
    }
  }

  ws.columns = [
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 32 },
    { width: 12 },
    { width: 28 },
    { width: 12 },
    { width: 12 },
  ];
  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function parseJournalImportWorkbook(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [] as JournalImportRow[], errors: ['Workbook has no sheets'] };

  const rows: JournalImportRow[] = [];
  const errors: string[] = [];
  const headerMap: Record<string, number> = {};

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, col) => {
        const key = String(cell.value ?? '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
        headerMap[key] = col;
      });
      return;
    }

    const dateVal = row.getCell(headerMap.date ?? 1).value;
    const desc = String(row.getCell(headerMap.description ?? headerMap.memo ?? 2).value ?? '').trim();
    const code = String(row.getCell(headerMap.account_code ?? headerMap.code ?? 3).value ?? '').trim();
    const debit = Number(row.getCell(headerMap.debit ?? 4).value ?? 0);
    const credit = Number(row.getCell(headerMap.credit ?? 5).value ?? 0);
    const date =
      dateVal instanceof Date
        ? dateVal.toISOString().slice(0, 10)
        : String(dateVal ?? '').trim();

    if (!date && !code) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${rowNumber}: invalid date`);
      return;
    }
    if (!code) {
      errors.push(`Row ${rowNumber}: account code required`);
      return;
    }
    rows.push({ date, description: desc, accountCode: code, debit, credit });
  });

  return { rows, errors };
}

export type JournalImportRow = {
  date: string;
  description: string;
  accountCode: string;
  debit: number;
  credit: number;
};

export async function buildJournalImportTemplateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Journal Import');
  ws.addRow(['Date', 'Description', 'Account Code', 'Debit', 'Credit']);
  ws.addRow(['2026-06-01', 'Opening accrual', '6100', 150.0, 0]);
  ws.addRow(['2026-06-01', 'Opening accrual', '2100', 0, 150.0]);
  ws.columns = [{ width: 12 }, { width: 32 }, { width: 14 }, { width: 12 }, { width: 12 }];
  return wb;
}
