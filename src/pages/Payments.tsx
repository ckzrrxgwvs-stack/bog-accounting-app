// Cash receipts & disbursements — list with Post to GL

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BookMarked } from 'lucide-react';
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

type PayType = 'AR' | 'AP';

interface PaymentRow {
  id: string;
  date: string;
  amount: number;
  currency?: string;
  functionalAmount?: number | null;
  fxMissing?: boolean;
  method: string;
  reference: string;
  type: PayType;
  status: string;
  appliedAmount: number;
  glJournalEntryId?: string | null;
  glPostedAt?: string | null;
}

const controlClass =
  'w-full rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function Payments() {
  const { functionalCurrency, useMultiCurrency } = useCompanyFx();
  const [filter, setFilter] = useState<'all' | PayType>('all');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res =
      filter === 'all' ? await api.getPayments() : await api.getPayments({ type: filter });
    if (!res.success || !res.data) {
      setLoadError(res.error ?? 'Could not load payments');
      setPayments([]);
      setLoading(false);
      return;
    }
    const payload = res.data as { payments?: PaymentRow[] };
    setPayments(payload.payments ?? []);
    setLoadError(null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fmtFc = (amount: number) => formatMoney(amount, functionalCurrency);

  const postToGl = async (id: string) => {
    setPostingId(id);
    const res = await api.postPaymentToLedger(id);
    setPostingId(null);
    if (!res.success) {
      window.alert(
        res.error ??
          'Could not post to GL. Log in with a non–read-only role, or set SKIP_GL_AUTH=true for local dev.'
      );
      return;
    }
    const data = res.data as { journalEntryId?: string; alreadyPosted?: boolean };
    window.alert(
      data?.alreadyPosted
        ? 'Already posted to the general ledger.'
        : `Posted. Journal: ${data?.journalEntryId ?? 'ok'}`
    );
    await refresh();
  };

  const statusStyles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-900',
    PROCESSED: 'bg-emerald-50 text-emerald-800',
    VOID: 'bg-zinc-100 text-zinc-500',
  };

  return (
    <ModuleWorkspace
      label="Payments"
      title="Receipts & disbursements"
      description="Customer receipts and vendor payments. Post to the general ledger after applications are final and the period is open."
      actions={
        <>
          <div className="inline-flex rounded-lg border border-bog-rule bg-white p-0.5 text-sm shadow-sm">
            {(['all', 'AR', 'AP'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  filter === k ? 'bg-bog-ink text-white' : 'text-bog-ink hover:bg-bog-sheet'
                }`}
              >
                {k === 'all' ? 'All' : k}
              </button>
            ))}
          </div>
          <Link
            to="/ar"
            className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
          >
            <Plus size={18} className="mr-2" />
            New receipt (AR)
          </Link>
        </>
      }
    >
      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError} — showing empty list.
        </div>
      )}

      <div className="bog-statement-card mb-6 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Search by reference…" className={`pl-10 ${controlClass}`} disabled />
        </div>
      </div>

      <div className={ledgerTableShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>Reference</th>
                <th className={ledgerThL}>Date</th>
                <th className={ledgerThR}>Amount</th>
                <th className={ledgerThL}>Method</th>
                <th className={ledgerThC}>Type</th>
                <th className={ledgerThL}>Status</th>
                <th className={ledgerThR}>Applied</th>
                <th className={ledgerThL}>GL</th>
                <th className={ledgerThC}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={ledgerRow}>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Loading payments…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr className={ledgerRow}>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No payments yet. Record a receipt from Accounts Receivable or a disbursement from the payment flow.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const ccy = p.currency ?? functionalCurrency;
                  const showFx = useMultiCurrency && ccy !== functionalCurrency;
                  return (
                  <tr key={p.id} className={ledgerRow}>
                    <td className="px-4 py-3 font-figures text-sm font-semibold text-bog-ink">{p.reference}</td>
                    <td className="px-4 py-3 font-figures text-sm text-zinc-600">{p.date}</td>
                    <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>
                      <div>{formatMoney(p.amount, ccy)}</div>
                      {showFx && p.functionalAmount != null && (
                        <div className="text-[11px] text-zinc-500">≈ {fmtFc(p.functionalAmount)}</div>
                      )}
                      {showFx && p.fxMissing && (
                        <div className="text-[11px] text-amber-700">No rate</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{p.method}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          p.type === 'AR' ? 'bg-sky-50 text-sky-900' : 'bg-violet-50 text-violet-900'
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[p.status] ?? 'bg-zinc-100 text-zinc-700'}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-figures text-sm text-zinc-600 ${ledgerTdNum}`}>
                      {formatMoney(p.appliedAmount, ccy)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {p.glJournalEntryId ? (
                        <span className="text-emerald-700">Posted</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {p.status === 'PROCESSED' && (
                          <button
                            type="button"
                            disabled={!!p.glJournalEntryId || postingId === p.id}
                            onClick={() => postToGl(p.id)}
                            className="rounded-md p-1.5 text-[hsl(var(--bog-accent))] hover:bg-bog-sheet disabled:opacity-40"
                            title="Post to general ledger"
                          >
                            <BookMarked size={16} />
                          </button>
                        )}
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
