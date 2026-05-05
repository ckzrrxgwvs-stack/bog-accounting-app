// Phase 2 master data — customers list backed by API.

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerTdNum,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';

type CustomerRow = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
};

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function Customers() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<CustomerRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getCustomers();
    if (!res.success) {
      setError(res.error ?? 'Could not load customers');
      setRows([]);
      setLoading(false);
      return;
    }
    const payload = res.data as { customers?: CustomerRow[] };
    setRows(Array.isArray(payload?.customers) ? payload.customers : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormEmail('');
    setFormPhone('');
  };

  const openEdit = (r: CustomerRow) => {
    setEditRow(r);
    setFormCode(r.code);
    setFormName(r.name);
    setFormEmail(r.email);
    setFormPhone(r.phone);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    const res = await api.createCustomer({
      code: formCode.trim() || undefined,
      name: formName.trim(),
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Could not create customer');
      return;
    }
    setShowAdd(false);
    resetForm();
    await load();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || !formName.trim()) return;
    setSaving(true);
    const res = await api.updateCustomer(editRow.id, {
      code: formCode.trim(),
      name: formName.trim(),
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Could not update customer');
      return;
    }
    setEditRow(null);
    resetForm();
    await load();
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <ModuleWorkspace
      label="Accounts receivable"
      title="Customers"
      description="Master customer list for invoicing and aging. Balances update from AR activity."
      actions={
        <>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            Add customer
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}

      <div className={ledgerTableShell}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={ledgerHeadRow}>
              <th className={ledgerThL}>Code</th>
              <th className={ledgerThL}>Name</th>
              <th className={ledgerThL}>Email</th>
              <th className={ledgerThL}>Phone</th>
              <th className={`${ledgerThL} text-right`}>Balance</th>
              <th className={`${ledgerThL} w-24`} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No customers yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={ledgerRow}>
                  <td className={`${ledgerTdNum} px-4 py-3 font-medium`}>{r.code}</td>
                  <td className="px-4 py-3 text-bog-ink">{r.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.email || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.phone || '—'}</td>
                  <td className={`${ledgerTdNum} px-4 py-3 text-right`}>{fmt(r.balance)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
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

      {(showAdd || editRow) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bog-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-bog-rule bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-bog-ink">{editRow ? 'Edit customer' : 'New customer'}</h2>
            <form onSubmit={editRow ? handleUpdate : handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Code</label>
                <input className={`w-full ${controlClass}`} value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. C-003" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Name</label>
                <input className={`w-full ${controlClass}`} value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Email</label>
                <input type="email" className={`w-full ${controlClass}`} value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Phone</label>
                <input className={`w-full ${controlClass}`} value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className={controlClass}
                  onClick={() => {
                    setShowAdd(false);
                    setEditRow(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editRow ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  );
}
