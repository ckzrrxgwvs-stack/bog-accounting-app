// ERP workspace overview — integrated operational + financial patterns (original BOG-Pi design).

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, ShoppingCart, ClipboardList, ArrowRight, Factory, Truck, Sparkles } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useCompanyPolicy } from '@/hooks/useCompanyPolicy';

type ErpSummary = {
  purchaseOrders: { draft: number; open: number; closed: number };
  salesOrders: { draft: number; open: number; closed: number };
  logistics?: { shipmentsOpen: number; asnInFlight: number; rmaOpen: number };
  hint?: string;
};

export function ErpHub() {
  const { manualOperationsMode, loading: policyLoading } = useCompanyPolicy();
  const [summary, setSummary] = useState<ErpSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getErpSummary();
      if (cancelled || !res.success || !res.data) return;
      setSummary(res.data as ErpSummary);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: {
    title: string;
    desc: string;
    href: string;
    icon: typeof ShoppingCart;
    counts?: { draft: number; open: number; closed: number };
    countLabels?: [string, string, string];
  }[] = [
    {
      title: 'Purchase orders',
      desc: 'Procurement lifecycle: draft → approved → receipt tracking → close (procurement-to-pay alignment).',
      href: '/erp/purchase-orders',
      icon: ShoppingCart,
      counts: summary?.purchaseOrders,
    },
    {
      title: 'Sales orders',
      desc: 'Order-to-cash shell: draft → confirmed → shipment progress → close (ties naturally into AR invoicing).',
      href: '/erp/sales-orders',
      icon: ClipboardList,
      counts: summary?.salesOrders,
    },
    {
      title: 'Manufacturing',
      desc: 'Bills of material and production orders — component issues and finished goods receipts post through inventory and align with financial reporting.',
      href: '/erp/manufacturing',
      icon: Factory,
      counts: undefined,
    },
    {
      title: 'Logistics & compliance',
      desc: 'Shipments (BOL, packing, commercial invoice, ASN, labels), carrier & freight audit data, inbound ASN, RMA, lot/serial traceability, customer ship profiles, barcode issuance.',
      href: '/erp/logistics',
      icon: Truck,
      counts: summary?.logistics
        ? {
            draft: summary.logistics.asnInFlight,
            open: summary.logistics.shipmentsOpen,
            closed: summary.logistics.rmaOpen,
          }
        : undefined,
      countLabels: ['ASN in flight', 'Shipments open', 'RMA open'],
    },
  ];

  return (
    <ModuleWorkspace
      label="ERP"
      title="Enterprise workspace"
      description="Customer service and clerks can start with the ERP Assistant for plain-language help (same AI opt-out as accounting). Detailed PO/SO/logistics screens stay available for power users."
      actions={
        <span className="inline-flex items-center gap-2 rounded-lg border border-bog-rule bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm">
          <LayoutGrid size={16} />
          Hub
        </span>
      }
    >
      <div className="space-y-8">
        {!policyLoading && !manualOperationsMode && (
          <Link
            to="/erp/assistant"
            className="group flex flex-col gap-4 rounded-xl border-2 border-[hsl(var(--bog-accent))]/35 bg-gradient-to-br from-white via-white to-bog-sheet p-6 shadow-md transition-shadow hover:shadow-lg md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-bog-ink text-white shadow-sm">
                <Sparkles size={28} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-bog-ink">ERP Assistant — start here</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
                  Ask in everyday language: order status, what to tell a customer, shipments, returns, or vendor timing.
                  The assistant uses live order and shipment data when your database is connected — like AI CPA does for accounting.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-lg bg-bog-ink px-5 py-3 text-sm font-semibold text-white md:self-center">
              Open assistant
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}

        {!policyLoading && manualOperationsMode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            <strong className="font-semibold">Manual operations mode</strong> — AI ERP Assistant is disabled by leadership (same policy as AI CPA).
            Use the <strong>advanced ERP screens</strong> below for purchase orders, sales orders, manufacturing, and logistics.
          </div>
        )}

        {summary?.hint && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{summary.hint}</p>
        )}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Advanced ERP screens</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Full grids and document workflows — use when you already know the steps or when AI is turned off.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              to={c.href}
              className="group bog-statement-card flex flex-col border border-bog-rule p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bog-sheet text-bog-ink">
                    <c.icon size={22} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-bog-ink">{c.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{c.desc}</p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-bog-ink"
                />
              </div>
              {c.counts && (
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-bog-rule pt-4 text-center font-figures text-xs">
                  <div>
                    <p className="text-zinc-500">{(c.countLabels ?? ['Draft', 'Open', 'Closed'])[0]}</p>
                    <p className="text-lg font-semibold text-bog-ink">{c.counts.draft}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">{(c.countLabels ?? ['Draft', 'Open', 'Closed'])[1]}</p>
                    <p className="text-lg font-semibold text-[hsl(var(--bog-accent))]">{c.counts.open}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">{(c.countLabels ?? ['Draft', 'Open', 'Closed'])[2]}</p>
                    <p className="text-lg font-semibold text-emerald-800">{c.counts.closed}</p>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>

        <p className="text-xs text-zinc-500">
          Procurement and sales are wired: receive against an approved PO posts stock and creates an AP invoice; ship against a confirmed SO issues inventory and creates an AR invoice — all in BOG-Pi’s own services.
        </p>

        <section className="rounded-xl border border-bog-rule bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Design influences (concept only)</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700">
            <li>
              <strong className="text-bog-ink">SAP S/4HANA-style</strong> separation of operational procurement documents from FI posting —
              we track PO status first; AP invoices remain your financial record.
            </li>
            <li>
              <strong className="text-bog-ink">Oracle NetSuite-style</strong> unified transaction spine — orders and subledger documents share company,
              currency, and master data in one tenant.
            </li>
            <li>
              <strong className="text-bog-ink">Microsoft Dynamics 365-style</strong> workflow stages — draft / approved / partial / closed on documents you control.
            </li>
            <li>
              <strong className="text-bog-ink">Epicor Kinetic-style</strong> emphasis on inventory-linked lines — optional SKU references on order lines for future MRP-style extensions.
            </li>
          </ul>
          <p className="mt-4 text-xs text-zinc-500">
            All code paths here are BOG-Pi originals; product names are cited only to describe industry patterns, not as integrations or endorsements.
          </p>
        </section>
      </div>
    </ModuleWorkspace>
  );
}
