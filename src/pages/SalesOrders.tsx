import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, LayoutGrid } from 'lucide-react';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerThR,
  ledgerRow,
  ledgerTdNum,
} from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatMoney, useCompanyFx } from '@/hooks/useCompanyFx';

type SoRow = {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: string;
  currency: string;
  total: number;
};

type SoLineDetail = {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  quantityShipped: number;
  unitPrice: number;
  lineTotal: number;
  inventoryItemId: string | null;
};

type CustomerOpt = { id: string; name: string; code: string };

const SO_STATUSES = ['DRAFT', 'CONFIRMED', 'PARTIALLY_SHIPPED', 'CLOSED', 'CANCELLED'] as const;

export function SalesOrders() {
  const checkPermission = useAuthStore((s) => s.checkPermission);
  const canMutate = checkPermission('erp', 'create');
  const { functionalCurrency } = useCompanyFx();

  const [rows, setRows] = useState<SoRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ description: '', quantity: '1', unitPrice: '0' }]);

  const [shipOpen, setShipOpen] = useState<string | null>(null);
  const [shipNumber, setShipNumber] = useState('');
  const [shipDetail, setShipDetail] = useState<SoLineDetail[]>([]);
  const [shipQty, setShipQty] = useState<Record<string, string>>({});
  const [shipBusy, setShipBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [soRes, cRes] = await Promise.all([api.getSalesOrders(), api.getCustomers()]);
    setLoading(false);
    if (!soRes.success || !soRes.data) {
      setError(soRes.error ?? 'Could not load sales orders');
      setRows([]);
      return;
    }
    const list = (soRes.data as { salesOrders?: SoRow[] }).salesOrders ?? [];
    setRows(list);
    setError(null);
    if (cRes.success && cRes.data) {
      const payload = cRes.data as { customers?: CustomerOpt[] };
      setCustomers(payload.customers ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addLine = () => setLines([...lines, { description: '', quantity: '1', unitPrice: '0' }]);

  const submitSo = async () => {
    if (!customerId) {
      window.alert('Choose a customer.');
      return;
    }
    const built = lines
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      }))
      .filter((l) => l.description.length > 0);
    if (built.length === 0) {
      window.alert('Add at least one line with a description.');
      return;
    }
    const res = await api.createSalesOrder(
      {
        customerId,
        notes: notes.trim() || undefined,
        lines: built,
      },
      { idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `so-${Date.now()}` }
    );
    if (!res.success) {
      window.alert(res.error ?? 'Create failed');
      return;
    }
    setNotes('');
    setLines([{ description: '', quantity: '1', unitPrice: '0' }]);
    await refresh();
  };

  const patchStatus = async (id: string, status: string) => {
    const res = await api.patchSalesOrderStatus(id, status);
    if (!res.success) window.alert(res.error ?? 'Update failed');
    else await refresh();
  };

  const openShip = async (soId: string, soNumber: string) => {
    setShipBusy(true);
    const res = await api.getSalesOrderById(soId);
    setShipBusy(false);
    if (!res.success || !res.data) {
      window.alert(res.error ?? 'Could not load SO lines');
      return;
    }
    const payload = res.data as { salesOrder?: { lines?: SoLineDetail[] } };
    const ln = payload.salesOrder?.lines ?? [];
    setShipDetail(ln);
    setShipNumber(soNumber);
    const q: Record<string, string> = {};
    for (const l of ln) {
      const rem = Math.max(0, l.quantity - l.quantityShipped);
      q[l.id] = rem > 0 ? String(rem) : '';
    }
    setShipQty(q);
    setShipOpen(soId);
  };

  const submitShip = async () => {
    if (!shipOpen) return;
    const shipments = shipDetail
      .map((l) => ({
        lineId: l.id,
        quantity: Number(shipQty[l.id]),
      }))
      .filter((s) => Number.isFinite(s.quantity) && s.quantity > 0);
    if (shipments.length === 0) {
      window.alert('Enter a ship quantity on at least one line.');
      return;
    }
    setShipBusy(true);
    const res = await api.shipSalesOrder(shipOpen, shipments);
    setShipBusy(false);
    if (!res.success) {
      window.alert(res.error ?? 'Ship failed');
      return;
    }
    const inv = (res.data as { invoiceId?: string })?.invoiceId;
    window.alert(inv ? `Shipped. Customer invoice: ${inv}` : 'Shipped.');
    setShipOpen(null);
    await refresh();
  };

  const fmt = (n: number, ccy: string) => formatMoney(n, ccy || functionalCurrency);

  return (
    <ModuleWorkspace
      label="ERP · Sales"
      title="Sales orders"
      description="Confirm a sales order, then ship to issue inventory (SKU lines) and create a customer AR invoice linked to this order."
      actions={
        <Link
          to="/erp"
          className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          <LayoutGrid size={18} className="mr-2" />
          ERP hub
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}

      {canMutate && (
        <div className="bog-statement-card mb-8 p-4">
          <h3 className="mb-3 text-sm font-semibold text-bog-ink">New sales order</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-500">
              Customer
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink"
              >
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Notes (optional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink"
              />
            </label>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Lines</p>
            {lines.map((ln, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-12 md:items-end">
                <input
                  placeholder="Description"
                  value={ln.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], description: e.target.value };
                    setLines(next);
                  }}
                  className="md:col-span-6 rounded-lg border border-bog-rule px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={ln.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], quantity: e.target.value };
                    setLines(next);
                  }}
                  className="md:col-span-2 rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
                />
                <input
                  type="number"
                  placeholder="Unit price"
                  value={ln.unitPrice}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], unitPrice: e.target.value };
                    setLines(next);
                  }}
                  className="md:col-span-3 rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
                />
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-xs font-medium text-[hsl(var(--bog-accent))] hover:underline">
              + Add line
            </button>
          </div>
          <button
            type="button"
            onClick={() => void submitSo()}
            className="mt-4 inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            Create sales order
          </button>
        </div>
      )}

      <div className={ledgerTableShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>SO #</th>
                <th className={ledgerThL}>Customer</th>
                <th className={ledgerThL}>Date</th>
                <th className={ledgerThR}>Total</th>
                <th className={ledgerThL}>Status</th>
                {canMutate && <th className={ledgerThL}>Accounting link</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={ledgerRow}>
                  <td colSpan={canMutate ? 6 : 5} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr className={ledgerRow}>
                  <td colSpan={canMutate ? 6 : 5} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No sales orders yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className={ledgerRow}>
                    <td className="px-4 py-3 font-figures text-sm font-semibold text-bog-ink">{r.soNumber}</td>
                    <td className="px-4 py-3 text-sm text-bog-ink">{r.customerName}</td>
                    <td className="px-4 py-3 font-figures text-sm text-zinc-600">{r.orderDate}</td>
                    <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{fmt(r.total, r.currency)}</td>
                    <td className="px-4 py-3">
                      {canMutate ? (
                        <select
                          value={r.status}
                          onChange={(e) => void patchStatus(r.id, e.target.value)}
                          className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium text-bog-ink"
                        >
                          {SO_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-zinc-700">{r.status}</span>
                      )}
                    </td>
                    {canMutate && (
                      <td className="px-4 py-3">
                        {(r.status === 'CONFIRMED' || r.status === 'PARTIALLY_SHIPPED') && (
                          <button
                            type="button"
                            disabled={shipBusy}
                            onClick={() => void openShip(r.id, r.soNumber)}
                            className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium text-bog-ink hover:bg-bog-sheet disabled:opacity-50"
                          >
                            Ship → AR
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {shipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bog-rule bg-white p-6 shadow-xl">
            <h4 className="text-sm font-semibold text-bog-ink">Ship against {shipNumber}</h4>
            <p className="mt-2 text-xs text-zinc-600">
              Reduces on-hand for lines with inventory SKUs and posts a customer invoice (AR) for the shipped amount.
            </p>
            <div className="mt-4 space-y-3">
              {shipDetail.map((l) => {
                const rem = Math.max(0, l.quantity - l.quantityShipped);
                return (
                  <div key={l.id} className="rounded-lg border border-bog-rule p-3 text-sm">
                    <p className="font-medium text-bog-ink">
                      Line {l.lineNumber}: {l.description}
                    </p>
                    <p className="mt-1 font-figures text-xs text-zinc-500">
                      Open: {rem.toFixed(4)} · Unit {fmt(l.unitPrice, functionalCurrency)}
                      {l.inventoryItemId ? (
                        <span className="ml-2 text-emerald-800">· Stock linked</span>
                      ) : (
                        <span className="ml-2 text-amber-800">· No SKU — AR only on this line</span>
                      )}
                    </p>
                    <label className="mt-2 block text-xs font-medium text-zinc-500">
                      Ship now
                      <input
                        type="number"
                        value={shipQty[l.id] ?? ''}
                        onChange={(e) => setShipQty((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 font-figures text-sm"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShipOpen(null)}
                className="rounded-lg border border-bog-rule px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={shipBusy}
                onClick={() => void submitShip()}
                className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Post shipment
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  );
}
