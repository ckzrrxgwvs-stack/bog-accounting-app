// Close / reopen accounting periods — guided wizard with TB check and open journal review.

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle2, AlertTriangle, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

type Preview = {
  year: number;
  period: number;
  alreadyClosed: boolean;
  closedAt: string | null;
  trialBalance: { totalDebits: number; totalCredits: number; isBalanced: boolean };
  openJournals: { id: string; entryNumber: number; date: string; description: string; status: string }[];
  canClose: boolean;
};

const STEPS = ['Select period', 'Trial balance', 'Open journals', 'Close'];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function PeriodClose() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [periods, setPeriods] = useState<{ id: string; year: number; period: number; closedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(new Date().getMonth() + 1);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    setError(null);
    const res = await api.getPeriodClosePreview(year, period);
    setPreviewLoading(false);
    if (!res.success || !res.data) {
      setError(res.error ?? 'Could not load period preview');
      setPreview(null);
      return;
    }
    setPreview(res.data);
  }, [year, period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (step >= 1) void loadPreview();
  }, [step, loadPreview]);

  const close = async () => {
    setBusy(true);
    setError(null);
    const res = await api.closePeriod(year, period, user?.email);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? 'Could not close period');
      return;
    }
    await load();
    setStep(0);
    setPreview(null);
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

  const monthName = new Date(year, period - 1, 1).toLocaleString('en-US', { month: 'long' });

  return (
    <ModuleWorkspace
      label="General ledger"
      title="Period close wizard"
      description="Validate trial balance, clear open journals, then lock the month. Closed periods block new postings dated in that month."
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

      <div className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
              i === step ? 'bg-bog-ink text-white' : i < step ? 'bg-emerald-100 text-emerald-800' : 'bg-bog-sheet text-zinc-500'
            }`}
          >
            <span className="font-figures">{i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="mb-8 grid gap-4 rounded-xl border border-bog-rule bg-white p-6 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
            <input type="number" className={`w-full ${controlClass}`} value={year} onChange={(e) => setYear(Number(e.target.value))} />
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
              onClick={() => setStep(1)}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Continue <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
          <p className="sm:col-span-4 text-sm text-zinc-500">
            Closing <strong className="text-bog-ink">{monthName} {year}</strong>
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="mb-8 rounded-xl border border-bog-rule bg-white p-6">
          <h3 className="text-lg font-semibold text-bog-ink mb-4">Trial balance check</h3>
          {previewLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : preview ? (
            <div className="space-y-4">
              {preview.alreadyClosed ? (
                <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
                  <Lock size={18} />
                  This period is already closed
                  {preview.closedAt ? ` (${new Date(preview.closedAt).toLocaleString()})` : ''}.
                </div>
              ) : preview.trialBalance.isBalanced ? (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm">
                  <CheckCircle2 size={18} />
                  Trial balance is balanced — debits {fmt(preview.trialBalance.totalDebits)} = credits{' '}
                  {fmt(preview.trialBalance.totalCredits)}.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                  <AlertTriangle size={18} />
                  Out of balance — debits {fmt(preview.trialBalance.totalDebits)} vs credits{' '}
                  {fmt(preview.trialBalance.totalCredits)}. Resolve before closing.
                </div>
              )}
            </div>
          ) : null}
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="inline-flex items-center rounded-lg border border-bog-rule px-4 py-2 text-sm">
              <ChevronLeft size={16} className="mr-1" /> Back
            </button>
            <button
              type="button"
              disabled={!preview?.trialBalance.isBalanced && !preview?.alreadyClosed}
              onClick={() => setStep(2)}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Continue <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mb-8 rounded-xl border border-bog-rule bg-white p-6">
          <h3 className="text-lg font-semibold text-bog-ink mb-4">Open journals in {monthName} {year}</h3>
          {previewLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : preview && preview.openJournals.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm">
              <CheckCircle2 size={18} />
              No draft or pending-approval journals in this period.
            </div>
          ) : preview ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm mb-4">
                <AlertTriangle size={18} />
                {preview.openJournals.length} journal(s) must be posted or removed before close.
              </div>
              <ul className="divide-y divide-bog-rule border border-bog-rule rounded-lg">
                {preview.openJournals.map((j) => (
                  <li key={j.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <span className="font-figures font-medium">#{j.entryNumber}</span> — {j.description}
                      <span className="ml-2 text-xs text-zinc-500">{j.date}</span>
                    </div>
                    <span className="text-xs font-medium uppercase text-amber-700">{j.status.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
              <Link to="/ledger" className="text-sm text-[hsl(var(--bog-accent))] hover:underline">
                Open general ledger →
              </Link>
            </div>
          ) : null}
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center rounded-lg border border-bog-rule px-4 py-2 text-sm">
              <ChevronLeft size={16} className="mr-1" /> Back
            </button>
            <button
              type="button"
              disabled={!!preview && preview.openJournals.length > 0}
              onClick={() => setStep(3)}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Continue <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mb-8 rounded-xl border border-bog-rule bg-white p-6">
          <h3 className="text-lg font-semibold text-bog-ink mb-2">Confirm close</h3>
          <p className="text-sm text-zinc-600 mb-6">
            Lock <strong>{monthName} {year}</strong>. No new journal entries dated in this month can be posted afterward.
          </p>
          {preview?.canClose ? (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm mb-6">
              <CheckCircle2 size={18} />
              Ready to close.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm mb-6">
              <AlertTriangle size={18} />
              Cannot close — resolve trial balance or open journals first.
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="inline-flex items-center rounded-lg border border-bog-rule px-4 py-2 text-sm">
              <ChevronLeft size={16} className="mr-1" /> Back
            </button>
            <button
              type="button"
              disabled={busy || !preview?.canClose}
              onClick={() => void close()}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <Lock size={16} className="mr-2" />
              {busy ? 'Closing…' : 'Close period'}
            </button>
          </div>
        </div>
      )}

      <h3 className="text-sm font-semibold text-zinc-700 mb-3">Closed periods history</h3>
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
