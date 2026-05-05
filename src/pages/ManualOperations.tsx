// Manual operations mode — executive-only policy (traditional human-driven bookkeeping; disables AI CPA automation)

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, ShieldAlert } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const EXEC_ROLES = new Set(['PRESIDENT', 'CFO', 'CONTROLLER']);

export function ManualOperations() {
  const user = useAuthStore((s) => s.user);
  const canManage = Boolean(user && EXEC_ROLES.has(user.role));

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getCompany();
      if (cancelled || !res.success || !res.data) {
        setLoaded(true);
        return;
      }
      const payload = res.data as { company?: Record<string, unknown> };
      const co = payload.company;
      if (co?.id != null) setCompanyId(String(co.id));
      setManualMode(Boolean(co?.manualOperationsMode));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!companyId || !canManage) return;
    setSaving(true);
    const res = await api.patchCompanyExecutiveSettings(companyId, { manualOperationsMode: manualMode });
    setSaving(false);
    if (!res.success) {
      window.alert(
        res.error ??
          'Could not save. You must be signed in as President, CFO, or Controller, with a valid session token.'
      );
      return;
    }
    const d = res.data as { company?: { manualOperationsMode?: boolean } };
    if (typeof d.company?.manualOperationsMode === 'boolean') {
      setManualMode(d.company.manualOperationsMode);
    }
    window.alert('Manual operations setting saved.');
  };

  return (
    <ModuleWorkspace
      label="Company policy"
      title="Manual operations mode"
      description="When enabled, AI-assisted features are turned off company-wide — including AI CPA and the ERP Assistant for customer service. The product behaves like a traditional system driven by your team’s entries and forms."
      actions={
        canManage && companyId ? (
          <button
            type="button"
            disabled={saving || !loaded}
            onClick={() => void save()}
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Save policy
          </button>
        ) : null
      }
    >
      {!loaded ? (
        <p className="text-sm text-zinc-500">Loading company settings…</p>
      ) : (
        <div className="space-y-6">
          <div className="bog-statement-card border border-bog-rule p-6">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <PenLine size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-bog-ink">Traditional bookkeeping (no AI automation)</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Upper management can require that this organization use the application without AI CPA chat,
                  the ERP Assistant (orders, shipments, and clerk workflows), automated accounting review, or other
                  AI-driven assistants. Core workflows — general ledger, accounts payable and receivable, payments,
                  journals, ERP forms (purchase/sales orders, logistics), reports, and manual approvals — continue to
                  work as they would in a conventional system.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-bog-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <input
                  id="manual-mode"
                  type="checkbox"
                  checked={manualMode}
                  disabled={!canManage}
                  onChange={(e) => setManualMode(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-bog-ink focus:ring-[hsl(var(--bog-accent))]"
                />
                <label htmlFor="manual-mode" className="text-sm text-bog-ink">
                  <span className="font-medium">Enable manual operations mode</span>
                  <span className="mt-1 block text-zinc-600">
                    Disables AI CPA and automated AI review for all users. Only President, CFO, or Controller can change
                    this setting.
                  </span>
                </label>
              </div>
              {manualMode && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <ShieldAlert size={18} className="shrink-0" />
                  <span>AI automation is currently off for this company.</span>
                </div>
              )}
            </div>

            {!canManage && (
              <p className="mt-4 text-sm text-zinc-500">
                Your role can view this policy but cannot change it. Contact a President, CFO, or Controller to adjust
                manual operations mode.
              </p>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            Technical note: saving requires a signed-in session with an executive role; the server validates your JWT
            before applying changes.{' '}
            <Link to="/settings" className="text-[hsl(var(--bog-accent))] underline-offset-2 hover:underline">
              Back to Settings
            </Link>
          </p>
        </div>
      )}
    </ModuleWorkspace>
  );
}
