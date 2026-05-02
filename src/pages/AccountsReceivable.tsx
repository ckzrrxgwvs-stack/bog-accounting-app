// Accounts Receivable — BOG ledger workspace

import React, { useEffect, useMemo, useState } from 'react';
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
import { api } from '@/services/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: string;
}

const controlClass =
  'w-full rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function AccountsReceivable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.getInvoices('AR');
      if (cancelled) return;
      if (!res.success || !res.data) {
        setLoadError(res.error ?? 'Could not load invoices');
        setInvoices([]);
        setLoading(false);
        return;
      }
      const payload = res.data as { invoices?: Invoice[] };
      setInvoices(payload.invoices ?? []);
      setLoadError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusStyles: Record<string, string> = {
    DRAFT: 'bg-zinc-100 text-zinc-700',
    SENT: 'bg-sky-50 text-sky-800',
    PARTIAL: 'bg-amber-50 text-amber-900',
    PAID: 'bg-emerald-50 text-emerald-800',
    OVERDUE: 'bg-red-50 text-red-800',
    CANCELLED: 'bg-zinc-100 text-zinc-500',
    CFDI_PENDING: 'bg-violet-50 text-violet-800',
    CFDI_STAMPED: 'bg-emerald-50 text-emerald-900',
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const summary = useMemo(() => {
    const totalRecv = invoices.reduce((s, i) => s + i.balance, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let current = 0;
    let d31 = 0;
    let over60 = 0;
    const dayMs = 1000 * 60 * 60 * 24;
    for (const inv of invoices) {
      if (inv.balance <= 0) continue;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLate = Math.floor((today.getTime() - due.getTime()) / dayMs);
      if (daysLate < 30) current += inv.balance;
      else if (daysLate <= 60) d31 += inv.balance;
      else over60 += inv.balance;
    }
    return {
      totalRecv,
      current,
      days31to60: d31,
      over60Days: over60,
    };
  }, [invoices]);

  const summaryCards = [
    {
      label: 'Total receivable',
      value: formatCurrency(summary.totalRecv),
      icon: DollarSign,
      iconBg: 'bg-bog-sheet text-bog-ink',
      valueClass: 'text-bog-ink',
    },
    {
      label: 'Current',
      value: formatCurrency(summary.current),
      icon: DollarSign,
      iconBg: 'bg-emerald-50 text-emerald-800',
      valueClass: 'text-emerald-800',
    },
    {
      label: '31–60 days',
      value: formatCurrency(summary.days31to60),
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-800',
      valueClass: 'text-amber-800',
    },
    {
      label: 'Over 60 days',
      value: formatCurrency(summary.over60Days),
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
      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError} — showing empty list.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
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
          <input type="text" placeholder="Search by invoice # or customer…" className={`pl-10 ${controlClass}`} disabled />
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
              {loading ? (
                <tr className={ledgerRow}>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Loading invoices…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr className={ledgerRow}>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No AR invoices yet.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
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
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[invoice.status] ?? 'bg-zinc-100 text-zinc-700'}`}
                      >
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
