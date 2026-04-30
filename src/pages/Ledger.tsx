// General Ledger — journal entries (BOG ledger workspace)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

interface JournalEntryRow {
  id: string;
  entryNumber: number;
  date: string;
  description: string;
  status: 'DRAFT' | 'APPROVED' | 'POSTED';
  totalDebit: number;
  totalCredit: number;
}

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function Ledger() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('4');
  const [selectedYear, setSelectedYear] = useState('2026');

  const entries: JournalEntryRow[] = [
    { id: '1', entryNumber: 1001, date: '2026-04-28', description: 'Rent payment - April 2026', status: 'POSTED', totalDebit: 3500, totalCredit: 3500 },
    { id: '2', entryNumber: 1002, date: '2026-04-27', description: 'Sales revenue - Invoice #1024', status: 'POSTED', totalDebit: 5800, totalCredit: 5800 },
    { id: '3', entryNumber: 1003, date: '2026-04-26', description: 'Office supplies purchase', status: 'APPROVED', totalDebit: 450.5, totalCredit: 450.5 },
    { id: '4', entryNumber: 1004, date: '2026-04-25', description: 'Utilities payment - Electric', status: 'POSTED', totalDebit: 890.25, totalCredit: 890.25 },
    { id: '5', entryNumber: 1005, date: '2026-04-24', description: 'Payroll - Bi-weekly', status: 'POSTED', totalDebit: 12500, totalCredit: 12500 },
    { id: '6', entryNumber: 1006, date: '2026-04-23', description: 'Equipment purchase', status: 'DRAFT', totalDebit: 2500, totalCredit: 2500 },
  ];

  const statusStyles = {
    DRAFT: 'bg-zinc-100 text-zinc-700',
    APPROVED: 'bg-sky-50 text-sky-800',
    POSTED: 'bg-emerald-50 text-emerald-800',
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <ModuleWorkspace
      label="General ledger"
      title="Journal entries"
      description="Review and post transactions. Amounts use tabular alignment for quick scanning."
      actions={
        <>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={controlClass}>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
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
                <select className={`w-full ${controlClass}`}>
                  <option value="">All statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="POSTED">Posted</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Account</label>
                <select className={`w-full ${controlClass}`}>
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
                  <input type="text" placeholder="Search entries…" className={`w-full pl-10 ${controlClass}`} />
                </div>
              </div>
            </div>
          </div>
        )}
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
              {entries.map((entry) => (
                <tr key={entry.id} className={ledgerRow}>
                  <td className="px-4 py-3 font-figures text-sm font-semibold text-bog-ink">{entry.entryNumber}</td>
                  <td className="px-4 py-3 font-figures text-sm text-zinc-600">{entry.date}</td>
                  <td className="px-4 py-3 text-sm text-bog-ink">{entry.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{formatCurrency(entry.totalDebit)}</td>
                  <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{formatCurrency(entry.totalCredit)}</td>
                  <td className="px-4 py-3">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-figures text-sm text-zinc-500">Showing 1–6 of 6 entries</p>
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
