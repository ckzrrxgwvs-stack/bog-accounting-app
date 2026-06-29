// General Ledger — create a balanced journal entry (DRAFT or post)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Send, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { formatMoney, useCompanyFx } from '@/hooks/useCompanyFx';
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

type LineRow = {
  key: string;
  accountId: string;
  debit: string;
  credit: string;
};

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

function num(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function newLine(): LineRow {
  return { key: crypto.randomUUID(), accountId: '', debit: '', credit: '' };
}

export function JournalEntryComposer() {
  const navigate = useNavigate();
  const { functionalCurrency } = useCompanyFx();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [lines, setLines] = useState<LineRow[]>(() => [newLine(), newLine()]);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAccounts();
    if (!res.success) {
      setError(res.error ?? 'Could not load chart of accounts');
      setAccounts([]);
      setLoading(false);
      return;
    }
    const payload = res.data as { accounts?: AccountRow[] };
    const list = Array.isArray(payload?.accounts) ? payload.accounts : [];
    setAccounts(list.filter((a) => a.isActive !== false && a.allowPosting !== false));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const totals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    for (const line of lines) {
      debits += num(line.debit);
      credits += num(line.credit);
    }
    return {
      debits,
      credits,
      balanced: Math.abs(debits - credits) < 0.005,
      diff: debits - credits,
    };
  }, [lines]);

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.key !== key)));
  };

  const buildPayloadLines = (): { accountId: string; debit: number; credit: number }[] | null => {
    const out: { accountId: string; debit: number; credit: number }[] = [];
    for (const line of lines) {
      const d = num(line.debit);
      const c = num(line.credit);
      if (d === 0 && c === 0) continue;
      if (!line.accountId) {
        setError('Each line with an amount must have an account selected.');
        return null;
      }
      if (d > 0 && c > 0) {
        setError('Enter debit or credit on each line, not both.');
        return null;
      }
      out.push({
        accountId: line.accountId,
        debit: d > 0 ? d : 0,
        credit: c > 0 ? c : 0,
      });
    }
    if (out.length === 0) {
      setError('Enter at least one line with a debit or credit amount.');
      return null;
    }
    if (!totals.balanced) {
      setError(
        `Debits (${formatMoney(totals.debits, functionalCurrency)}) must equal credits (${formatMoney(totals.credits, functionalCurrency)}).`
      );
      return null;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return null;
    }
    return out;
  };

  const saveEntry = async (andPost: boolean) => {
    setError(null);
    const payloadLines = buildPayloadLines();
    if (!payloadLines) return;

    setSaving(true);
    const create = await api.createJournalEntry({
      date: entryDate,
      description: description.trim(),
      reference: reference.trim() || undefined,
      lines: payloadLines,
    });
    if (!create.success) {
      setSaving(false);
      setError(create.error ?? 'Could not create journal entry');
      return;
    }
    const created = create.data as { journalEntry?: { id?: string; entryNumber?: string } };
    const jeId = created?.journalEntry?.id;
    const entryNumber = created?.journalEntry?.entryNumber;
    if (!jeId) {
      setSaving(false);
      setError('Journal entry response missing id.');
      return;
    }

    if (!andPost) {
      setSaving(false);
      navigate('/ledger', {
        replace: true,
        state: {
          flash: `Journal entry #${entryNumber ?? '—'} saved as DRAFT.`,
        },
      });
      return;
    }

    const posted = await api.postJournalEntry(jeId);
    setSaving(false);
    if (!posted.success) {
      setError(
        posted.error ??
          `Entry #${entryNumber ?? jeId.slice(0, 8)} saved as DRAFT but could not post. Open the ledger to post manually.`
      );
      return;
    }
    navigate('/ledger', {
      replace: true,
      state: {
        flash: `Journal entry #${entryNumber ?? '—'} posted to the general ledger.`,
      },
    });
  };

  const fmt = (amount: number) => formatMoney(amount, functionalCurrency);

  return (
    <ModuleWorkspace
      label="General ledger"
      title="New journal entry"
      description="Enter a balanced set of debits and credits. Save as draft for review, or post when the period is open and amounts balance."
      actions={
        <Link
          to="/ledger"
          className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to ledger
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading chart of accounts…</p>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No posting accounts found.{' '}
          <Link to="/ledger/coa" className="font-medium underline">
            Add accounts in Chart of accounts
          </Link>{' '}
          first.
        </div>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEntry(false);
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={`w-full ${controlClass}`}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full ${controlClass}`}
                placeholder="e.g. Monthly rent accrual"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Reference (optional)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={`w-full max-w-md ${controlClass}`}
                placeholder="Check #, memo, external id"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-lg border border-bog-rule bg-bog-sheet px-4 py-2 text-sm">
              <span className="text-zinc-500">Debits: </span>
              <span className="font-medium text-bog-ink">{fmt(totals.debits)}</span>
              <span className="mx-2 text-zinc-300">|</span>
              <span className="text-zinc-500">Credits: </span>
              <span className="font-medium text-bog-ink">{fmt(totals.credits)}</span>
              <span className="ml-2 text-xs text-zinc-500">
                {totals.balanced ? '✓ Balanced' : `Off by ${fmt(Math.abs(totals.diff))}`}
              </span>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
            >
              <Plus size={16} className="mr-1.5" />
              Add line
            </button>
          </div>

          <div className={ledgerTableShell}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className={ledgerHeadRow}>
                    <th className={ledgerThL}>Account</th>
                    <th className={`${ledgerThL} text-right`}>Debit</th>
                    <th className={`${ledgerThL} text-right`}>Credit</th>
                    <th className={`${ledgerThL} w-12`} />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className={ledgerRow}>
                      <td className="px-3 py-2">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(line.key, { accountId: e.target.value })}
                          className={`w-full min-w-[220px] ${controlClass}`}
                        >
                          <option value="">Select account…</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${ledgerTdNum} px-2 py-2 text-right`}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`ml-auto block w-32 text-right ${controlClass}`}
                          value={line.debit}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateLine(line.key, { debit: v, credit: num(v) > 0 ? '' : line.credit });
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td className={`${ledgerTdNum} px-2 py-2 text-right`}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`ml-auto block w-32 text-right ${controlClass}`}
                          value={line.credit}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateLine(line.key, { credit: v, debit: num(v) > 0 ? '' : line.debit });
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length <= 2}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Remove line"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-bog-rule bg-bog-sheet/80 font-medium">
                    <td className="px-4 py-3 text-right text-zinc-600">Totals</td>
                    <td className={`${ledgerTdNum} px-4 py-3 text-right text-bog-ink`}>{fmt(totals.debits)}</td>
                    <td className={`${ledgerTdNum} px-4 py-3 text-right text-bog-ink`}>{fmt(totals.credits)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/ledger" className={controlClass}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !totals.balanced}
              className="inline-flex items-center gap-2 rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              disabled={saving || !totals.balanced}
              onClick={() => void saveEntry(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
            >
              <Send size={16} />
              {saving ? 'Posting…' : 'Save & post'}
            </button>
          </div>
        </form>
      )}
    </ModuleWorkspace>
  );
}
