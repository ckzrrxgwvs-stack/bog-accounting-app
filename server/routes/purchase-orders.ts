import { Router } from 'express';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { receivePurchaseOrderReceipt } from '../services/erpAccountingIntegration';

const router = Router();

type MockPo = {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDate: string | null;
  status: PurchaseOrderStatus;
  currency: string;
  total: number;
  notes: string | null;
};

let mockPurchaseOrders: MockPo[] = [];

function mapPo(r: {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor: { name: string };
  orderDate: Date;
  expectedDate: Date | null;
  status: PurchaseOrderStatus;
  currency: string;
  total: unknown;
  notes: string | null;
}) {
  return {
    id: r.id,
    poNumber: r.poNumber,
    vendorId: r.vendorId,
    vendorName: r.vendor.name,
    orderDate: r.orderDate.toISOString().slice(0, 10),
    expectedDate: r.expectedDate ? r.expectedDate.toISOString().slice(0, 10) : null,
    status: r.status,
    currency: r.currency,
    total: dec(r.total as never),
    notes: r.notes,
  };
}

router.get('/', async (_req, res) => {
  if (!useDatabase()) {
    res.json({ purchaseOrders: mockPurchaseOrders });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.purchaseOrder.findMany({
      where: { companyId: company.id },
      include: { vendor: true },
      orderBy: { orderDate: 'desc' },
    });
    res.json({ purchaseOrders: rows.map(mapPo) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const row = mockPurchaseOrders.find((x) => x.id === req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ purchaseOrder: { ...row, lines: [] } });
    return;
  }
  try {
    const row = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id },
      include: {
        vendor: true,
        lines: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({
      purchaseOrder: {
        ...mapPo({ ...row, vendor: row.vendor }),
        lines: row.lines.map((l) => ({
          id: l.id,
          lineNumber: l.lineNumber,
          description: l.description,
          quantity: dec(l.quantity as never),
          quantityReceived: dec(l.quantityReceived as never),
          unitCost: dec(l.unitCost as never),
          lineTotal: dec(l.lineTotal as never),
          inventoryItemId: l.inventoryItemId,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    vendorId?: string;
    expectedDate?: string;
    currency?: string;
    notes?: string;
    lines?: { description?: string; quantity?: number; unitCost?: number; inventoryItemId?: string | null }[];
  };

  const linesInput = Array.isArray(body.lines) ? body.lines : [];
  if (!body.vendorId || linesInput.length === 0) {
    res.status(400).json({ error: 'vendorId and at least one line are required' });
    return;
  }

  const currency = (body.currency ?? 'USD').toUpperCase();
  let lineNum = 1;
  const builtLines: {
    lineNumber: number;
    description: string;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    inventoryItemId: string | null;
  }[] = [];

  let subtotal = 0;
  for (const ln of linesInput) {
    const q = Number(ln.quantity);
    const c = Number(ln.unitCost);
    const desc = String(ln.description ?? '').trim();
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(c) || c < 0 || !desc) {
      res.status(400).json({ error: 'Each line needs description, positive quantity, and unit cost' });
      return;
    }
    const lt = Math.round(q * c * 100) / 100;
    subtotal += lt;
    builtLines.push({
      lineNumber: lineNum++,
      description: desc,
      quantity: new Prisma.Decimal(String(q)),
      unitCost: new Prisma.Decimal(String(c)),
      lineTotal: new Prisma.Decimal(String(lt)),
      inventoryItemId: ln.inventoryItemId ?? null,
    });
  }

  const taxAmount = 0;
  const total = subtotal;

  if (!useDatabase()) {
    const id = `po-mock-${Date.now()}`;
    const poNumber = `PO-${Date.now()}`;
    const row: MockPo = {
      id,
      poNumber,
      vendorId: body.vendorId,
      vendorName: 'Vendor',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: body.expectedDate ?? null,
      status: 'DRAFT',
      currency,
      total,
      notes: body.notes ?? null,
    };
    mockPurchaseOrders = [row, ...mockPurchaseOrders];
    res.status(201).json({ purchaseOrder: row });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const vendor = await prisma.vendor.findFirst({
      where: { id: body.vendorId, companyId: company.id },
    });
    if (!vendor) {
      res.status(400).json({ error: 'Vendor not found' });
      return;
    }

    const poNumber = `PO-${Date.now()}`;
    const orderDate = new Date();
    const expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;

    const created = await prisma.purchaseOrder.create({
      data: {
        companyId: company.id,
        poNumber,
        vendorId: vendor.id,
        orderDate,
        expectedDate,
        status: 'DRAFT',
        currency,
        subtotal: new Prisma.Decimal(String(subtotal)),
        taxAmount: new Prisma.Decimal(String(taxAmount)),
        total: new Prisma.Decimal(String(total)),
        notes: body.notes ?? null,
        lines: { create: builtLines },
      },
      include: { vendor: true, lines: true },
    });

    res.status(201).json({
      purchaseOrder: {
        ...mapPo(created),
        lines: created.lines.map((l) => ({
          id: l.id,
          lineNumber: l.lineNumber,
          description: l.description,
          quantity: dec(l.quantity as never),
          unitCost: dec(l.unitCost as never),
          lineTotal: dec(l.lineTotal as never),
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create purchase order' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const status = req.body?.status as PurchaseOrderStatus | undefined;
  if (!status || !Object.values(PurchaseOrderStatus).includes(status)) {
    res.status(400).json({ error: 'Valid status required' });
    return;
  }

  if (!useDatabase()) {
    const idx = mockPurchaseOrders.findIndex((x) => x.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    mockPurchaseOrders[idx] = { ...mockPurchaseOrders[idx], status };
    res.json({ purchaseOrder: mockPurchaseOrders[idx] });
    return;
  }

  try {
    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
      include: { vendor: true },
    });
    res.json({ purchaseOrder: mapPo(updated) });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

/** Receive goods against an APPROVED / PARTIALLY_RECEIVED PO — inventory + AP invoice (erpAccountingIntegration). */
router.post('/:id/receive', async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required for procure-to-pay receipt' });
    return;
  }
  const body = req.body as { receipts?: { lineId: string; quantity: number }[] };
  if (!Array.isArray(body.receipts) || body.receipts.length === 0) {
    res.status(400).json({ error: 'receipts: [{ lineId, quantity }, ...] required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const result = await receivePurchaseOrderReceipt({
      companyId: company.id,
      purchaseOrderId: req.params.id,
      receipts: body.receipts,
    });
    res.json({ success: true, invoiceId: result.invoiceId });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Receive failed' });
  }
});

export { router as purchaseOrdersRouter };
