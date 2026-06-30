// Financial reports — live API data per ledger book.

import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Download, Loader2, Printer } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { BrandLetterhead, type BrandKitView } from '@/components/documents/BrandLetterhead';
import { api } from '@/services/api';
import {
  LEDGER_BOOK_OPTIONS,
  apiBookForLedger,
  ledgerBookMeta,
  type LedgerSwitcherKey,
} from '@/lib/ledgerBooks';

const reportTypes = [
  { id: 'income-statement', apiType: 'income_statement' as const, name: 'Income Statement', description: 'Revenue, expenses, and net income' },
  { id: 'balance-sheet', apiType: 'balance_sheet' as const, name: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
  { id: 'cash-flow', name: 'Cash Flow Statement', description: 'Operating, investing, and financing activities' },
  { id: 'trial-balance', apiType: 'trial_balance' as const, name: 'Trial Balance', description: 'All accounts with debit and credit balances' },
  { id: 'ar-aging', name: 'AR Aging Report', description: 'Receivables by aging bucket' },
  { id: 'ap-aging', name: 'AP Aging Report', description: 'Payables by aging bucket' },
];

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n < 0) return `($${s})`;
  return `$${s}`;
}

type ReportPayload = Record<string, unknown>;

function unwrapReport(res: unknown): ReportPayload {
  if (res && typeof res === 'object' && 'data' in res && (res as { data?: unknown }).data) {
    return (res as { data: ReportPayload }).data;
  }
  return (res ?? {}) as ReportPayload;
}

export function Reports() {
  const [ledger, setLedger] = useState<LedgerSwitcherKey>('commerce');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [period, setPeriod] = useState('6');
  const [year, setYear] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportPayload | null>(null);
  const [brand, setBrand] = useState<BrandKitView | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api.getDocumentBrand();
      if (res.success && res.data) {
        setBrand((res.data as { brand: BrandKitView }).brand);
      }
    })();
  }, []);

  const bookParam = apiBookForLedger(ledger);
  const bookMeta = ledgerBookMeta(ledger);

  const queryParams = useCallback(() => {
    const p: Record<string, string> = { month: period, year };
    if (bookParam) p.book = bookParam;
    return p;
  }, [period, year, bookParam]);

  const generateReport = async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = queryParams();
      let payload: ReportPayload;

      if (selectedReport === 'cash-flow') {
        const res = await api.getCashFlowReport(params);
        payload = unwrapReport(res);
      } else if (selectedReport === 'ar-aging') {
        payload = unwrapReport(await api.getArAgingReport(params));
      } else if (selectedReport === 'ap-aging') {
        payload = unwrapReport(await api.getApAgingReport(params));
      } else {
        const meta = reportTypes.find((r) => r.id === selectedReport);
        if (!meta?.apiType) throw new Error('Unknown report type');
        payload = unwrapReport(await api.getReport(meta.apiType, params));
      }
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load report');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    if (selectedReport !== 'trial-balance') {
      alert('CSV export is available for Trial Balance. Select Trial Balance first.');
      return;
    }
    const r = await api.fetchTrialBalanceCsv({
      month: Number(period),
      year: Number(year),
      book: bookParam,
    });
    if (!r.ok) {
      alert('Could not download CSV. Ensure the API is reachable and you are logged in.');
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${bookMeta.key}-${year}-${period.padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = new Date(Number(year), Number(period) - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const renderPreview = () => {
    if (loading) {
      return (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </p>
      );
    }
    if (error) {
      return <p className="text-sm text-red-600">{error}</p>;
    }
    if (!data) {
      return <p className="text-sm text-zinc-500">Select a report and click Generate to load live figures.</p>;
    }
    if (data.empty) {
      return (
        <p className="text-sm text-amber-800">
          No posted journal activity for {bookMeta.label} in {periodLabel}. Post journals in Journal entries first.
        </p>
      );
    }

    if (selectedReport === 'income-statement' && Array.isArray(data.lines)) {
      const lines = data.lines as { label: string; amount: number; isBold?: boolean; isTotal?: boolean }[];
      return (
        <div className="space-y-0 font-figures text-sm tabular-nums">
          {lines.map((line) => (
            <div
              key={line.label}
              className={`flex justify-between border-b border-bog-rule py-2.5 ${line.isBold ? 'font-semibold' : ''} ${line.isTotal ? 'bog-highlight-strip rounded-md px-2' : ''}`}
            >
              <span className={line.isBold ? 'text-bog-ink' : 'text-zinc-600'}>{line.label}</span>
              <span>{fmt(Number(line.amount))}</span>
            </div>
          ))}
        </div>
      );
    }

    if (selectedReport === 'trial-balance' && Array.isArray(data.accounts)) {
      const accounts = data.accounts as { code: string; name: string; debit: number; credit: number }[];
      const totals = data.totals as { debit: number; credit: number } | undefined;
      return (
        <div className="overflow-x-auto font-figures text-sm tabular-nums">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-bog-rule text-xs text-zinc-500">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Account</th>
                <th className="py-2 pr-4 text-right">Debit</th>
                <th className="py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.code} className="border-b border-bog-rule/60">
                  <td className="py-2 pr-4">{a.code}</td>
                  <td className="py-2 pr-4">{a.name}</td>
                  <td className="py-2 pr-4 text-right">{a.debit ? fmt(a.debit) : '—'}</td>
                  <td className="py-2 text-right">{a.credit ? fmt(a.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={2} className="py-2">
                    Totals
                  </td>
                  <td className="py-2 pr-4 text-right">{fmt(totals.debit)}</td>
                  <td className="py-2 text-right">{fmt(totals.credit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }

    if (selectedReport === 'balance-sheet') {
      const sections = [
        { title: 'Assets', rows: data.assets as { label: string; amount: number }[] },
        { title: 'Liabilities', rows: data.liabilities as { label: string; amount: number }[] },
        { title: 'Equity', rows: data.equity as { label: string; amount: number }[] },
      ];
      return (
        <div className="space-y-6 font-figures text-sm tabular-nums">
          {sections.map((sec) =>
            Array.isArray(sec.rows) && sec.rows.length > 0 ? (
              <div key={sec.title}>
                <h3 className="mb-2 font-semibold text-bog-ink">{sec.title}</h3>
                {sec.rows.map((row) => (
                  <div key={row.label} className="flex justify-between border-b border-bog-rule py-2">
                    <span className="text-zinc-600">{row.label}</span>
                    <span>{fmt(Number(row.amount))}</span>
                  </div>
                ))}
              </div>
            ) : null
          )}
        </div>
      );
    }

    if ((selectedReport === 'ar-aging' || selectedReport === 'ap-aging') && Array.isArray(data.buckets)) {
      const buckets = data.buckets as { bucket: string; amount: number }[];
      return (
        <div className="space-y-0 font-figures text-sm tabular-nums">
          {buckets.map((b) => (
            <div key={b.bucket} className="flex justify-between border-b border-bog-rule py-2.5">
              <span className="text-zinc-600">{b.bucket}</span>
              <span>{fmt(Number(b.amount))}</span>
            </div>
          ))}
        </div>
      );
    }

    return <pre className="overflow-x-auto text-xs text-zinc-600">{JSON.stringify(data, null, 2)}</pre>;
  };

  const previewTitle =
    reportTypes.find((r) => r.id === selectedReport)?.name ?? 'Report preview';

  return (
    <ModuleWorkspace
      label="Reporting"
      title="Financial reports"
      description="Live figures from posted journals — pick ledger book, period, and report type."
    >
      <div className="bog-statement-card mb-6 p-4">
        <p className="bog-section-label mb-3">Ledger book</p>
        <div className="flex flex-wrap gap-2">
          {LEDGER_BOOK_OPTIONS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                setLedger(b.key);
                setData(null);
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                ledger === b.key
                  ? 'border-[hsl(var(--bog-accent))] bg-[hsl(var(--bog-accent-muted))] shadow-sm'
                  : 'border-bog-rule bg-white hover:border-zinc-400'
              }`}
            >
              <span className="font-medium text-bog-ink">{b.label}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{b.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bog-statement-card mb-6 p-4">
        <p className="bog-section-label mb-3">Period</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Month</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={controlClass}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {new Date(2026, m - 1, 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={controlClass}>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="bog-section-label mb-3">Report types</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => {
                setSelectedReport(report.id);
                setData(null);
              }}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedReport === report.id
                  ? 'border-[hsl(var(--bog-accent))] bg-[hsl(var(--bog-accent-muted))] shadow-sm'
                  : 'border-bog-rule bg-white hover:border-zinc-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bog-sheet text-zinc-600">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-bog-ink">{report.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{report.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bog-statement-card mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          {selectedReport ? (
            <>
              <span className="font-medium text-bog-ink">{bookMeta.label}</span>
              {' · '}
              {reportTypes.find((r) => r.id === selectedReport)?.name}
              {' · '}
              {periodLabel}
            </>
          ) : (
            'Select a report to generate.'
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={!selectedReport || loading}
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <FileText size={18} className="mr-2" />}
            Generate
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm transition-colors hover:bg-bog-sheet disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={18} className="mr-2" />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm transition-colors hover:bg-bog-sheet"
          >
            <Download size={18} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div id="bog-report-print-root" className="bog-statement-card bog-print-document p-6">
        {brand && (
          <BrandLetterhead
            brand={brand}
            subtitle={`${previewTitle} · ${bookMeta.label} · ${periodLabel}`}
            className="mb-6"
          />
        )}
        <div className="mb-4 flex flex-col gap-1 border-b border-bog-rule pb-4 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-semibold text-bog-ink">{previewTitle}</h2>
          <span className="font-figures text-sm text-zinc-500">
            {bookMeta.label} · {periodLabel} · USD
          </span>
        </div>
        {renderPreview()}
      </div>
    </ModuleWorkspace>
  );
}
