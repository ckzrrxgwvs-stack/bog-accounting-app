// Financial reports — BOG ledger workspace

import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';

const reportTypes = [
  { id: 'income-statement', name: 'Income Statement', description: 'Revenue, expenses, and net income' },
  { id: 'balance-sheet', name: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
  { id: 'cash-flow', name: 'Cash Flow Statement', description: 'Operating, investing, and financing activities' },
  { id: 'trial-balance', name: 'Trial Balance', description: 'All accounts with debit and credit balances' },
  { id: 'ar-aging', name: 'AR Aging Report', description: 'Receivables by aging bucket' },
  { id: 'ap-aging', name: 'AP Aging Report', description: 'Payables by aging bucket' },
];

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [period, setPeriod] = useState('4');
  const [year, setYear] = useState('2026');

  const generateReport = () => {
    if (!selectedReport) return;
    alert(`Generating ${selectedReport} for period ${period}/${year}`);
  };

  const exportCsv = async () => {
    if (selectedReport !== 'trial-balance') {
      alert('CSV export is wired for Trial Balance (posted debits/credits). Select Trial Balance first.');
      return;
    }
    const r = await api.fetchTrialBalanceCsv({ month: Number(period), year: Number(year) });
    if (!r.ok) {
      alert('Could not download CSV. Ensure the API is reachable and you are logged in.');
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${year}-${period.padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModuleWorkspace
      label="Reporting"
      title="Financial reports"
      description="Pick a statement or operational report, set the period, then generate or export — figures preview in ledger style."
    >
      <div className="bog-statement-card mb-6 p-4">
        <p className="bog-section-label mb-3">Period</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Month</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={controlClass}>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={controlClass}>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
          <div className="flex items-center pb-2">
            <input type="checkbox" id="compare" className="h-4 w-4 rounded border-bog-rule text-bog-ink focus:ring-[hsl(var(--bog-accent))]/25" />
            <label htmlFor="compare" className="ml-2 text-sm text-zinc-600">
              Compare to previous period
            </label>
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
              onClick={() => setSelectedReport(report.id)}
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
              Selected: <span className="font-medium text-bog-ink">{reportTypes.find((r) => r.id === selectedReport)?.name}</span>
            </>
          ) : (
            'Select a report to generate.'
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generateReport}
            disabled={!selectedReport}
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText size={18} className="mr-2" />
            Generate
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

      <div className="bog-statement-card p-6">
        <div className="mb-4 flex flex-col gap-1 border-b border-bog-rule pb-4 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-semibold text-bog-ink">Preview · Income Statement</h2>
          <span className="font-figures text-sm text-zinc-500">April 2026 · USD</span>
        </div>
        <div className="space-y-0 font-figures text-sm tabular-nums">
          <div className="flex justify-between border-b border-bog-rule py-2.5">
            <span className="text-zinc-600">Revenue</span>
            <span className="font-medium text-bog-ink">$124,500</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2 pl-4">
            <span className="text-zinc-500">Sales revenue</span>
            <span>$120,000</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2 pl-4">
            <span className="text-zinc-500">Service revenue</span>
            <span>$4,500</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2.5">
            <span className="text-zinc-600">Cost of goods sold</span>
            <span className="font-medium">($45,200)</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2.5 font-semibold">
            <span>Gross profit</span>
            <span>$79,300</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2.5">
            <span className="text-zinc-600">Operating expenses</span>
            <span className="font-medium">($44,000)</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2 pl-4">
            <span className="text-zinc-500">Salaries & wages</span>
            <span>($25,000)</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2 pl-4">
            <span className="text-zinc-500">Rent & utilities</span>
            <span>($8,500)</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2 pl-4">
            <span className="text-zinc-500">Marketing</span>
            <span>($5,500)</span>
          </div>
          <div className="flex justify-between border-b border-bog-rule py-2 pl-4">
            <span className="text-zinc-500">Other expenses</span>
            <span>($5,000)</span>
          </div>
          <div className="bog-highlight-strip flex justify-between rounded-md py-3 pl-4 text-base font-bold text-bog-ink">
            <span>Net income</span>
            <span className="font-figures text-[hsl(var(--bog-accent))]">$35,300</span>
          </div>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
