// Phase 1 — post opening balances as a balanced journal entry (feeds posted-JE reports).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Send } from 'lucide-react';
import api from '@/services/api';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerTdNum,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';

type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  allowPosting?: boolean;
  isActive?: boolean;
};

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

function num(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function OpeningBalances() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [debitById, setDebitById] = useState<Record<string, string>>({});
  const [creditById, setCreditById] = useState<Record<string, string>>({});
  const [asOfDate, setAsOfDate] = useState(() => {
    const y = new Date().getFullYear();
    return `${y}-01-01`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAccounts();
    if (!res.success) {
      setError(res.error ?? 'Could not load accounts');
      setAccounts([]);
      setLoading(false);
      return;
    }
    const payload = res.data as { accounts?: AccountRow[] };
    const list = Array.isArray(payload?.accounts) ? payload.accounts : [];
    const eligible = list.filter((a) => a.isActive !== false && a.allowPosting !== false);
    setAccounts(eligible);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    for (const a of accounts) {
      dr += num(debitById[a.id] ?? '');
      cr += num(creditById[a.id] ?? '');
    }
    return { debits: dr, credits: cr, balanced: Math.abs(dr - cr) < 0.005 };
  }, [accounts, debitById, creditById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lines: { accountId: string; debit: number; credit: number }[] = [];
    for (const a of accounts) {
      const d = num(debitById[a.id] ?? '');
      const c = num(creditById[a.id] ?? '');
      if (d > 0 && c > 0) {
        setError(`Account ${a.code}: enter debit or credit, not both.`);
        return;
      }
      if (d > 0) lines.push({ accountId: a.id, debit: d, credit: 0 });
      if (c > 0) lines.push({ accountId: a.id, debit: 0, credit: c });
    }

    if (lines.length === 0) {
      setError('Enter at least one non-zero amount.');
      return;
    }
    if (!totals.balanced) {
      setError(`Debits (${totals.debits.toFixed(2)}) must equal credits (${totals.credits.toFixed(2)}).`);
      return;
    }

    setSaving(true);
    const create = await api.createJournalEntry({
      date: asOfDate,
      description: 'Opening balances',
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit > 0 ? l.debit : 0,
        credit: l.credit > 0 ? l.credit : 0,
      })),
    });
    if (!create.success) {
      setSaving(false);
      setError(create.error ?? 'Could not create journal entry');
      return;
    }
    const created = create.data as { journalEntry?: { id?: string } };
    const jeId = created?.journalEntry?.id;
    if (!jeId) {
      setSaving(false);
      setError('Journal entry response missing id.');
      return;
    }
    const posted = await api.postJournalEntry(jeId);
    setSaving(false);
    if (!posted.success) {
      setError(posted.error ?? 'Created draft entry but could not post.');
      return;
    }
    setSuccess(`Opening balances posted. Journal entry ${jeId.slice(0, 8)}…`);
    setDebitById({});
    setCreditById({});
  };

  return (
    <ModuleWorkspace
      label="General ledger"
      title="Opening balances"
      description="Enter debits and credits so they balance; we create one journal entry and post it. Posted lines flow into financial reports."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          <RefreshCw size={16} />
          Refresh accounts
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {success}{' '}
          <Link to="/ledger" className="font-medium underline">
            View ledger
          </Link>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Effective date</label>
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className={controlClass} />
          </div>
          <div className="rounded-lg border border-bog-rule bg-bog-sheet px-4 py-2 text-sm">
            <span className="text-zinc-500">Debits: </span>
            <span className="font-medium text-bog-ink">{totals.debits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
            <span className="mx-2 text-zinc-300">|</span>
            <span className="text-zinc-500">Credits: </span>
            <span className="font-medium text-bog-ink">{totals.credits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
            <span className="ml-2 text-xs text-zinc-500">{totals.balanced ? '✓ Balanced' : 'Must balance to post'}</span>
          </div>
        </div>

        <div className={ledgerTableShell}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>Code</th>
                <th className={ledgerThL}>Account</th>
                <th className={ledgerThL}>Type</th>
                <th className={`${ledgerThL} text-right`}>Debit</th>
                <th className={`${ledgerThL} text-right`}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No posting accounts. Add accounts under Chart of accounts first.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className={ledgerRow}>
                    <td className={`${ledgerTdNum} px-4 py-2 font-medium`}>{a.code}</td>
                    <td className="px-4 py-2 text-bog-ink">{a.name}</td>
                    <td className="px-4 py-2 text-zinc-600">{a.type.replace(/_/g, ' ')}</td>
                    <td className={`${ledgerTdNum} px-2 py-2 text-right`}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`ml-auto block w-28 text-right ${controlClass}`}
                        value={debitById[a.id] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDebitById((prev) => ({ ...prev, [a.id]: v }));
                          if (num(v) > 0) setCreditById((prev) => ({ ...prev, [a.id]: '' }));
                        }}
                        placeholder="0"
                      />
                    </td>
                    <td className={`${ledgerTdNum} px-2 py-2 text-right`}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`ml-auto block w-28 text-right ${controlClass}`}
                        value={creditById[a.id] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCreditById((prev) => ({ ...prev, [a.id]: v }));
                          if (num(v) > 0) setDebitById((prev) => ({ ...prev, [a.id]: '' }));
                        }}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || loading || accounts.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-bog-ink px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            <Send size={16} />
            {saving ? 'Posting…' : 'Create & post opening entry'}
          </button>
        </div>
      </form>
    </ModuleWorkspace>
  );
}
