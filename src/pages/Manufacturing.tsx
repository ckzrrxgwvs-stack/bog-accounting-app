import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Factory, LayoutGrid, Plus } from 'lucide-react';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

type InvOpt = { id: string; sku: string; name: string };

type BomRow = {
  id: string;
  finishedSku: string;
  finishedName: string;
  lineCount: number;
};

type ProdRow = {
  id: string;
  orderNumber: string;
  status: string;
  finishedSku: string;
  finishedName: string;
  quantityOrdered: number;
  quantityCompleted: number;
};

export function Manufacturing() {
  const checkPermission = useAuthStore((s) => s.checkPermission);
  const canMutate = checkPermission('erp', 'create');

  const [items, setItems] = useState<InvOpt[]>([]);
  const [boms, setBoms] = useState<BomRow[]>([]);
  const [orders, setOrders] = useState<ProdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fgId, setFgId] = useState('');
  const [bomLines, setBomLines] = useState([{ componentItemId: '', quantityPer: '1' }]);
  const [prodFgId, setProdFgId] = useState('');
  const [prodQty, setProdQty] = useState('1');
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [completeQty, setCompleteQty] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [invRes, bomRes, poRes] = await Promise.all([
      api.getInventoryItems(),
      api.getBoms(),
      api.getProductionOrders(),
    ]);
    setLoading(false);
    if (!invRes.success || !invRes.data) {
      setError(invRes.error ?? 'Could not load inventory');
      return;
    }
    const invPayload = invRes.data as { items?: InvOpt[] };
    setItems(invPayload.items ?? []);
    setError(null);
    if (bomRes.success && bomRes.data) {
      const b = (bomRes.data as { boms?: BomRow[] }).boms ?? [];
      setBoms(b);
    }
    if (poRes.success && poRes.data) {
      const p = (poRes.data as { productionOrders?: ProdRow[] }).productionOrders ?? [];
      setOrders(p);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addBomLine = () => setBomLines([...bomLines, { componentItemId: '', quantityPer: '1' }]);

  const submitBom = async () => {
    if (!fgId) {
      window.alert('Choose a finished good SKU.');
      return;
    }
    const lines = bomLines
      .map((l) => ({
        componentItemId: l.componentItemId,
        quantityPer: Number(l.quantityPer),
      }))
      .filter((l) => l.componentItemId && Number.isFinite(l.quantityPer) && l.quantityPer > 0);
    if (lines.length === 0) {
      window.alert('Add at least one component line.');
      return;
    }
    const res = await api.createBom({ finishedGoodsItemId: fgId, lines });
    if (!res.success) {
      window.alert(res.error ?? 'Create BOM failed');
      return;
    }
    setBomLines([{ componentItemId: '', quantityPer: '1' }]);
    await refresh();
  };

  const submitProd = async () => {
    if (!prodFgId) {
      window.alert('Choose a finished good SKU.');
      return;
    }
    const q = Number(prodQty);
    if (!Number.isFinite(q) || q <= 0) {
      window.alert('Enter a positive quantity.');
      return;
    }
    const res = await api.createProductionOrder({ finishedGoodsItemId: prodFgId, quantityOrdered: q });
    if (!res.success) {
      window.alert(res.error ?? 'Create production order failed');
      return;
    }
    await refresh();
  };

  const release = async (id: string) => {
    const res = await api.patchProductionOrderStatus(id, 'RELEASED');
    if (!res.success) window.alert(res.error ?? 'Release failed');
    else await refresh();
  };

  const doComplete = async () => {
    if (!completeId) return;
    const q = Number(completeQty);
    if (!Number.isFinite(q) || q <= 0) {
      window.alert('Enter completed quantity.');
      return;
    }
    const res = await api.completeProductionOrder(completeId, q);
    if (!res.success) window.alert(res.error ?? 'Complete failed');
    else {
      setCompleteId(null);
      setCompleteQty('');
      await refresh();
    }
  };

  return (
    <ModuleWorkspace
      label="ERP · Manufacturing"
      title="BOM & production"
      description="Define bills of material, release work orders, and complete runs — component issues and finished goods receipts flow through inventory at rolled standard cost (linked to your accounting subledger via stock movements)."
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
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="bog-statement-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-bog-ink">
              <Factory size={18} />
              New bill of materials
            </h3>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
              Finished good
              <select
                value={fgId}
                onChange={(e) => setFgId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} — {it.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Components (per 1 FG)</p>
            {bomLines.map((ln, i) => (
              <div key={i} className="mb-2 grid gap-2 md:grid-cols-2">
                <select
                  value={ln.componentItemId}
                  onChange={(e) => {
                    const next = [...bomLines];
                    next[i] = { ...next[i], componentItemId: e.target.value };
                    setBomLines(next);
                  }}
                  className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
                >
                  <option value="">Component…</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.sku}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qty per FG"
                  value={ln.quantityPer}
                  onChange={(e) => {
                    const next = [...bomLines];
                    next[i] = { ...next[i], quantityPer: e.target.value };
                    setBomLines(next);
                  }}
                  className="rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
                />
              </div>
            ))}
            <button type="button" onClick={addBomLine} className="mb-3 text-xs font-medium text-[hsl(var(--bog-accent))] hover:underline">
              + Component line
            </button>
            <button
              type="button"
              onClick={() => void submitBom()}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus size={18} className="mr-2" />
              Save BOM
            </button>
          </div>

          <div className="bog-statement-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-bog-ink">New production order</h3>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
              Finished good
              <select
                value={prodFgId}
                onChange={(e) => setProdFgId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} — {it.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-xs font-medium text-zinc-500">
              Quantity to build
              <input
                type="number"
                value={prodQty}
                onChange={(e) => setProdQty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
            </label>
            <button
              type="button"
              onClick={() => void submitProd()}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus size={18} className="mr-2" />
              Create work order
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="mb-2 text-sm font-semibold text-bog-ink">Defined BOMs</h3>
        <div className={ledgerTableShell}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Finished SKU</th>
                  <th className={ledgerThL}>Name</th>
                  <th className={ledgerThL}>Lines</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={ledgerRow}>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : boms.length === 0 ? (
                  <tr className={ledgerRow}>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                      No BOMs yet.
                    </td>
                  </tr>
                ) : (
                  boms.map((b) => (
                    <tr key={b.id} className={ledgerRow}>
                      <td className="px-4 py-3 font-figures text-sm font-medium">{b.finishedSku}</td>
                      <td className="px-4 py-3 text-sm">{b.finishedName}</td>
                      <td className="px-4 py-3 font-figures text-sm">{b.lineCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-bog-ink">Production orders</h3>
        <div className={ledgerTableShell}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Order #</th>
                  <th className={ledgerThL}>SKU</th>
                  <th className={ledgerThL}>Status</th>
                  <th className={ledgerThL}>Ordered</th>
                  <th className={ledgerThL}>Done</th>
                  <th className={ledgerThL}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={ledgerRow}>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr className={ledgerRow}>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-500">
                      No production orders.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className={ledgerRow}>
                      <td className="px-4 py-3 font-figures text-sm font-semibold">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-sm">
                        {o.finishedSku} <span className="text-zinc-500">({o.finishedName})</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{o.status}</td>
                      <td className="px-4 py-3 font-figures text-sm">{o.quantityOrdered}</td>
                      <td className="px-4 py-3 font-figures text-sm">{o.quantityCompleted}</td>
                      <td className="px-4 py-3">
                        {canMutate && o.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => void release(o.id)}
                            className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium hover:bg-bog-sheet"
                          >
                            Release
                          </button>
                        )}
                        {canMutate && o.status === 'RELEASED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteId(o.id);
                              setCompleteQty(String(Math.max(0, o.quantityOrdered - o.quantityCompleted)));
                            }}
                            className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium hover:bg-bog-sheet"
                          >
                            Complete run…
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {completeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-bog-rule bg-white p-6 shadow-xl">
            <h4 className="text-sm font-semibold text-bog-ink">Complete production run</h4>
            <p className="mt-2 text-xs text-zinc-600">Issues BOM components and receipts finished goods at rolled unit cost.</p>
            <label className="mt-4 block text-xs font-medium text-zinc-500">
              Good quantity this run
              <input
                type="number"
                value={completeQty}
                onChange={(e) => setCompleteQty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCompleteId(null);
                  setCompleteQty('');
                }}
                className="rounded-lg border border-bog-rule px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doComplete()}
                className="rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Post completion
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  );
}
