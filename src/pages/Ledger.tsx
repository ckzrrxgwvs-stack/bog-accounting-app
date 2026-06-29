// General Ledger — journal entries (BOG ledger workspace)

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, ChevronRight, Eye, Edit, Trash2 } from 'lucide-react';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerThR,
  ledgerThC,
  ledgerTdNum,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { formatMoney, useCompanyFx } from '@/hooks/useCompanyFx';
import { CellStyleGallery } from '@/components/dataStudio/CellStyleGallery';
import { useCellStyles } from '@/hooks/useCellStyles';
import { cn } from '@/lib/utils';

interface JournalEntryRow {
  id: string;
  entryNumber: number;
  date: string;
  description: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
}

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function Ledger() {
  const location = useLocation();
  const navigate = useNavigate();
  const { functionalCurrency, useMultiCurrency } = useCompanyFx();
  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('4');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ledgerScope = `ledger-entries:${selectedYear}-${selectedPeriod}`;
  const cellStyles = useCellStyles(ledgerScope);

  const periodRange = useMemo(() => {
    const month = Number(selectedPeriod);
    const year = Number(selectedYear);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [selectedPeriod, selectedYear]);

  useEffect(() => {
    const stateFlash = (location.state as { flash?: string } | null)?.flash;
    if (stateFlash) {
      setFlash(stateFlash);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.getJournalEntries({
        startDate: periodRange.startDate,
        endDate: periodRange.endDate,
      });
      if (cancelled) return;
      if (!res.success || !res.data) {
        setLoadError(res.error ?? 'Could not load journal entries');
        setEntries([]);
        setLoading(false);
        return;
      }
      const payload = res.data as {
        journalEntries?: {
          id: string;
          entryNumber: string;
          date: string;
          description: string;
          status: string;
          lines?: { debit: number; credit: number }[];
        }[];
      };
      const raw = payload.journalEntries ?? [];
      const mapped: JournalEntryRow[] = raw.map((je) => {
        const deb =
          je.lines?.reduce((s, l) => s + (Number(l.debit) || 0), 0) ?? 0;
        const cred =
          je.lines?.reduce((s, l) => s + (Number(l.credit) || 0), 0) ?? 0;
        return {
          id: je.id,
          entryNumber: Number(je.entryNumber) || 0,
          date: je.date,
          description: je.description,
          status: je.status,
          totalDebit: deb,
          totalCredit: cred,
        };
      });
      setEntries(mapped);
      setLoadError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [periodRange.startDate, periodRange.endDate]);

  const statusStyles: Record<string, string> = {
    DRAFT: 'bg-zinc-100 text-zinc-700',
    PENDING_APPROVAL: 'bg-sky-50 text-sky-800',
    APPROVED: 'bg-sky-50 text-sky-800',
    POSTED: 'bg-emerald-50 text-emerald-800',
    REVERSED: 'bg-amber-50 text-amber-900',
    DELETED: 'bg-zinc-100 text-zinc-400',
  };

  const formatCurrency = (amount: number) => formatMoney(amount, functionalCurrency);

  return (
    <ModuleWorkspace
      label="General ledger"
      title="Journal entries"
      description={
        useMultiCurrency
          ? `Review and post transactions. Amounts are shown in functional currency (${functionalCurrency}); subledger documents may originate in foreign currency before conversion at post time.`
          : 'Review and post transactions. Amounts use tabular alignment for quick scanning.'
      }
      actions={
        <>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={controlClass}>
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
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={controlClass}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <Link
            to="/ledger/new"
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            New entry
          </Link>
        </>
      }
    >
      {flash && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {flash}
          <button
            type="button"
            className="ml-3 text-xs font-medium underline"
            onClick={() => setFlash(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError} — showing empty list.
        </div>
      )}

      <div className="bog-statement-card mb-6">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-bog-ink"
        >
          <span className="flex items-center">
            <Filter size={16} className="mr-2 text-zinc-500" />
            Filters
          </span>
          {showFilters ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
        </button>
        {showFilters && (
          <div className="border-t border-bog-rule px-4 pb-4">
            <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Status</label>
                <select className={`w-full ${controlClass}`} disabled>
                  <option value="">All statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_APPROVAL">Pending approval</option>
                  <option value="POSTED">Posted</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Account</label>
                <select className={`w-full ${controlClass}`} disabled>
                  <option value="">All accounts</option>
                  <option value="1100">1100 — Cash</option>
                  <option value="1200">1200 — Accounts Receivable</option>
                  <option value="2100">2100 — Accounts Payable</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Search</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder="Search entries…" className={`w-full pl-10 ${controlClass}`} disabled />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bog-statement-card mb-4 border border-bog-rule p-4">
        <p className="mb-3 text-xs text-zinc-500">
          Mark entries for review — styles save in this browser for{' '}
          <strong>
            {selectedPeriod}/{selectedYear}
          </strong>
          . Click a row or cell, then pick Good, Bad, Neutral, etc.
        </p>
        <CellStyleGallery
          applyTarget={cellStyles.applyTarget}
          onApplyTargetChange={cellStyles.setApplyTarget}
          onPickStyle={cellStyles.applyToSelection}
          onClearAll={cellStyles.clearAll}
          hasSelection={cellStyles.hasSelection}
        />
      </div>

      <div className={ledgerTableShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>Entry #</th>
                <th className={ledgerThL}>Date</th>
                <th className={ledgerThL}>Description</th>
                <th className={ledgerThL}>Status</th>
                <th className={ledgerThR}>Debit</th>
                <th className={ledgerThR}>Credit</th>
                <th className={ledgerThC}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={ledgerRow}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Loading journal entries…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr className={ledgerRow}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No entries for this period.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const rowKey = entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        ledgerRow,
                        cellStyles.classForCell(rowKey),
                        cellStyles.isSelected(rowKey) &&
                          !cellStyles.selection?.colKey &&
                          'ring-1 ring-inset ring-[hsl(var(--bog-accent))]/40'
                      )}
                      onClick={() => cellStyles.setSelection({ rowKey })}
                    >
                      <td
                        className={cn(
                          'cursor-cell px-4 py-3 font-figures text-sm font-semibold text-bog-ink',
                          cellStyles.classForCell(rowKey, 'entryNumber'),
                          cellStyles.isSelected(rowKey, 'entryNumber') && 'bog-cell-selected'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cellStyles.setSelection({ rowKey, colKey: 'entryNumber' });
                        }}
                      >
                        {entry.entryNumber}
                      </td>
                      <td
                        className={cn(
                          'cursor-cell px-4 py-3 font-figures text-sm text-zinc-600',
                          cellStyles.classForCell(rowKey, 'date'),
                          cellStyles.isSelected(rowKey, 'date') && 'bog-cell-selected'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cellStyles.setSelection({ rowKey, colKey: 'date' });
                        }}
                      >
                        {entry.date}
                      </td>
                      <td
                        className={cn(
                          'cursor-cell px-4 py-3 text-sm text-bog-ink',
                          cellStyles.classForCell(rowKey, 'description'),
                          cellStyles.isSelected(rowKey, 'description') && 'bog-cell-selected'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cellStyles.setSelection({ rowKey, colKey: 'description' });
                        }}
                      >
                        {entry.description}
                      </td>
                      <td
                        className={cn(
                          'cursor-cell px-4 py-3',
                          cellStyles.classForCell(rowKey, 'status'),
                          cellStyles.isSelected(rowKey, 'status') && 'bog-cell-selected'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cellStyles.setSelection({ rowKey, colKey: 'status' });
                        }}
                      >
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[entry.status] ?? 'bg-zinc-100 text-zinc-700'}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'cursor-cell px-4 py-3 text-right',
                          ledgerTdNum,
                          cellStyles.classForCell(rowKey, 'debit'),
                          cellStyles.isSelected(rowKey, 'debit') && 'bog-cell-selected'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cellStyles.setSelection({ rowKey, colKey: 'debit' });
                        }}
                      >
                        {formatCurrency(entry.totalDebit)}
                      </td>
                      <td
                        className={cn(
                          'cursor-cell px-4 py-3 text-right',
                          ledgerTdNum,
                          cellStyles.classForCell(rowKey, 'credit'),
                          cellStyles.isSelected(rowKey, 'credit') && 'bog-cell-selected'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          cellStyles.setSelection({ rowKey, colKey: 'credit' });
                        }}
                      >
                        {formatCurrency(entry.totalCredit)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-bog-sheet hover:text-bog-ink" title="View">
                            <Eye size={16} />
                          </button>
                          <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-bog-sheet hover:text-bog-ink" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-figures text-sm text-zinc-500">
          {loading ? '—' : `Showing ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-bog-rule bg-white px-3 py-1.5 font-figures text-sm text-zinc-500 opacity-50"
            disabled
          >
            Previous
          </button>
          <button type="button" className="rounded-lg bg-bog-ink px-3 py-1.5 font-figures text-sm text-white">
            1
          </button>
          <button
            type="button"
            className="rounded-lg border border-bog-rule bg-white px-3 py-1.5 font-figures text-sm text-zinc-500 opacity-50"
            disabled
          >
            Next
          </button>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
