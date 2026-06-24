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

type PoRow = {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  status: string;
  currency: string;
  total: number;
};

type PoLineDetail = {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
  inventoryItemId: string | null;
};

type VendorOpt = { id: string; name: string; code: string };

const PO_STATUSES = ['DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED'] as const;

export function PurchaseOrders() {
  const checkPermission = useAuthStore((s) => s.checkPermission);
  const canMutate = checkPermission('erp', 'create');
  const { functionalCurrency } = useCompanyFx();

  const [rows, setRows] = useState<PoRow[]>([]);
  const [vendors, setVendors] = useState<VendorOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vendorId, setVendorId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ description: '', quantity: '1', unitCost: '0' }]);

  const [receiveOpen, setReceiveOpen] = useState<string | null>(null);
  const [receiveNumber, setReceiveNumber] = useState('');
  const [receiveDetail, setReceiveDetail] = useState<PoLineDetail[]>([]);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveBusy, setReceiveBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [poRes, vRes] = await Promise.all([api.getPurchaseOrders(), api.getVendors()]);
    setLoading(false);
    if (!poRes.success || !poRes.data) {
      setError(poRes.error ?? 'Could not load purchase orders');
      setRows([]);
      return;
    }
    const list = (poRes.data as { purchaseOrders?: PoRow[] }).purchaseOrders ?? [];
    setRows(list);
    setError(null);
    if (vRes.success && vRes.data) {
      const payload = vRes.data as { vendors?: VendorOpt[] };
      setVendors(payload.vendors ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addLine = () => setLines([...lines, { description: '', quantity: '1', unitCost: '0' }]);

  const submitPo = async () => {
    if (!vendorId) {
      window.alert('Choose a vendor.');
      return;
    }
    const built = lines
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      }))
      .filter((l) => l.description.length > 0);
    if (built.length === 0) {
      window.alert('Add at least one line with a description.');
      return;
    }
    const res = await api.createPurchaseOrder(
      {
        vendorId,
        notes: notes.trim() || undefined,
        lines: built,
      },
      { idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `po-${Date.now()}` }
    );
    if (!res.success) {
      window.alert(res.error ?? 'Create failed');
      return;
    }
    setNotes('');
    setLines([{ description: '', quantity: '1', unitCost: '0' }]);
    await refresh();
  };

  const patchStatus = async (id: string, status: string) => {
    const res = await api.patchPurchaseOrderStatus(id, status);
    if (!res.success) window.alert(res.error ?? 'Update failed');
    else await refresh();
  };

  const openReceive = async (poId: string, poNumber: string) => {
    setReceiveBusy(true);
    const res = await api.getPurchaseOrderById(poId);
    setReceiveBusy(false);
    if (!res.success || !res.data) {
      window.alert(res.error ?? 'Could not load PO lines');
      return;
    }
    const payload = res.data as { purchaseOrder?: { lines?: PoLineDetail[] } };
    const ln = payload.purchaseOrder?.lines ?? [];
    setReceiveDetail(ln);
    setReceiveNumber(poNumber);
    const q: Record<string, string> = {};
    for (const l of ln) {
      const rem = Math.max(0, l.quantity - l.quantityReceived);
      q[l.id] = rem > 0 ? String(rem) : '';
    }
    setReceiveQty(q);
    setReceiveOpen(poId);
  };

  const submitReceive = async () => {
    if (!receiveOpen) return;
    const receipts = receiveDetail
      .map((l) => ({
        lineId: l.id,
        quantity: Number(receiveQty[l.id]),
      }))
      .filter((r) => Number.isFinite(r.quantity) && r.quantity > 0);
    if (receipts.length === 0) {
      window.alert('Enter a receive quantity on at least one line.');
      return;
    }
    setReceiveBusy(true);
    const res = await api.receivePurchaseOrder(receiveOpen, receipts);
    setReceiveBusy(false);
    if (!res.success) {
      window.alert(res.error ?? 'Receive failed');
      return;
    }
    const inv = (res.data as { invoiceId?: string })?.invoiceId;
    window.alert(inv ? `Posted receipt. Vendor bill: ${inv}` : 'Posted receipt.');
    setReceiveOpen(null);
    await refresh();
  };

  const fmt = (n: number, ccy: string) => formatMoney(n, ccy || functionalCurrency);

  return (
    <ModuleWorkspace
      label="ERP · Procurement"
      title="Purchase orders"
      description="Operational PO documents — approve a PO, then receive goods to post inventory (SKU lines) and generate an AP invoice linked to this order."
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
          <h3 className="mb-3 text-sm font-semibold text-bog-ink">New purchase order</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-500">
              Vendor
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink"
              >
                <option value="">Select…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} — {v.name}
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
                  placeholder="Unit cost"
                  value={ln.unitCost}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], unitCost: e.target.value };
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
            onClick={() => void submitPo()}
            className="mt-4 inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus size={18} className="mr-2" />
            Create PO
          </button>
        </div>
      )}

      <div className={ledgerTableShell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>PO #</th>
                <th className={ledgerThL}>Vendor</th>
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
                    No purchase orders yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className={ledgerRow}>
                    <td className="px-4 py-3 font-figures text-sm font-semibold text-bog-ink">{r.poNumber}</td>
                    <td className="px-4 py-3 text-sm text-bog-ink">{r.vendorName}</td>
                    <td className="px-4 py-3 font-figures text-sm text-zinc-600">{r.orderDate}</td>
                    <td className={`px-4 py-3 text-right ${ledgerTdNum}`}>{fmt(r.total, r.currency)}</td>
                    <td className="px-4 py-3">
                      {canMutate ? (
                        <select
                          value={r.status}
                          onChange={(e) => void patchStatus(r.id, e.target.value)}
                          className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium text-bog-ink"
                        >
                          {PO_STATUSES.map((s) => (
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
                        {(r.status === 'APPROVED' || r.status === 'PARTIALLY_RECEIVED') && (
                          <button
                            type="button"
                            disabled={receiveBusy}
                            onClick={() => void openReceive(r.id, r.poNumber)}
                            className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium text-bog-ink hover:bg-bog-sheet disabled:opacity-50"
                          >
                            Receive → AP
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

      {receiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bog-rule bg-white p-6 shadow-xl">
            <h4 className="text-sm font-semibold text-bog-ink">Receive against {receiveNumber}</h4>
            <p className="mt-2 text-xs text-zinc-600">
              Creates stock receipts for lines linked to inventory SKUs and posts a vendor bill (AP). Quantities cannot exceed what is still open on each line.
            </p>
            <div className="mt-4 space-y-3">
              {receiveDetail.map((l) => {
                const rem = Math.max(0, l.quantity - l.quantityReceived);
                return (
                  <div key={l.id} className="rounded-lg border border-bog-rule p-3 text-sm">
                    <p className="font-medium text-bog-ink">
                      Line {l.lineNumber}: {l.description}
                    </p>
                    <p className="mt-1 font-figures text-xs text-zinc-500">
                      Open: {rem.toFixed(4)} · Unit {fmt(l.unitCost, functionalCurrency)}
                      {l.inventoryItemId ? (
                        <span className="ml-2 text-emerald-800">· Stock linked</span>
                      ) : (
                        <span className="ml-2 text-amber-800">· No SKU — receipt updates PO only</span>
                      )}
                    </p>
                    <label className="mt-2 block text-xs font-medium text-zinc-500">
                      Receive now
                      <input
                        type="number"
                        value={receiveQty[l.id] ?? ''}
                        onChange={(e) => setReceiveQty((prev) => ({ ...prev, [l.id]: e.target.value }))}
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
                onClick={() => setReceiveOpen(null)}
                className="rounded-lg border border-bog-rule px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={receiveBusy}
                onClick={() => void submitReceive()}
                className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Post receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  );
}
