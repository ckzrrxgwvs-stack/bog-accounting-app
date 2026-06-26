import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { Download, FileSpreadsheet, FileText, Upload } from 'lucide-react';

export function MicrosoftOfficeHub() {
  const [catalog, setCatalog] = useState<{
    excelExports: Array<{ id: string; label: string }>;
    wordTemplates: Array<{ id: string; label: string; description: string }>;
    note: string;
  } | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const res = await api.getOfficeCatalog();
      if (res.success && res.data) setCatalog(res.data);
    })();
  }, []);

  const exportExcel = async (kind: string, filename: string) => {
    setBusy(kind);
    try {
      const q =
        kind === 'trial_balance'
          ? `?month=${month}&year=${year}`
          : kind === 'journal_entries'
            ? `?startDate=${year}-${String(month).padStart(2, '0')}-01&endDate=${year}-${String(month).padStart(2, '0')}-28`
            : '';
      await api.downloadOfficeFile(`/office/excel/export/${kind}${q}`, filename);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    }
    setBusy(null);
  };

  const onFile = async (file: File) => {
    setBusy('import');
    const buf = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await api.importJournalExcel(base64, true);
    setBusy(null);
    if (!res.success) {
      setImportPreview(res.error ?? 'Import failed');
      return;
    }
    const lines = [
      `${res.data?.rowCount ?? 0} rows parsed`,
      res.data?.missingAccountCodes?.length
        ? `Missing account codes: ${res.data.missingAccountCodes.join(', ')}`
        : 'All account codes found',
      ...(res.data?.parseErrors ?? []),
    ];
    setImportPreview(lines.join('\n'));
  };

  const generateWord = async (template: string) => {
    setBusy(template);
    try {
      await api.generateWordDocument(template, {
        period: `${month}/${year}`,
        date: new Date().toLocaleDateString('en-US'),
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Generation failed');
    }
    setBusy(null);
  };

  return (
    <ModuleWorkspace
      label="Productivity"
      title="Microsoft Office hub"
      description="Export and import native .xlsx and .docx files compatible with Excel and Word. BOG is not a full spreadsheet or word processor — use Data Studio for in-app analysis and open exports in Microsoft 365 for advanced formatting."
    >
      {catalog?.note && (
        <div className="mb-6 rounded-lg border border-bog-rule bg-white px-4 py-3 text-sm text-zinc-600">{catalog.note}</div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-bog-rule bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Period month</span>
          <input
            type="number"
            min={1}
            max={12}
            className="w-20 rounded-lg border border-bog-rule px-2 py-1.5 font-figures text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Year</span>
          <input
            type="number"
            className="w-24 rounded-lg border border-bog-rule px-2 py-1.5 font-figures text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="bog-statement-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FileSpreadsheet size={20} className="text-[hsl(var(--bog-accent))]" />
            Excel export (.xlsx)
          </h2>
          <div className="space-y-2">
            {[
              { id: 'trial_balance', label: 'Trial balance', file: `trial-balance-${year}-${String(month).padStart(2, '0')}.xlsx` },
              { id: 'chart_of_accounts', label: 'Chart of accounts', file: 'chart-of-accounts.xlsx' },
              { id: 'journal_entries', label: 'Journal entries (period)', file: 'journal-entries.xlsx' },
              { id: 'journal_import_template', label: 'Journal import template', file: 'journal-import-template.xlsx' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={busy === item.id}
                onClick={() => void exportExcel(item.id, item.file)}
                className="flex w-full items-center justify-between rounded-lg border border-bog-rule px-4 py-3 text-left text-sm hover:bg-bog-sheet disabled:opacity-50"
              >
                <span>{item.label}</span>
                <Download size={16} className="text-zinc-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="bog-statement-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Upload size={20} className="text-[hsl(var(--bog-accent))]" />
            Excel import
          </h2>
          <p className="mb-3 text-sm text-zinc-600">
            Upload a .xlsx journal template. Columns: Date, Description, Account Code, Debit, Credit.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <button
            type="button"
            disabled={busy === 'import'}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-[hsl(var(--bog-accent))] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {busy === 'import' ? 'Parsing…' : 'Choose Excel file'}
          </button>
          {importPreview && (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-bog-sheet p-3 font-mono text-xs text-zinc-700">{importPreview}</pre>
          )}
        </section>

        <section className="bog-statement-card p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FileText size={20} className="text-[hsl(var(--bog-accent))]" />
            Word documents (.docx)
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            Generate legal and client-facing documents with your company name. Open in Microsoft Word for final edits, signatures, and firm letterhead.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(catalog?.wordTemplates ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busy === t.id}
                onClick={() => void generateWord(t.id)}
                className="rounded-lg border border-bog-rule px-4 py-3 text-left hover:bg-bog-sheet disabled:opacity-50"
              >
                <p className="text-sm font-medium text-bog-ink">{t.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{t.description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </ModuleWorkspace>
  );
}
