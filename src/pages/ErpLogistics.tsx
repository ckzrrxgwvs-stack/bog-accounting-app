import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Package, Truck } from 'lucide-react';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerRow,
} from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

type CustomerOpt = { id: string; name: string; code: string };
type VendorOpt = { id: string; name: string; code: string };
type ItemOpt = { id: string; sku: string; name: string };

function apiOrigin(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  return raw?.replace(/\/$/, '') ?? '';
}

export function ErpLogistics() {
  const checkPermission = useAuthStore((s) => s.checkPermission);
  const canMutate = checkPermission('erp', 'create');

  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [vendors, setVendors] = useState<VendorOpt[]>([]);
  const [items, setItems] = useState<ItemOpt[]>([]);
  const [carriers, setCarriers] = useState<Array<Record<string, unknown>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, unknown>>>([]);
  const [shipments, setShipments] = useState<Array<Record<string, unknown>>>([]);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [serials, setSerials] = useState<Array<Record<string, unknown>>>([]);
  const [asns, setAsns] = useState<Array<Record<string, unknown>>>([]);
  const [rmas, setRmas] = useState<Array<Record<string, unknown>>>([]);
  const [freight, setFreight] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [carrierName, setCarrierName] = useState('');
  const [carrierScac, setCarrierScac] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locName, setLocName] = useState('');
  const [shipCustomer, setShipCustomer] = useState('');
  const [shipLineDesc, setShipLineDesc] = useState('Line 1');
  const [shipQty, setShipQty] = useState('1');
  const [lotItem, setLotItem] = useState('');
  const [lotNum, setLotNum] = useState('');
  const [serItem, setSerItem] = useState('');
  const [serNum, setSerNum] = useState('');
  const [asnVendor, setAsnVendor] = useState('');
  const [asnNumber, setAsnNumber] = useState('');
  const [rmaCustomer, setRmaCustomer] = useState('');
  const [rmaItem, setRmaItem] = useState('');
  const [rmaQty, setRmaQty] = useState('1');
  const [bcPayload, setBcPayload] = useState('');
  const [bcHuman, setBcHuman] = useState('');
  const [lastBarcodeUrl, setLastBarcodeUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [
      cRes,
      vRes,
      iRes,
      carRes,
      locRes,
      shRes,
      lotRes,
      serRes,
      asnRes,
      rmaRes,
      frRes,
    ] = await Promise.all([
      api.getCustomers(),
      api.getVendors(),
      api.getInventoryItems(),
      api.getLogisticsCarriers(),
      api.getWarehouseLocations(),
      api.getLogisticsShipments(),
      api.getInventoryLots(),
      api.getInventorySerials(),
      api.getInboundAsns(),
      api.getLogisticsRmas(),
      api.getFreightCharges(),
    ]);
    setLoading(false);

    if (cRes.success && cRes.data) {
      const p = cRes.data as { customers?: CustomerOpt[] };
      setCustomers(p.customers ?? []);
    }
    if (vRes.success && vRes.data) {
      const p = vRes.data as { vendors?: VendorOpt[] };
      setVendors(p.vendors ?? []);
    }
    if (iRes.success && iRes.data) {
      const p = iRes.data as { items?: ItemOpt[] };
      setItems(p.items ?? []);
    }
    if (!carRes.success)
      setError(carRes.error ?? 'Could not load logistics');
    else {
      setError(null);
      const p = carRes.data as { carriers?: typeof carriers };
      setCarriers(p.carriers ?? []);
    }
    if (locRes.success && locRes.data) {
      const p = locRes.data as { locations?: typeof locations };
      setLocations(p.locations ?? []);
    }
    if (shRes.success && shRes.data) {
      const p = shRes.data as { shipments?: typeof shipments };
      setShipments(p.shipments ?? []);
    }
    if (lotRes.success && lotRes.data) {
      const p = lotRes.data as { lots?: typeof lots };
      setLots(p.lots ?? []);
    }
    if (serRes.success && serRes.data) {
      const p = serRes.data as { serials?: typeof serials };
      setSerials(p.serials ?? []);
    }
    if (asnRes.success && asnRes.data) {
      const p = asnRes.data as { asns?: typeof asns };
      setAsns(p.asns ?? []);
    }
    if (rmaRes.success && rmaRes.data) {
      const p = rmaRes.data as { rmas?: typeof rmas };
      setRmas(p.rmas ?? []);
    }
    if (frRes.success && frRes.data) {
      const p = frRes.data as { freightCharges?: typeof freight };
      setFreight(p.freightCharges ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCarrier = async () => {
    if (!carrierName.trim()) return;
    const res = await api.createLogisticsCarrier({ name: carrierName.trim(), scacCode: carrierScac || undefined });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      setCarrierName('');
      setCarrierScac('');
      await refresh();
    }
  };

  const addLocation = async () => {
    if (!locCode.trim() || !locName.trim()) return;
    const res = await api.createWarehouseLocation({ code: locCode.trim(), name: locName.trim() });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      setLocCode('');
      setLocName('');
      await refresh();
    }
  };

  const createShipment = async () => {
    if (!shipCustomer) return;
    const q = Number(shipQty);
    if (!Number.isFinite(q) || q <= 0) return;
    const res = await api.createLogisticsShipment({
      customerId: shipCustomer,
      lines: [{ description: shipLineDesc.trim() || 'Shipment line', quantity: q }],
    });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else await refresh();
  };

  const issueDocs = async (id: string) => {
    const res = await api.issueLogisticsStandardDocs(id);
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      window.alert(
        `Issued ${(res.data as { documents?: unknown[] })?.documents?.length ?? 0} document records (BOL, packing slip/list, commercial invoice, ASN, label slot, confirmation).`
      );
      await refresh();
    }
  };

  const addSerial = async () => {
    if (!serItem || !serNum.trim()) return;
    const res = await api.createInventorySerial({
      inventoryItemId: serItem,
      serialNumber: serNum.trim(),
    });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      setSerNum('');
      await refresh();
    }
  };

  const addLot = async () => {
    if (!lotItem || !lotNum.trim()) return;
    const res = await api.createInventoryLot({
      inventoryItemId: lotItem,
      lotNumber: lotNum.trim(),
      quantityOnHand: 0,
    });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      setLotNum('');
      await refresh();
    }
  };

  const addAsn = async () => {
    if (!asnVendor || !asnNumber.trim()) return;
    const res = await api.createInboundAsn({ vendorId: asnVendor, asnNumber: asnNumber.trim() });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      setAsnNumber('');
      await refresh();
    }
  };

  const addRma = async () => {
    if (!rmaCustomer || !rmaItem) return;
    const q = Number(rmaQty);
    if (!Number.isFinite(q) || q <= 0) return;
    const res = await api.createLogisticsRma({
      customerId: rmaCustomer,
      lines: [{ inventoryItemId: rmaItem, quantityAuth: q }],
    });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else await refresh();
  };

  const issueBarcode = async () => {
    if (!bcPayload.trim()) return;
    const res = await api.issueLogisticsBarcode({
      payload: bcPayload.trim(),
      humanReadable: bcHuman.trim() || undefined,
      linkType: 'CUSTOM',
    });
    if (!res.success) window.alert(res.error ?? 'Failed');
    else {
      const svgPath = (res.data as { svgUrl?: string })?.svgUrl ?? '';
      const origin = apiOrigin();
      setLastBarcodeUrl(svgPath ? (origin ? `${origin}${svgPath}` : svgPath) : null);
    }
  };

  return (
    <ModuleWorkspace
      label="ERP · Logistics"
      title="Logistics & compliance"
      description="Operational shipping records: carriers, warehouse locations, outbound shipments with document types (BOL, packing slip/list, commercial invoice, ASN, labels, confirmations), transactional shipment events, inbound ASN (856-style payload), RMA, lot/batch and serial master data, freight audit lines, customer shipping profiles (API), and issued barcode registry with printable SVG (upgrade to GS1-128 PNG via optional renderer)."
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

      <p className="mb-6 text-sm text-zinc-600">
        Use <strong className="font-medium text-bog-ink">Issue standard docs</strong> on a shipment to register BOL, packing slip, packing list, commercial invoice, advance ship notice, shipping label slot, and confirmation placeholders — extend with PDF storage and EDI in your workflows.
        Barcode SVG uses a layout preview; pair stored <code className="rounded bg-zinc-100 px-1">payload</code> with a validated encoder for scanner-grade labels.
      </p>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="bog-statement-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-bog-ink">
            <Truck size={18} />
            Carriers (master)
          </h3>
          {canMutate && (
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                placeholder="Name"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              />
              <input
                placeholder="SCAC"
                value={carrierScac}
                onChange={(e) => setCarrierScac(e.target.value)}
                className="w-24 rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
              <button
                type="button"
                onClick={() => void addCarrier()}
                className="rounded-lg bg-bog-ink px-3 py-2 text-sm text-white"
              >
                Add
              </button>
            </div>
          )}
          <div className={ledgerTableShell}>
            <table className="w-full text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Name</th>
                  <th className={ledgerThL}>SCAC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={ledgerRow}>
                    <td colSpan={2} className="px-3 py-4 text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  carriers.map((c) => (
                    <tr key={String(c.id)} className={ledgerRow}>
                      <td className="px-3 py-2">{String(c.name ?? '')}</td>
                      <td className="px-3 py-2 font-figures">{String(c.scacCode ?? '—')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bog-statement-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-bog-ink">
            <Package size={18} />
            Warehouse locations
          </h3>
          {canMutate && (
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                placeholder="Code"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                className="w-28 rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
              <input
                placeholder="Name"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void addLocation()} className="rounded-lg bg-bog-ink px-3 py-2 text-sm text-white">
                Add
              </button>
            </div>
          )}
          <div className={ledgerTableShell}>
            <table className="w-full text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Code</th>
                  <th className={ledgerThL}>Name</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={String(l.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures">{String(l.code ?? '')}</td>
                    <td className="px-3 py-2">{String(l.name ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bog-statement-card mb-10 p-4">
        <h3 className="mb-2 text-sm font-semibold text-bog-ink">Outbound shipments & shipping documents</h3>
        {canMutate && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-zinc-500">
              Customer
              <select
                value={shipCustomer}
                onChange={(e) => setShipCustomer(e.target.value)}
                className="mt-1 block rounded-lg border border-bog-rule px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Line description
              <input
                value={shipLineDesc}
                onChange={(e) => setShipLineDesc(e.target.value)}
                className="mt-1 block rounded-lg border border-bog-rule px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Qty
              <input
                type="number"
                value={shipQty}
                onChange={(e) => setShipQty(e.target.value)}
                className="mt-1 block w-24 rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
            </label>
            <button type="button" onClick={() => void createShipment()} className="rounded-lg bg-bog-ink px-4 py-2 text-sm text-white">
              Create shipment
            </button>
          </div>
        )}
        <div className={ledgerTableShell}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Shipment #</th>
                  <th className={ledgerThL}>Status</th>
                  <th className={ledgerThL}>BOL ref</th>
                  <th className={ledgerThL}>Tracking</th>
                  <th className={ledgerThL}>Docs</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={String(s.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures font-semibold">{String(s.shipmentNumber ?? '')}</td>
                    <td className="px-3 py-2">{String(s.status ?? '')}</td>
                    <td className="px-3 py-2 font-figures">{String(s.masterBolNumber ?? '—')}</td>
                    <td className="px-3 py-2 font-figures">{String(s.trackingNumber ?? '—')}</td>
                    <td className="px-3 py-2">
                      {canMutate && (
                        <button
                          type="button"
                          onClick={() => void issueDocs(String(s.id))}
                          className="rounded-md border border-bog-rule bg-white px-2 py-1 text-xs font-medium hover:bg-bog-sheet"
                        >
                          Issue standard docs
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-3">
        <div className="bog-statement-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-bog-ink">Serial numbers</h3>
          {canMutate && (
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={serItem}
                onChange={(e) => setSerItem(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              >
                <option value="">Item…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku}
                  </option>
                ))}
              </select>
              <input
                placeholder="Serial #"
                value={serNum}
                onChange={(e) => setSerNum(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
              <button type="button" onClick={() => void addSerial()} className="rounded-lg bg-bog-ink px-3 py-2 text-sm text-white">
                Register
              </button>
            </div>
          )}
          <div className={ledgerTableShell}>
            <table className="w-full text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Serial</th>
                  <th className={ledgerThL}>Status</th>
                </tr>
              </thead>
              <tbody>
                {serials.slice(0, 40).map((s) => (
                  <tr key={String(s.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures">{String(s.serialNumber ?? '')}</td>
                    <td className="px-3 py-2">{String(s.status ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bog-statement-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-bog-ink">Lot / batch records</h3>
          {canMutate && (
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={lotItem}
                onChange={(e) => setLotItem(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              >
                <option value="">Item…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku}
                  </option>
                ))}
              </select>
              <input
                placeholder="Lot #"
                value={lotNum}
                onChange={(e) => setLotNum(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
              <button type="button" onClick={() => void addLot()} className="rounded-lg bg-bog-ink px-3 py-2 text-sm text-white">
                Add lot
              </button>
            </div>
          )}
          <div className={ledgerTableShell}>
            <table className="w-full text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>Lot</th>
                  <th className={ledgerThL}>SKU</th>
                  <th className={ledgerThL}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => (
                  <tr key={String(l.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures">{String(l.lotNumber ?? '')}</td>
                    <td className="px-3 py-2">
                      {(l as { item?: { sku?: string } }).item?.sku ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-figures">{String(l.quantityOnHand ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bog-statement-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-bog-ink">Barcode issuance</h3>
          <p className="mb-2 text-xs text-zinc-500">
            Registry entry + SVG preview. Production scanning: install optional PNG renderer or integrate carrier label APIs.
          </p>
          {canMutate && (
            <div className="space-y-2">
              <input
                placeholder="Encoded payload (e.g. GS1 string)"
                value={bcPayload}
                onChange={(e) => setBcPayload(e.target.value)}
                className="w-full rounded-lg border border-bog-rule px-3 py-2 font-mono text-xs"
              />
              <input
                placeholder="Human-readable (optional)"
                value={bcHuman}
                onChange={(e) => setBcHuman(e.target.value)}
                className="w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void issueBarcode()} className="rounded-lg bg-bog-ink px-4 py-2 text-sm text-white">
                Issue barcode
              </button>
              {lastBarcodeUrl && (
                <a href={lastBarcodeUrl} target="_blank" rel="noreferrer" className="block text-sm font-medium text-[hsl(var(--bog-accent))] hover:underline">
                  Open SVG label
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bog-statement-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-bog-ink">Inbound ASN</h3>
          {canMutate && (
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={asnVendor}
                onChange={(e) => setAsnVendor(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              >
                <option value="">Vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code}
                  </option>
                ))}
              </select>
              <input
                placeholder="ASN #"
                value={asnNumber}
                onChange={(e) => setAsnNumber(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
              <button type="button" onClick={() => void addAsn()} className="rounded-lg bg-bog-ink px-3 py-2 text-sm text-white">
                Save ASN
              </button>
            </div>
          )}
          <div className={ledgerTableShell}>
            <table className="w-full text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>ASN</th>
                  <th className={ledgerThL}>Status</th>
                </tr>
              </thead>
              <tbody>
                {asns.map((a) => (
                  <tr key={String(a.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures">{String(a.asnNumber ?? '')}</td>
                    <td className="px-3 py-2">{String(a.status ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bog-statement-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-bog-ink">RMA</h3>
          {canMutate && (
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={rmaCustomer}
                onChange={(e) => setRmaCustomer(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              >
                <option value="">Customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
              <select
                value={rmaItem}
                onChange={(e) => setRmaItem(e.target.value)}
                className="rounded-lg border border-bog-rule px-3 py-2 text-sm"
              >
                <option value="">SKU…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={rmaQty}
                onChange={(e) => setRmaQty(e.target.value)}
                className="w-20 rounded-lg border border-bog-rule px-3 py-2 text-sm font-figures"
              />
              <button type="button" onClick={() => void addRma()} className="rounded-lg bg-bog-ink px-3 py-2 text-sm text-white">
                Create RMA
              </button>
            </div>
          )}
          <div className={ledgerTableShell}>
            <table className="w-full text-sm">
              <thead>
                <tr className={ledgerHeadRow}>
                  <th className={ledgerThL}>RMA #</th>
                  <th className={ledgerThL}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rmas.map((r) => (
                  <tr key={String(r.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures font-semibold">{String(r.rmaNumber ?? '')}</td>
                    <td className="px-3 py-2">{String(r.status ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bog-statement-card mt-10 p-4">
        <h3 className="mb-2 text-sm font-semibold text-bog-ink">Freight audit / transportation charges</h3>
        <p className="mb-3 text-xs text-zinc-500">
          Booked vs invoiced vs audited amounts per shipment — attach carrier invoice refs for compliance.
        </p>
        <div className={ledgerTableShell}>
          <table className="w-full text-sm">
            <thead>
              <tr className={ledgerHeadRow}>
                <th className={ledgerThL}>Shipment</th>
                <th className={ledgerThL}>Category</th>
                <th className={ledgerThL}>Booked</th>
                <th className={ledgerThL}>Invoiced</th>
                <th className={ledgerThL}>Audited</th>
              </tr>
            </thead>
            <tbody>
              {freight.length === 0 ? (
                <tr className={ledgerRow}>
                  <td colSpan={5} className="px-3 py-4 text-zinc-500">
                    No freight lines yet — POST via API or extend UI.
                  </td>
                </tr>
              ) : (
                freight.map((f) => (
                  <tr key={String(f.id)} className={ledgerRow}>
                    <td className="px-3 py-2 font-figures">
                      {(f as { shipment?: { shipmentNumber?: string } }).shipment?.shipmentNumber ?? '—'}
                    </td>
                    <td className="px-3 py-2">{String(f.category ?? '')}</td>
                    <td className="px-3 py-2 font-figures">{String(f.bookedAmount ?? '—')}</td>
                    <td className="px-3 py-2 font-figures">{String(f.invoicedAmount ?? '—')}</td>
                    <td className="px-3 py-2 font-figures">{String(f.auditedAmount ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
