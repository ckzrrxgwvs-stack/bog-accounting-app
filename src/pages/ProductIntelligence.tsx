/**
 * Product intelligence — tenant feedback, allow-listed intel digest (exec), AI spec drafts (exec).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Lightbulb, Newspaper, FileCode2, RefreshCw, Trash2, Play } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const EXEC_ROLES = new Set(['PRESIDENT', 'CFO', 'CONTROLLER']);

const FEEDBACK_CATS = [
  { id: 'IMPROVEMENT_IDEA', label: 'Improvement idea' },
  { id: 'WORKFLOW_PAIN', label: 'Workflow pain' },
  { id: 'BUG', label: 'Bug / defect' },
  { id: 'PRAISE', label: 'Praise / what works' },
  { id: 'OTHER', label: 'Other' },
] as const;

export function ProductIntelligence() {
  const user = useAuthStore((s) => s.user);
  const checkPermission = useAuthStore((s) => s.checkPermission);
  const canUse = checkPermission('product_intel', 'read');
  const canSubmit = checkPermission('product_intel', 'create');
  const isExecutive = Boolean(user && EXEC_ROLES.has(user.role));

  const [tab, setTab] = useState<'feedback' | 'intel' | 'spec'>('feedback');

  const [cat, setCat] = useState<string>('IMPROVEMENT_IDEA');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mine, setMine] = useState<Record<string, unknown>[]>([]);
  const [companyFb, setCompanyFb] = useState<Record<string, unknown>[]>([]);
  const [loadingFb, setLoadingFb] = useState(false);

  const [sources, setSources] = useState<Record<string, unknown>[]>([]);
  const [digests, setDigests] = useState<Record<string, unknown>[]>([]);
  const [srcLabel, setSrcLabel] = useState('');
  const [srcUrl, setSrcUrl] = useState('');
  const [intelBusy, setIntelBusy] = useState(false);

  const [specTopic, setSpecTopic] = useState('');
  const [specCtx, setSpecCtx] = useState('');
  const [specMd, setSpecMd] = useState('');
  const [specBusy, setSpecBusy] = useState(false);

  const refreshMine = useCallback(async () => {
    setLoadingFb(true);
    const res = await api.getMyProductFeedback();
    setLoadingFb(false);
    if (!res.success || !res.data) return;
    setMine((res.data as { feedback?: Record<string, unknown>[] }).feedback ?? []);
  }, []);

  const refreshCompanyFb = useCallback(async () => {
    if (!isExecutive) return;
    const res = await api.getCompanyProductFeedback();
    if (!res.success || !res.data) return;
    setCompanyFb((res.data as { feedback?: Record<string, unknown>[] }).feedback ?? []);
  }, [isExecutive]);

  const refreshIntel = useCallback(async () => {
    if (!isExecutive) return;
    const [sRes, dRes] = await Promise.all([api.listIntelSources(), api.listIntelDigests({ limit: 60 })]);
    if (sRes.success && sRes.data) setSources((sRes.data as { sources: Record<string, unknown>[] }).sources ?? []);
    if (dRes.success && dRes.data) setDigests((dRes.data as { digests: Record<string, unknown>[] }).digests ?? []);
  }, [isExecutive]);

  useEffect(() => {
    void refreshMine();
  }, [refreshMine]);

  useEffect(() => {
    if (tab === 'intel' && isExecutive) void refreshIntel();
  }, [tab, isExecutive, refreshIntel]);

  useEffect(() => {
    if (tab === 'feedback' && isExecutive) void refreshCompanyFb();
  }, [tab, isExecutive, refreshCompanyFb]);

  const submitFeedback = async () => {
    if (!canSubmit || !body.trim()) return;
    const res = await api.submitProductFeedback({
      category: cat,
      title: title.trim() || undefined,
      body: body.trim(),
    });
    if (!res.success) {
      window.alert(res.error ?? 'Could not submit');
      return;
    }
    setBody('');
    setTitle('');
    await refreshMine();
    if (isExecutive) await refreshCompanyFb();
    window.alert('Thanks — your feedback was recorded for product planning.');
  };

  const setStatus = async (id: string, status: string) => {
    const res = await api.patchProductFeedbackStatus(id, status);
    if (!res.success) window.alert(res.error ?? 'Update failed');
    else await refreshCompanyFb();
  };

  const addSource = async () => {
    if (!srcLabel.trim() || !srcUrl.trim()) return;
    const res = await api.createIntelSource({ label: srcLabel.trim(), url: srcUrl.trim() });
    if (!res.success) window.alert(res.error ?? 'Could not add source');
    else {
      setSrcLabel('');
      setSrcUrl('');
      await refreshIntel();
    }
  };

  const delSource = async (id: string) => {
    if (!window.confirm('Remove this allow-listed feed?')) return;
    const res = await api.deleteIntelSource(id);
    if (!res.success) window.alert(res.error ?? 'Delete failed');
    else await refreshIntel();
  };

  const runDigest = async () => {
    setIntelBusy(true);
    const res = await api.runIntelDigest();
    setIntelBusy(false);
    if (!res.success) window.alert(res.error ?? 'Digest failed');
    else {
      const d = res.data as { sourcesProcessed?: number; itemsWritten?: number };
      window.alert(`Digest complete: ${d.sourcesProcessed ?? 0} sources, ${d.itemsWritten ?? 0} rows written.`);
      await refreshIntel();
    }
  };

  const runSpec = async () => {
    if (!specTopic.trim()) return;
    setSpecBusy(true);
    const res = await api.draftProductSpec(specTopic.trim(), specCtx.trim() || undefined);
    setSpecBusy(false);
    if (!res.success) window.alert(res.error ?? 'Draft failed');
    else setSpecMd((res.data as { markdown?: string }).markdown ?? '');
  };

  if (!canUse) {
    return (
      <ModuleWorkspace label="Product" title="Product intelligence" description="">
        <p className="text-sm text-zinc-500">You do not have access to this module.</p>
      </ModuleWorkspace>
    );
  }

  return (
    <ModuleWorkspace
      label="Product"
      title="Product intelligence"
      description="Improvement signals from your team, allow-listed external digest for executives, and AI-assisted developer briefs — human review always required before shipping."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('feedback')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'feedback' ? 'bg-bog-ink text-white' : 'bg-zinc-100 text-zinc-700'}`}
          >
            <Lightbulb size={16} /> Feedback
          </button>
          {isExecutive && (
            <button
              type="button"
              onClick={() => setTab('intel')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'intel' ? 'bg-bog-ink text-white' : 'bg-zinc-100 text-zinc-700'}`}
            >
              <Newspaper size={16} /> Intel digest
            </button>
          )}
          {isExecutive && (
            <button
              type="button"
              onClick={() => setTab('spec')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === 'spec' ? 'bg-bog-ink text-white' : 'bg-zinc-100 text-zinc-700'}`}
            >
              <FileCode2 size={16} /> Spec assistant
            </button>
          )}
        </div>
      }
    >
      {tab === 'feedback' && (
        <div className="space-y-8">
          {canSubmit && (
            <div className="bog-statement-card border border-bog-rule p-6">
              <h3 className="font-semibold text-bog-ink">Share an improvement signal</h3>
              <p className="mt-1 text-sm text-zinc-600">
                Stored per company for roadmap prioritization. Not legal advice and not a support SLA — use normal channels for urgent production issues.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-zinc-600">Category</span>
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                  >
                    {FEEDBACK_CATS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-zinc-600">Title (optional)</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-zinc-600">Details</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                  placeholder="What would make BOG-Pi better for your workflow?"
                />
              </label>
              <button
                type="button"
                onClick={() => void submitFeedback()}
                className="mt-4 rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Submit feedback
              </button>
            </div>
          )}

          <div className="bog-statement-card border border-bog-rule p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-bog-ink">Your submissions</h3>
              <button type="button" onClick={() => void refreshMine()} className="text-sm text-[hsl(var(--bog-accent))] hover:underline">
                <RefreshCw size={14} className="inline mr-1" />
                Refresh
              </button>
            </div>
            {loadingFb ? (
              <p className="mt-4 text-sm text-zinc-500">Loading…</p>
            ) : mine.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No submissions yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {mine.map((row) => (
                  <li key={String(row.id)} className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium text-bog-ink">{String(row.category ?? '').replace(/_/g, ' ')}</span>
                      <span className="text-xs text-zinc-500">{String(row.createdAt ?? '').slice(0, 16)}</span>
                    </div>
                    {row.title ? <p className="mt-1 font-medium">{String(row.title)}</p> : null}
                    <p className="mt-1 whitespace-pre-wrap text-zinc-700">{String(row.body ?? '')}</p>
                    <p className="mt-1 text-xs uppercase text-zinc-400">Status: {String(row.status ?? '')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isExecutive && (
            <div className="bog-statement-card border border-bog-rule p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-bog-ink">All feedback (company)</h3>
                <button
                  type="button"
                  onClick={() => void refreshCompanyFb()}
                  className="text-sm text-[hsl(var(--bog-accent))] hover:underline"
                >
                  Refresh
                </button>
              </div>
              {companyFb.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">No rows.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {companyFb.map((row) => (
                    <li key={String(row.id)} className="rounded-lg border border-zinc-100 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="font-medium">{String(row.category ?? '')}</span>
                          {row.title ? <span className="ml-2">{String(row.title)}</span> : null}
                          <p className="mt-1 whitespace-pre-wrap text-zinc-700">{String(row.body ?? '')}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {String(row.userRole ?? '')} · {String(row.createdAt ?? '').slice(0, 16)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="rounded border border-zinc-200 px-2 py-0.5 text-xs"
                            onClick={() => void setStatus(String(row.id), 'TRIAGED')}
                          >
                            Triage
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-200 px-2 py-0.5 text-xs"
                            onClick={() => void setStatus(String(row.id), 'ARCHIVED')}
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'intel' && isExecutive && (
        <div className="space-y-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Intel uses <strong>HTTPS allow-listed URLs only</strong> (no open crawling). Add reputable RSS/XML feeds your counsel permits.
            Scheduled runs: POST <code className="rounded bg-white/80 px-1">/api/product-intel/intel/run-cron</code> with{' '}
            <code className="rounded bg-white/80 px-1">x-intel-digest-secret</code> from CI (see docs).
          </div>

          <div className="bog-statement-card border border-bog-rule p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-bog-ink">Allow-listed feeds</h3>
              <button
                type="button"
                disabled={intelBusy}
                onClick={() => void runDigest()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-bog-ink px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <Play size={16} /> Run digest now
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                placeholder="Label"
                value={srcLabel}
                onChange={(e) => setSrcLabel(e.target.value)}
                className="min-w-[140px] flex-1 rounded-lg border border-bog-rule px-3 py-2 text-sm"
              />
              <input
                placeholder="https://…rss…"
                value={srcUrl}
                onChange={(e) => setSrcUrl(e.target.value)}
                className="min-w-[200px] flex-[2] rounded-lg border border-bog-rule px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void addSource()} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white">
                Add
              </button>
              <button type="button" onClick={() => void refreshIntel()} className="rounded-lg border border-bog-rule px-3 py-2 text-sm">
                Reload
              </button>
            </div>
            <ul className="mt-4 divide-y divide-zinc-100 text-sm">
              {sources.map((s) => (
                <li key={String(s.id)} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <span className="font-medium">{String(s.label)}</span>
                    <p className="text-xs text-zinc-500 break-all">{String(s.url)}</p>
                  </div>
                  <button type="button" onClick={() => void delSource(String(s.id))} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bog-statement-card border border-bog-rule p-6">
            <h3 className="font-semibold text-bog-ink">Recent digest rows</h3>
            {digests.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No digest rows yet. Add feeds and run digest.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {digests.map((d) => (
                  <li key={String(d.id)} className="rounded-lg border border-zinc-100 bg-white px-3 py-3 text-sm shadow-sm">
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
                      <span>{String((d.source as { label?: string })?.label ?? 'Source')}</span>
                      <span>{String(d.fetchedAt ?? '').slice(0, 19)}</span>
                    </div>
                    {d.title ? <p className="mt-2 font-medium text-bog-ink">{String(d.title)}</p> : null}
                    {d.summary ? (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-800">
                        {String(d.summary)}
                      </pre>
                    ) : (
                      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-zinc-600">
                        {String(d.excerpt ?? '').slice(0, 1200)}
                        {(String(d.excerpt ?? '').length > 1200 ? '…' : '')}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'spec' && isExecutive && (
        <div className="bog-statement-card border border-bog-rule p-6 space-y-4">
          <p className="text-sm text-zinc-600">
            Draft feature briefs for engineering review. Output is <strong>not</strong> approved requirements until your team accepts it.
          </p>
          <label className="block text-sm">
            <span className="text-zinc-600">Topic / hypothesis</span>
            <input
              value={specTopic}
              onChange={(e) => setSpecTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
              placeholder="e.g. Partial receive against PO with FX gain/loss preview"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600">Extra context (optional)</span>
            <textarea
              value={specCtx}
              onChange={(e) => setSpecCtx(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={specBusy}
            onClick={() => void runSpec()}
            className="rounded-lg bg-bog-ink px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {specBusy ? 'Generating…' : 'Generate markdown draft'}
          </button>
          {specMd ? (
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
              {specMd}
            </pre>
          ) : null}
        </div>
      )}
    </ModuleWorkspace>
  );
}
