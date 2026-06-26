import { Router } from 'express';
import { Prisma, ProductionOrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { completeProductionRun } from '../services/erpProductionIntegration';

const router = Router();

router.get('/', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.productionOrder.findMany({
      where: { companyId: company.id },
      include: {
        finishedGoods: { select: { sku: true, name: true } },
      },
      orderBy: { orderDate: 'desc' },
    });
    res.json({
      productionOrders: rows.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        status: r.status,
        orderDate: r.orderDate.toISOString().slice(0, 10),
        finishedSku: r.finishedGoods.sku,
        finishedName: r.finishedGoods.name,
        quantityOrdered: dec(r.quantityOrdered as never),
        quantityCompleted: dec(r.quantityCompleted as never),
        notes: r.notes,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    finishedGoodsItemId?: string;
    quantityOrdered?: number;
    bomHeaderId?: string | null;
    notes?: string;
    orderNumber?: string;
  };

  if (!requireDatabase(res)) return;

  if (!body.finishedGoodsItemId || body.quantityOrdered == null) {
    res.status(400).json({ error: 'finishedGoodsItemId and quantityOrdered required' });
    return;
  }

  const qty = Number(body.quantityOrdered);
  if (!Number.isFinite(qty) || qty <= 0) {
    res.status(400).json({ error: 'quantityOrdered must be positive' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const fg = await prisma.inventoryItem.findFirst({
      where: { id: body.finishedGoodsItemId, companyId: company.id },
    });
    if (!fg) {
      res.status(400).json({ error: 'Finished goods item not found' });
      return;
    }

    let bomHeaderId: string | null = body.bomHeaderId ?? null;
    if (bomHeaderId) {
      const bh = await prisma.bomHeader.findFirst({
        where: { id: bomHeaderId, companyId: company.id },
      });
      if (!bh) {
        res.status(400).json({ error: 'BOM not found' });
        return;
      }
    } else {
      const bh = await prisma.bomHeader.findFirst({
        where: { companyId: company.id, finishedGoodsItemId: fg.id },
      });
      bomHeaderId = bh?.id ?? null;
    }

    const orderNumber = body.orderNumber ?? `PROD-${Date.now().toString(36).toUpperCase()}`;

    const created = await prisma.productionOrder.create({
      data: {
        companyId: company.id,
        orderNumber,
        finishedGoodsItemId: fg.id,
        bomHeaderId,
        quantityOrdered: new Prisma.Decimal(String(qty)),
        status: ProductionOrderStatus.DRAFT,
        notes: body.notes ?? null,
      },
      include: { finishedGoods: true },
    });

    res.status(201).json({
      productionOrder: {
        id: created.id,
        orderNumber: created.orderNumber,
        status: created.status,
        quantityOrdered: dec(created.quantityOrdered as never),
      },
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Order number already exists' : 'Could not create production order' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const status = req.body?.status as ProductionOrderStatus | undefined;
  if (!status || !Object.values(ProductionOrderStatus).includes(status)) {
    res.status(400).json({ error: 'Valid status required' });
    return;
  }
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const existing = await prisma.productionOrder.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const updated = await prisma.productionOrder.update({
      where: { id: existing.id },
      data: { status },
    });
    res.json({ productionOrder: updated });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

router.post('/:id/complete', async (req, res) => {
  if (!requireDatabase(res)) return;
  const qty = Number((req.body as { quantity?: number }).quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    res.status(400).json({ error: 'quantity must be a positive number' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    await completeProductionRun({
      companyId: company.id,
      productionOrderId: req.params.id,
      quantityGood: qty,
    });
    const row = await prisma.productionOrder.findFirst({
      where: { id: req.params.id },
    });
    res.json({ success: true, productionOrder: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Complete failed' });
  }
});

export { router as productionOrdersRouter };
