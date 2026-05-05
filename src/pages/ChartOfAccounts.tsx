// Module 1 — Chart of accounts (GAAP foundation); reads/writes via API when configured.

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search } from 'lucide-react';
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
  balance?: number;
  description?: string | null;
  isActive?: boolean;
  allowPosting?: boolean;
};

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST_OF_GOODS_SOLD'] as const;

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('ASSET');
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editAllowPosting, setEditAllowPosting] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAccounts({
      type: typeFilter || undefined,
      search: search.trim() || undefined,
      includeInactive,
    });
    if (!res.success) {
      setError(res.error ?? 'Could not load accounts');
      setAccounts([]);
      setLoading(false);
      return;
    }
    const payload = res.data as { accounts?: AccountRow[] };
    setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
    setLoading(false);
  }, [search, typeFilter, includeInactive]);

  useEffect(() => {
    void load();
    // Initial load only; filters apply via "Apply" / "Refresh"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (a: AccountRow) => {
    setEditing(a);
    setEditName(a.name);
    setEditDescription(a.description ?? '');
    setEditActive(a.isActive !== false);
    setEditAllowPosting(a.allowPosting !== false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const res = await api.updateAccount(editing.id, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      isActive: editActive,
      allowPosting: editAllowPosting,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Could not update account');
      return;
    }
    setEditing(null);
    await load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setSaving(true);
    const res = await api.createAccount({
      code: newCode.trim(),
      name: newName.trim(),
      type: newType,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Could not create account');
      return;
    }
    setShowAdd(false);
    setNewCode('');
    setNewName('');
    setNewType('ASSET');
    await load();
  };

  return (
    <ModuleWorkspace
      label="General ledger"
      title="Chart of accounts"
      description="Foundation for GAAP workflows: account numbers, names, and types. Balances roll up from posted activity in later modules."
      actions={
        <>
          <button
            type="button"
            onClick={() => void load()}
            className={`inline-flex items-center gap-2 rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            Add account
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
          <span className="mt-1 block text-xs text-amber-800">
            Ensure <code className="rounded bg-amber-100 px-1">VITE_API_URL</code> points to your API and{' '}
            <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> is set on the server for persistence.
          </span>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code or name…"
              className={`w-full pl-10 ${controlClass}`}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`w-full ${controlClass}`}>
            <option value="">All types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <label className="mb-1 flex cursor-pointer items-center gap-2 self-end text-sm text-bog-ink sm:mb-0">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-bog-rule"
          />
          Show inactive
        </label>
        <button type="button" onClick={() => void load()} className={`self-end sm:self-auto ${controlClass}`}>
          Apply
        </button>
      </div>

      <div className={ledgerTableShell}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={ledgerHeadRow}>
              <th className={ledgerThL}>Code</th>
              <th className={ledgerThL}>Name</th>
              <th className={ledgerThL}>Type</th>
              <th className={`${ledgerThL} text-right`}>Balance</th>
              <th className={`${ledgerThL} w-24`} />
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
                  No accounts found.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr
                  key={a.id}
                  className={`${ledgerRow} ${a.isActive === false ? 'opacity-50' : ''}`}
                >
                  <td className={`${ledgerTdNum} px-4 py-3 text-left font-medium`}>{a.code}</td>
                  <td className="px-4 py-3 text-bog-ink">
                    {a.name}
                    {a.isActive === false && (
                      <span className="ml-2 text-xs font-normal text-amber-700">(inactive)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{a.type.replace(/_/g, ' ')}</td>
                  <td className={`${ledgerTdNum} px-4 py-3 text-right text-zinc-500`}>
                    {(a.balance ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="inline-flex items-center gap-1 rounded-lg border border-bog-rule px-2 py-1 text-xs font-medium text-bog-ink hover:bg-bog-sheet"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bog-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-bog-rule bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-bog-ink">Edit account {editing.code}</h2>
            <p className="mt-1 text-sm text-zinc-500">Code and type are fixed after creation; adjust name, notes, and status.</p>
            <form onSubmit={(e) => void handleEditSave(e)} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Name</label>
                <input className={`w-full ${controlClass}`} value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
                <input className={`w-full ${controlClass}`} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-bog-ink">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-bog-ink">
                <input type="checkbox" checked={editAllowPosting} onChange={(e) => setEditAllowPosting(e.target.checked)} />
                Allow posting
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={controlClass} onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bog-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-bog-rule bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-bog-ink">New account</h2>
            <p className="mt-1 text-sm text-zinc-500">Unique code per company; type follows GAAP categories.</p>
            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Code</label>
                <input
                  className={`w-full ${controlClass}`}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. 6150"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Name</label>
                <input
                  className={`w-full ${controlClass}`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
                <select className={`w-full ${controlClass}`} value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={controlClass} onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  );
}
