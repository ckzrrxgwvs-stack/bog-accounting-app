/**
 * Agent operations — PM digest, event queue, work items, Shopify connector status (executives).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Play, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const EXEC_ROLES = new Set(['PRESIDENT', 'CFO', 'CONTROLLER']);

export function AgentOperations() {
  const user = useAuthStore((s) => s.user);
  const checkPermission = useAuthStore((s) => s.checkPermission);
  const canUse = checkPermission('agent_org', 'read');
  const isExecutive = Boolean(user && EXEC_ROLES.has(user.role));

  const [digest, setDigest] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [workItems, setWorkItems] = useState<Record<string, unknown>[]>([]);
  const [shopifyStatus, setShopifyStatus] = useState<Record<string, unknown> | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [shopifyEnabled, setShopifyEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    if (!isExecutive) return;
    const [dRes, eRes, wRes, sRes, cRes] = await Promise.all([
      api.getAgentOrgDigest(),
      api.listAgentOrgEvents({ limit: 40 }),
      api.listAgentOrgWork(),
      api.getShopifyConnectorStatus(),
      api.getCompany(),
    ]);
    if (dRes.success && dRes.data) setDigest(dRes.data as Record<string, unknown>);
    if (eRes.success && eRes.data) {
      setEvents((eRes.data as { events?: Record<string, unknown>[] }).events ?? []);
    }
    if (wRes.success && wRes.data) {
      setWorkItems((wRes.data as { workItems?: Record<string, unknown>[] }).workItems ?? []);
    }
    if (sRes.success && sRes.data) setShopifyStatus(sRes.data as Record<string, unknown>);
    if (cRes.success && cRes.data) {
      const co = (cRes.data as { company?: Record<string, unknown> }).company;
      if (co) {
        setCompanyId(String(co.id));
        setShopDomain(String(co.shopifyStoreDomain ?? ''));
        setShopifyEnabled(Boolean(co.useShopifyConnector));
      }
    }
  }, [isExecutive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runBookkeeper = async () => {
    setBusy(true);
    setMsg('');
    const res = await api.runAgentBookkeeper();
    setBusy(false);
    if (!res.success) {
      setMsg(res.error ?? 'Bookkeeper run failed');
      return;
    }
    setMsg('Bookkeeper job finished.');
    void refresh();
  };

  const saveShopify = async () => {
    if (!companyId) return;
    setBusy(true);
    const res = await api.updateCompany(companyId, {
      useShopifyConnector: shopifyEnabled,
      shopifyStoreDomain: shopDomain.trim() || null,
    });
    setBusy(false);
    if (!res.success) {
      setMsg(res.error ?? 'Could not save Shopify settings');
      return;
    }
    setMsg('Shopify settings saved.');
    void refresh();
  };

  const triageEvent = async (id: string, status: string) => {
    const res = await api.patchAgentOrgEvent(id, status);
    if (!res.success) {
      setMsg(res.error ?? 'Update failed');
      return;
    }
    void refresh();
  };

  if (!canUse) {
    return (
      <ModuleWorkspace label="Program" title="Agent operations" description="Executive access required.">
        <p className="text-sm text-zinc-600">Your role does not include agent operations.</p>
      </ModuleWorkspace>
    );
  }

  if (!isExecutive) {
    return (
      <ModuleWorkspace
        label="Program"
        title="Agent operations"
        description="Automated accounting program control plane."
      >
        <p className="text-sm text-zinc-600">
          President, CFO, or Controller can view the digest, event queue, and connector status here.
        </p>
      </ModuleWorkspace>
    );
  }

  const summary = (digest?.summary ?? {}) as Record<string, number>;

  return (
    <ModuleWorkspace
      label="Program"
      title="Agent operations"
      description="PM digest, bookkeeper queue, Controller review, Shopify connector status."
      actions={
        <>
          <button
            type="button"
            className="bog-btn-secondary inline-flex items-center gap-2"
            onClick={() => void refresh()}
            disabled={busy}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            className="bog-btn-primary inline-flex items-center gap-2"
            onClick={() => void runBookkeeper()}
            disabled={busy}
          >
            <Play size={16} />
            Run bookkeeper
          </button>
        </>
      }
    >
      {msg && <p className="mb-4 text-sm text-bog-accent">{msg}</p>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Open work', value: summary.openWorkItems ?? 0 },
          { label: 'Needs review', value: summary.eventsNeedsReview ?? 0 },
          { label: 'Awaiting bookkeeper', value: summary.eventsAwaitingBookkeeper ?? 0 },
          { label: 'Blocked', value: summary.blockedWorkItems ?? 0 },
        ].map((c) => (
          <div key={c.label} className="bog-statement-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{c.label}</p>
            <p className="mt-1 font-figures text-2xl font-bold text-bog-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-bog-ink">
          <Bot size={20} />
          Shopify connector
        </h2>
        <div className="bog-statement-card space-y-4 p-4">
          <p className="text-sm text-zinc-600">
            Webhook path:{' '}
            <code className="rounded bg-bog-sheet px-1">
              {(shopifyStatus?.webhookPath as string) ?? '/api/connectors/shopify/webhook'}
            </code>
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              HMAC secret in env:{' '}
              {shopifyStatus?.hmacSecretConfigured ? (
                <span className="text-emerald-700">configured</span>
              ) : (
                <span className="text-amber-700">set SHOPIFY_WEBHOOK_SECRET in .env</span>
              )}
            </li>
          </ul>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Store domain
              <input
                className="bog-input min-w-[240px]"
                placeholder="my-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shopifyEnabled}
                onChange={(e) => setShopifyEnabled(e.target.checked)}
              />
              Enable Shopify for this company
            </label>
            <button type="button" className="bog-btn-secondary" onClick={() => void saveShopify()} disabled={busy}>
              Save
            </button>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-bog-ink">Accounting events</h2>
        <div className="bog-statement-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bog-rule bg-bog-sheet text-left text-xs uppercase text-zinc-500">
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">External</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No events yet. Shopify webhooks or manual ingest will appear here.
                  </td>
                </tr>
              )}
              {events.map((ev) => (
                <tr key={String(ev.id)} className="border-b border-bog-rule/60">
                  <td className="px-3 py-2">{String(ev.source)}</td>
                  <td className="px-3 py-2">{String(ev.eventType)}</td>
                  <td className="px-3 py-2">{String(ev.status)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{String(ev.externalId ?? '—')}</td>
                  <td className="px-3 py-2">
                    {ev.status === 'DRAFT_READY' && (
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          title="Mark posted (after you post invoice in AR)"
                          className="text-emerald-700"
                          onClick={() => void triageEvent(String(ev.id), 'POSTED')}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          type="button"
                          title="Reject"
                          className="text-red-600"
                          onClick={() => void triageEvent(String(ev.id), 'REJECTED')}
                        >
                          <XCircle size={16} />
                        </button>
                      </span>
                    )}
                    {ev.status === 'NEEDS_REVIEW' && (
                      <AlertCircle size={16} className="text-amber-600" aria-label="Needs review" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-bog-ink">Work queue</h2>
        <div className="bog-statement-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bog-rule bg-bog-sheet text-left text-xs uppercase text-zinc-500">
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
              </tr>
            </thead>
            <tbody>
              {workItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                    No open work items.
                  </td>
                </tr>
              )}
              {workItems.map((w) => (
                <tr key={String(w.id)} className="border-b border-bog-rule/60">
                  <td className="px-3 py-2">{String(w.agentRole)}</td>
                  <td className="px-3 py-2">{String(w.title)}</td>
                  <td className="px-3 py-2">{String(w.status)}</td>
                  <td className="px-3 py-2">{String(w.priority)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ModuleWorkspace>
  );
}
