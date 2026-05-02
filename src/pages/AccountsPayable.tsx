// Accounts Payable — BOG ledger workspace

import React, { useEffect, useMemo, useState } from 'react';
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
import { api } from '@/services/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
}

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function AccountsPayable() {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.getInvoices('AP');
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
    SENT: 'bg-amber-50 text-amber-900',
    PARTIAL: 'bg-sky-50 text-sky-800',
    PAID: 'bg-emerald-50 text-emerald-800',
    OVERDUE: 'bg-red-50 text-red-800',
    CANCELLED: 'bg-zinc-100 text-zinc-500',
    CFDI_PENDING: 'bg-violet-50 text-violet-800',
    CFDI_STAMPED: 'bg-emerald-50 text-emerald-900',
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filtered = useMemo(() => {
    if (!selectedStatus) return invoices;
    return invoices.filter((i) => i.status === selectedStatus);
  }, [invoices, selectedStatus]);

  const metrics = useMemo(() => {
    const outstanding = invoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + i.amount, 0);
    const approved = invoices.filter((i) => i.status === 'PARTIAL' || i.status === 'SENT').reduce((s, i) => s + i.amount, 0);
    return { outstanding, approved };
  }, [invoices]);

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
      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError} — showing empty list.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total outstanding', value: formatCurrency(metrics.outstanding), tone: 'default' as const },
          { label: 'Due this week', value: formatCurrency(0), tone: 'default' as const },
          { label: 'Overdue', value: formatCurrency(0), tone: 'danger' as const },
          { label: 'Approved (ready to pay)', value: formatCurrency(metrics.approved), tone: 'accent' as const },
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
              <input type="text" placeholder="Search invoices…" className={`w-full pl-10 ${controlClass}`} disabled />
            </div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={`sm:w-48 ${controlClass}`}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
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
              {loading ? (
                <tr className={ledgerRow}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Loading invoices…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className={ledgerRow}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No AP invoices yet.
                  </td>
                </tr>
              ) : (
                filtered.map((invoice) => {
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
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[invoice.status] ?? 'bg-zinc-100 text-zinc-700'}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {(invoice.status === 'SENT' || invoice.status === 'DRAFT') && (
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
