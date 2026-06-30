// AR / AP — create a draft invoice (single-line for Face I)

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { useCompanyFx } from '@/hooks/useCompanyFx';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';

type PartyRow = { id: string; name: string; code?: string };

export type InvoiceComposerVariant = 'AR' | 'AP';

const CONFIG: Record<
  InvoiceComposerVariant,
  {
    label: string;
    title: string;
    description: string;
    listPath: string;
    partyLabel: string;
    invoiceType: 'AR_INVOICE' | 'AP_INVOICE';
    masterPath: string;
    masterName: string;
  }
> = {
  AR: {
    label: 'Accounts receivable',
    title: 'New customer invoice',
    description: 'Create a draft receivable. Post to the general ledger when ready from the invoice list.',
    listPath: '/ar',
    partyLabel: 'Customer',
    invoiceType: 'AR_INVOICE',
    masterPath: '/master/customers',
    masterName: 'Customers',
  },
  AP: {
    label: 'Accounts payable',
    title: 'New vendor invoice',
    description: 'Create a draft payable. Approve and post to the general ledger from the invoice list.',
    listPath: '/ap',
    partyLabel: 'Vendor',
    invoiceType: 'AP_INVOICE',
    masterPath: '/master/vendors',
    masterName: 'Vendors',
  },
};

const controlClass =
  'rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function InvoiceComposer({ variant }: { variant: InvoiceComposerVariant }) {
  const cfg = CONFIG[variant];
  const navigate = useNavigate();
  const { functionalCurrency, useMultiCurrency } = useCompanyFx();

  const [parties, setParties] = useState<PartyRow[]>([]);
  const [partyId, setPartyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [currency, setCurrency] = useState(functionalCurrency);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadParties = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = variant === 'AR' ? await api.getCustomers() : await api.getVendors();
    if (!res.success) {
      setError(res.error ?? `Could not load ${cfg.masterName.toLowerCase()}`);
      setParties([]);
      setLoading(false);
      return;
    }
    const key = variant === 'AR' ? 'customers' : 'vendors';
    const payload = res.data as Record<string, PartyRow[] | undefined>;
    const list = Array.isArray(payload?.[key]) ? payload[key]! : [];
    setParties(list.map((p) => ({ id: p.id, name: p.name, code: p.code })));
    setLoading(false);
  }, [variant, cfg.masterName]);

  useEffect(() => {
    void loadParties();
  }, [loadParties]);

  useEffect(() => {
    setCurrency(functionalCurrency);
  }, [functionalCurrency]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!partyId) {
      setError(`Select a ${cfg.partyLabel.toLowerCase()}.`);
      return;
    }

    setSaving(true);
    const body: Record<string, unknown> = {
      type: cfg.invoiceType,
      amount: amt,
      dueDate,
      status: 'DRAFT',
    };
    if (invoiceNumber.trim()) body.number = invoiceNumber.trim();
    if (variant === 'AR') body.customerId = partyId;
    else body.vendorId = partyId;
    if (useMultiCurrency && currency) body.currency = currency.toUpperCase();

    const res = await api.createInvoice(body);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Could not create invoice');
      return;
    }
    const created = res.data as { invoice?: { invoiceNumber?: string; number?: string } };
    const num = created?.invoice?.invoiceNumber ?? created?.invoice?.number ?? '—';
    navigate(cfg.listPath, {
      replace: true,
      state: { flash: `${cfg.partyLabel} invoice ${num} saved as DRAFT.` },
    });
  };

  return (
    <ModuleWorkspace
      label={cfg.label}
      title={cfg.title}
      description={cfg.description}
      actions={
        <Link
          to={cfg.listPath}
          className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to list
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading {cfg.masterName.toLowerCase()}…</p>
      ) : parties.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No {cfg.masterName.toLowerCase()} yet.{' '}
          <Link to={cfg.masterPath} className="font-medium underline">
            Add {cfg.masterName.toLowerCase()} first
          </Link>
          .
        </div>
      ) : (
        <form className="mx-auto max-w-lg space-y-4" onSubmit={(e) => void save(e)}>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">{cfg.partyLabel}</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className={`w-full ${controlClass}`}
              required
            >
              <option value="">Select {cfg.partyLabel.toLowerCase()}…</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ` : ''}
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Invoice # (optional)</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={`w-full ${controlClass}`}
              placeholder="Auto-generated if blank"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full ${controlClass}`}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full ${controlClass}`}
                required
              />
            </div>
          </div>

          {useMultiCurrency && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Currency</label>
              <input
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={`w-full max-w-[8rem] ${controlClass}`}
              />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Link to={cfg.listPath} className={controlClass}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </form>
      )}
    </ModuleWorkspace>
  );
}
