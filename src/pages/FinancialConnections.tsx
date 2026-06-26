import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import {
  Building2,
  CreditCard,
  Landmark,
  Link2,
  RefreshCw,
  Unplug,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BANK: <Landmark size={18} />,
  CREDIT_CARD: <CreditCard size={18} />,
  PAYPAL: <Wallet size={18} />,
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    CONNECTED: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={14} />, label: 'Connected' },
    PENDING: { cls: 'bg-amber-50 text-amber-900 border-amber-200', icon: <Clock size={14} />, label: 'Pending credentials' },
    NEEDS_REAUTH: { cls: 'bg-orange-50 text-orange-900 border-orange-200', icon: <AlertCircle size={14} />, label: 'Re-auth required' },
    DISCONNECTED: { cls: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: <Unplug size={14} />, label: 'Disconnected' },
    ERROR: { cls: 'bg-red-50 text-red-800 border-red-200', icon: <AlertCircle size={14} />, label: 'Error' },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export function FinancialConnections() {
  const [providers, setProviders] = useState<
    Array<{
      provider: string;
      label: string;
      institutionTypes: string[];
      description: string;
      liveReady: boolean;
      envKeys: string[];
    }>
  >([]);
  const [connections, setConnections] = useState<
    Array<{
      id: string;
      displayName: string;
      institutionType: string;
      provider: string;
      status: string;
      accountMask: string | null;
      lastSyncAt: string | null;
      lastError: string | null;
      transactionCount: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    provider: 'SANDBOX',
    institutionType: 'BANK',
    displayName: '',
    institutionName: '',
    accountMask: '',
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([api.getFinancialProviders(), api.getFinancialConnections()]);
    if (p.success && p.data) setProviders(p.data.providers);
    if (c.success && c.data) setConnections(c.data.connections);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const connect = async () => {
    if (!form.displayName.trim()) {
      setMessage('Display name is required.');
      return;
    }
    setBusy('connect');
    setMessage(null);
    const res = await api.connectFinancialInstitution({
      provider: form.provider,
      institutionType: form.institutionType,
      displayName: form.displayName.trim(),
      institutionName: form.institutionName.trim() || undefined,
      accountMask: form.accountMask.trim() || undefined,
    });
    setBusy(null);
    if (!res.success) {
      setMessage(res.error ?? 'Connect failed');
      return;
    }
    setMessage(res.data?.status === 'CONNECTED' ? 'Institution linked.' : 'Connection prepared — awaiting live credentials.');
    setForm((f) => ({ ...f, displayName: '', institutionName: '', accountMask: '' }));
    await reload();
  };

  const sync = async (id: string) => {
    setBusy(id);
    const res = await api.syncFinancialConnection(id);
    setBusy(null);
    if (!res.success) {
      setMessage(res.error ?? 'Sync failed');
      return;
    }
    setMessage(`Synced ${res.data?.imported ?? 0} new transactions.`);
    await reload();
  };

  const disconnect = async (id: string) => {
    setBusy(`d-${id}`);
    await api.disconnectFinancialConnection(id);
    setBusy(null);
    await reload();
  };

  return (
    <ModuleWorkspace
      label="Integrations"
      title="Financial institution connections"
      description="Link banks, credit cards, and PayPal for electronic transaction feeds. Live Plaid, MX, and PayPal OAuth activate when credentials are configured on the server."
      actions={
        <Link
          to="/settings"
          className="rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm font-medium text-bog-ink hover:bg-bog-sheet"
        >
          Integration settings
        </Link>
      }
    >
      {message && (
        <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="bog-statement-card p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-bog-ink">
            <Link2 size={20} className="text-[hsl(var(--bog-accent))]" />
            Link an institution
          </h2>
          <p className="mb-4 text-sm text-zinc-600">Choose a provider and account type. Sandbox works immediately in development.</p>

          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Provider</span>
              <select
                className="w-full rounded-lg border border-bog-rule px-3 py-2 text-sm bog-focus-accent"
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              >
                {providers.map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.label} {p.liveReady ? '' : '(credentials needed)'}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Account type</span>
              <select
                className="w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                value={form.institutionType}
                onChange={(e) => setForm((f) => ({ ...f, institutionType: e.target.value }))}
              >
                <option value="BANK">Bank account</option>
                <option value="CREDIT_CARD">Credit card</option>
                <option value="PAYPAL">PayPal</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Display name</span>
              <input
                className="w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                placeholder="e.g. Chase Operating ••4521"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Institution</span>
                <input
                  className="w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                  placeholder="Chase, Amex…"
                  value={form.institutionName}
                  onChange={(e) => setForm((f) => ({ ...f, institutionName: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Last 4</span>
                <input
                  className="w-full rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
                  placeholder="4521"
                  maxLength={4}
                  value={form.accountMask}
                  onChange={(e) => setForm((f) => ({ ...f, accountMask: e.target.value }))}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={busy === 'connect'}
              onClick={() => void connect()}
              className="w-full rounded-lg bg-[hsl(var(--bog-accent))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {busy === 'connect' ? 'Linking…' : 'Prepare connection'}
            </button>
          </div>
        </section>

        <section className="bog-statement-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-bog-ink">
            <Building2 size={20} />
            Connected accounts
          </h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-zinc-500">No connections yet. Link an institution or import CSV from Settings.</p>
          ) : (
            <ul className="divide-y divide-bog-rule">
              {connections.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{TYPE_ICONS[c.institutionType]}</span>
                      <p className="font-medium text-bog-ink">{c.displayName}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {c.provider}
                      {c.accountMask ? ` ••${c.accountMask}` : ''} · {c.transactionCount} transactions
                      {c.lastSyncAt ? ` · synced ${new Date(c.lastSyncAt).toLocaleString()}` : ''}
                    </p>
                    {c.lastError && <p className="mt-1 text-xs text-amber-800">{c.lastError}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {c.status === 'CONNECTED' && (
                      <button
                        type="button"
                        disabled={busy === c.id}
                        onClick={() => void sync(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-bog-rule px-3 py-1.5 text-xs font-medium hover:bg-bog-sheet"
                      >
                        <RefreshCw size={14} className={busy === c.id ? 'animate-spin' : ''} />
                        Sync
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === `d-${c.id}`}
                      onClick={() => void disconnect(c.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-dashed border-bog-rule bg-bog-sheet/50 p-5 text-sm text-zinc-600">
        <p className="font-medium text-bog-ink">Roadmap (Human approval for production credentials)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Plaid Link OAuth for 10,000+ US/CA institutions</li>
          <li>MX aggregation for enterprise bank feeds</li>
          <li>PayPal REST settlement import</li>
          <li>Auto-reconcile matched lines to GL cash accounts</li>
        </ul>
      </section>
    </ModuleWorkspace>
  );
}
