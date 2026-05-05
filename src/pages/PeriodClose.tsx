// Close / reopen accounting periods (blocks journal posting for dates in closed months).

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/services/api';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function PeriodClose() {
  const [periods, setPeriods] = useState<{ id: string; year: number; period: number; closedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(new Date().getMonth() + 1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getClosedPeriods();
    if (!res.success) {
      setError(res.error ?? 'Could not load periods');
      setPeriods([]);
      setLoading(false);
      return;
    }
    const payload = res.data as { periods?: typeof periods };
    setPeriods(payload.periods ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const close = async () => {
    setBusy(true);
    setError(null);
    const res = await api.closePeriod(year, period);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? 'Could not close period');
      return;
    }
    await load();
  };

  const reopen = async (y: number, p: number) => {
    setBusy(true);
    setError(null);
    const res = await api.reopenPeriod(y, p);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? 'Could not reopen');
      return;
    }
    await load();
  };

  return (
    <ModuleWorkspace
      label="General ledger"
      title="Period close"
      description="Closed periods block posting journal entries dated in that month. Set JOURNAL_REQUIRE_APPROVAL on the server to enforce draft → approval → post."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}

      <div className="mb-8 grid gap-4 rounded-xl border border-bog-rule bg-white p-6 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
          <input
            type="number"
            className={`w-full ${controlClass}`}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Month (1–12)</label>
          <input
            type="number"
            min={1}
            max={12}
            className={`w-full ${controlClass}`}
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void close()}
            className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Close period
          </button>
        </div>
      </div>

      <div className={ledgerTableShell}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={ledgerHeadRow}>
              <th className={ledgerThL}>Year</th>
              <th className={ledgerThL}>Month</th>
              <th className={ledgerThL}>Closed at</th>
              <th className={ledgerThL} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : periods.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No periods closed yet.
                </td>
              </tr>
            ) : (
              periods.map((p) => (
                <tr key={p.id} className={ledgerRow}>
                  <td className="px-4 py-3">{p.year}</td>
                  <td className="px-4 py-3">{p.period}</td>
                  <td className="px-4 py-3 text-zinc-600">{new Date(p.closedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void reopen(p.year, p.period)}
                      className="text-sm font-medium text-amber-800 underline hover:text-amber-900 disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ModuleWorkspace>
  );
}
