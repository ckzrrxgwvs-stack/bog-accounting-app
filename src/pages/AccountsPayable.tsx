// Accounts Payable — BOG ledger workspace

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, CheckCircle } from 'lucide-react';
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID';
}

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function AccountsPayable() {
  const [selectedStatus, setSelectedStatus] = useState('');

  const invoices: Invoice[] = [
    { id: '1', invoiceNumber: 'AP-2026-001', vendor: 'Office Depot', date: '2026-04-25', dueDate: '2026-05-25', amount: 1250.0, status: 'PENDING' },
    { id: '2', invoiceNumber: 'AP-2026-002', vendor: 'Tech Solutions', date: '2026-04-22', dueDate: '2026-05-22', amount: 3500.0, status: 'APPROVED' },
    { id: '3', invoiceNumber: 'AP-2026-003', vendor: 'Amazon Business', date: '2026-04-20', dueDate: '2026-05-20', amount: 890.5, status: 'PENDING' },
    { id: '4', invoiceNumber: 'AP-2026-004', vendor: 'Microsoft', date: '2026-04-18', dueDate: '2026-05-18', amount: 2200.0, status: 'PAID' },
    { id: '5', invoiceNumber: 'AP-2026-005', vendor: 'Electric Company', date: '2026-04-15', dueDate: '2026-04-30', amount: 450.0, status: 'DRAFT' },
  ];

  const statusStyles = {
    DRAFT: 'bg-zinc-100 text-zinc-700',
    PENDING: 'bg-amber-50 text-amber-900',
    APPROVED: 'bg-sky-50 text-sky-800',
    PAID: 'bg-emerald-50 text-emerald-800',
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <ModuleWorkspace
      label="Accounts payable"
      title="Vendor invoices"
      description="Track what you owe, due dates, and approval flow. Figures align for fast review."
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm transition-colors hover:bg-bog-sheet"
          >
            <Eye size={18} className="mr-2" />
            Aging report
          </button>
          <Link
            to="/ap/new"
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            New invoice
          </Link>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total outstanding', value: '$8,290.50', tone: 'default' as const },
          { label: 'Due this week', value: '$450.00', tone: 'default' as const },
          { label: 'Overdue', value: '$0.00', tone: 'danger' as const },
          { label: 'Approved (ready to pay)', value: '$3,500.00', tone: 'accent' as const },
        ].map((card) => (
          <div key={card.label} className="bog-statement-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{card.label}</p>
            <p
              className={`mt-1 font-figures text-2xl font-semibold tracking-tight ${
                card.tone === 'danger'
                  ? 'text-red-700'
                  : card.tone === 'accent'
                    ? 'text-[hsl(var(--bog-accent))]'
                    : 'text-bog-ink'
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bog-statement-card mb-6 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="text" placeholder="Search invoices…" className={`w-full pl-10 ${controlClass}`} />
            </div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={`sm:w-48 ${controlClass}`}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <button type="button" className="inline-flex items-center text-zinc-500 hover:text-bog-ink" aria-label="More filters">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className={ledgerTableShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>Invoice #</th>
                <th className={ledgerThL}>Vendor</th>
                <th className={ledgerThL}>Issue date</th>
                <th className={ledgerThL}>Due date</th>
                <th className={ledgerThR}>Amount</th>
                <th className={ledgerThL}>Status</th>
                <th className={ledgerThC}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                const isOverdue = daysUntilDue < 0 && invoice.status !== 'PAID';

                return (
                  <tr key={invoice.id} className={ledgerRow}>
                    <td className="px-4 py-3 font-figures text-sm font-semibold text-bog-ink">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-bog-ink">{invoice.vendor}</td>
                    <td className="px-4 py-3 font-figures text-sm text-zinc-600">{invoice.date}</td>
                    <td className="px-4 py-3 font-figures text-sm">
                      <span className={isOverdue ? 'font-medium text-red-700' : 'text-zinc-600'}>{invoice.dueDate}</span>
                      {daysUntilDue > 0 && daysUntilDue <= 7 && invoice.status !== 'PAID' && (
                        <span className="ml-2 text-xs text-amber-700">({daysUntilDue}d)</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{formatCurrency(invoice.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {invoice.status === 'PENDING' && (
                          <button type="button" className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50" title="Approve">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-bog-sheet hover:text-bog-ink" title="View">
                          <Eye size={16} />
                        </button>
                        <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-bog-sheet hover:text-bog-ink" title="Edit">
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
