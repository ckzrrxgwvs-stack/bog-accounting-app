import { Router } from 'express';
import { Prisma, SalesOrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { shipSalesOrderAndBill } from '../services/erpAccountingIntegration';

const router = Router();

type MockSo = {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  requestedShipDate: string | null;
  status: SalesOrderStatus;
  currency: string;
  total: number;
  notes: string | null;
};

let mockSalesOrders: MockSo[] = [];

function mapSo(r: {
  id: string;
  soNumber: string;
  customerId: string;
  customer: { name: string };
  orderDate: Date;
  requestedShipDate: Date | null;
  status: SalesOrderStatus;
  currency: string;
  total: unknown;
  notes: string | null;
}) {
  return {
    id: r.id,
    soNumber: r.soNumber,
    customerId: r.customerId,
    customerName: r.customer.name,
    orderDate: r.orderDate.toISOString().slice(0, 10),
    requestedShipDate: r.requestedShipDate ? r.requestedShipDate.toISOString().slice(0, 10) : null,
    status: r.status,
    currency: r.currency,
    total: dec(r.total as never),
    notes: r.notes,
  };
}

router.get('/', async (_req, res) => {
  if (!useDatabase()) {
    res.json({ salesOrders: mockSalesOrders });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.salesOrder.findMany({
      where: { companyId: company.id },
      include: { customer: true },
      orderBy: { orderDate: 'desc' },
    });
    res.json({ salesOrders: rows.map(mapSo) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const row = mockSalesOrders.find((x) => x.id === req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ salesOrder: { ...row, lines: [] } });
    return;
  }
  try {
    const row = await prisma.salesOrder.findFirst({
      where: { id: req.params.id },
      include: {
        customer: true,
        lines: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({
      salesOrder: {
        ...mapSo({ ...row, customer: row.customer }),
        lines: row.lines.map((l) => ({
          id: l.id,
          lineNumber: l.lineNumber,
          description: l.description,
          quantity: dec(l.quantity as never),
          quantityShipped: dec(l.quantityShipped as never),
          unitPrice: dec(l.unitPrice as never),
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
    customerId?: string;
    requestedShipDate?: string;
    currency?: string;
    notes?: string;
    lines?: { description?: string; quantity?: number; unitPrice?: number; inventoryItemId?: string | null }[];
  };

  const linesInput = Array.isArray(body.lines) ? body.lines : [];
  if (!body.customerId || linesInput.length === 0) {
    res.status(400).json({ error: 'customerId and at least one line are required' });
    return;
  }

  const currency = (body.currency ?? 'USD').toUpperCase();
  let lineNum = 1;
  const builtLines: {
    lineNumber: number;
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    inventoryItemId: string | null;
  }[] = [];

  let subtotal = 0;
  for (const ln of linesInput) {
    const q = Number(ln.quantity);
    const p = Number(ln.unitPrice);
    const desc = String(ln.description ?? '').trim();
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p < 0 || !desc) {
      res.status(400).json({ error: 'Each line needs description, positive quantity, and unit price' });
      return;
    }
    const lt = Math.round(q * p * 100) / 100;
    subtotal += lt;
    builtLines.push({
      lineNumber: lineNum++,
      description: desc,
      quantity: new Prisma.Decimal(String(q)),
      unitPrice: new Prisma.Decimal(String(p)),
      lineTotal: new Prisma.Decimal(String(lt)),
      inventoryItemId: ln.inventoryItemId ?? null,
    });
  }

  const taxAmount = 0;
  const total = subtotal;

  if (!useDatabase()) {
    const id = `so-mock-${Date.now()}`;
    const soNumber = `SO-${Date.now()}`;
    const row: MockSo = {
      id,
      soNumber,
      customerId: body.customerId,
      customerName: 'Customer',
      orderDate: new Date().toISOString().slice(0, 10),
      requestedShipDate: body.requestedShipDate ?? null,
      status: 'DRAFT',
      currency,
      total,
      notes: body.notes ?? null,
    };
    mockSalesOrders = [row, ...mockSalesOrders];
    res.status(201).json({ salesOrder: row });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, companyId: company.id },
    });
    if (!customer) {
      res.status(400).json({ error: 'Customer not found' });
      return;
    }

    const soNumber = `SO-${Date.now()}`;
    const orderDate = new Date();
    const requestedShipDate = body.requestedShipDate ? new Date(body.requestedShipDate) : null;

    const created = await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        soNumber,
        customerId: customer.id,
        orderDate,
        requestedShipDate,
        status: 'DRAFT',
        currency,
        subtotal: new Prisma.Decimal(String(subtotal)),
        taxAmount: new Prisma.Decimal(String(taxAmount)),
        total: new Prisma.Decimal(String(total)),
        notes: body.notes ?? null,
        lines: { create: builtLines },
      },
      include: { customer: true, lines: true },
    });

    res.status(201).json({
      salesOrder: {
        ...mapSo(created),
        lines: created.lines.map((l) => ({
          id: l.id,
          lineNumber: l.lineNumber,
          description: l.description,
          quantity: dec(l.quantity as never),
          unitPrice: dec(l.unitPrice as never),
          lineTotal: dec(l.lineTotal as never),
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create sales order' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const status = req.body?.status as SalesOrderStatus | undefined;
  if (!status || !Object.values(SalesOrderStatus).includes(status)) {
    res.status(400).json({ error: 'Valid status required' });
    return;
  }

  if (!useDatabase()) {
    const idx = mockSalesOrders.findIndex((x) => x.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    mockSalesOrders[idx] = { ...mockSalesOrders[idx], status };
    res.json({ salesOrder: mockSalesOrders[idx] });
    return;
  }

  try {
    const updated = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: { status },
      include: { customer: true },
    });
    res.json({ salesOrder: mapSo(updated) });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

/** Ship against a CONFIRMED / PARTIALLY_SHIPPED SO — inventory COGS move + AR invoice. */
router.post('/:id/ship', async (req, res) => {
  if (!useDatabase()) {
    res.status(503).json({ error: 'Database required for order-to-cash shipment' });
    return;
  }
  const body = req.body as { shipments?: { lineId: string; quantity: number }[] };
  if (!Array.isArray(body.shipments) || body.shipments.length === 0) {
    res.status(400).json({ error: 'shipments: [{ lineId, quantity }, ...] required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const result = await shipSalesOrderAndBill({
      companyId: company.id,
      salesOrderId: req.params.id,
      shipments: body.shipments,
    });
    res.json({ success: true, invoiceId: result.invoiceId });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Ship failed' });
  }
});

export { router as salesOrdersRouter };
