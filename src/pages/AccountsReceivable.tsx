// Accounts Receivable — BOG ledger workspace

import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Edit, DollarSign, Clock, AlertCircle } from 'lucide-react';
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
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

const controlClass =
  'w-full rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function AccountsReceivable() {
  const invoices: Invoice[] = [
    { id: '1', invoiceNumber: 'INV-2026-1024', customer: 'Acme Corporation', date: '2026-04-20', dueDate: '2026-05-20', amount: 5200.0, paid: 0, balance: 5200.0, status: 'SENT' },
    { id: '2', invoiceNumber: 'INV-2026-1023', customer: 'TechStart Inc', date: '2026-04-18', dueDate: '2026-05-18', amount: 12500.0, paid: 12500.0, balance: 0, status: 'PAID' },
    { id: '3', invoiceNumber: 'INV-2026-1022', customer: 'Global Ltd', date: '2026-04-15', dueDate: '2026-04-30', amount: 8900.0, paid: 5000.0, balance: 3900.0, status: 'PARTIAL' },
    { id: '4', invoiceNumber: 'INV-2026-1021', customer: 'Innovation Co', date: '2026-04-10', dueDate: '2026-04-25', amount: 3500.0, paid: 0, balance: 3500.0, status: 'OVERDUE' },
    { id: '5', invoiceNumber: 'INV-2026-1020', customer: 'Data Systems', date: '2026-04-05', dueDate: '2026-05-05', amount: 7500.0, paid: 0, balance: 7500.0, status: 'SENT' },
  ];

  const statusStyles = {
    DRAFT: 'bg-zinc-100 text-zinc-700',
    SENT: 'bg-sky-50 text-sky-800',
    PARTIAL: 'bg-amber-50 text-amber-900',
    PAID: 'bg-emerald-50 text-emerald-800',
    OVERDUE: 'bg-red-50 text-red-800',
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const summary = [
    {
      label: 'Total receivable',
      value: '$43,700',
      icon: DollarSign,
      iconBg: 'bg-bog-sheet text-bog-ink',
      valueClass: 'text-bog-ink',
    },
    {
      label: 'Current',
      value: '$18,500',
      icon: DollarSign,
      iconBg: 'bg-emerald-50 text-emerald-800',
      valueClass: 'text-emerald-800',
    },
    {
      label: '31–60 days',
      value: '$12,300',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-800',
      valueClass: 'text-amber-800',
    },
    {
      label: 'Over 60 days',
      value: '$4,200',
      icon: AlertCircle,
      iconBg: 'bg-red-50 text-red-800',
      valueClass: 'text-red-800',
    },
  ];

  return (
    <ModuleWorkspace
      label="Accounts receivable"
      title="Customer invoices"
      description="Collections and balances at a glance. Aging buckets follow statement-style clarity."
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
            to="/ar/new"
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            New invoice
          </Link>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {summary.map((card) => (
          <div key={card.label} className="bog-statement-card flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${card.iconBg}`}>
              <card.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500">{card.label}</p>
              <p className={`font-figures text-xl font-semibold tracking-tight ${card.valueClass}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bog-statement-card mb-6 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Search by invoice # or customer…" className={`pl-10 ${controlClass}`} />
        </div>
      </div>

      <div className={ledgerTableShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>Invoice #</th>
                <th className={ledgerThL}>Customer</th>
                <th className={ledgerThL}>Issue date</th>
                <th className={ledgerThL}>Due date</th>
                <th className={ledgerThR}>Amount</th>
                <th className={ledgerThR}>Paid</th>
                <th className={ledgerThR}>Balance</th>
                <th className={ledgerThL}>Status</th>
                <th className={ledgerThC}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className={ledgerRow}>
                  <td className="px-4 py-3 font-figures text-sm font-semibold text-bog-ink">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-bog-ink">{invoice.customer}</td>
                  <td className="px-4 py-3 font-figures text-sm text-zinc-600">{invoice.date}</td>
                  <td className="px-4 py-3 font-figures text-sm text-zinc-600">{invoice.dueDate}</td>
                  <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{formatCurrency(invoice.amount)}</td>
                  <td className={`px-4 py-3 text-right font-figures tabular-nums text-sm text-emerald-700`}>
                    {formatCurrency(invoice.paid)}
                  </td>
                  <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{formatCurrency(invoice.balance)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-bog-sheet hover:text-bog-ink" title="View">
                        <Eye size={16} />
                      </button>
                      <button type="button" className="rounded-md p-1.5 text-zinc-400 hover:bg-bog-sheet hover:text-bog-ink" title="Edit">
                        <Edit size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
