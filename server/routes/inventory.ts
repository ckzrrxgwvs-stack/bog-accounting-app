import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

type ItemOut = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  cost: number;
  price: number;
  reorderPoint: number;
  value: number;
};

const mockItems: ItemOut[] = [
  { id: '1', sku: 'PRD-001', name: 'Product A - Standard', category: 'Finished Goods', quantity: 150, unit: 'units', cost: 25, price: 50, reorderPoint: 50, value: 3750 },
  { id: '2', sku: 'PRD-002', name: 'Product B - Premium', category: 'Finished Goods', quantity: 80, unit: 'units', cost: 40, price: 80, reorderPoint: 30, value: 3200 },
];

function mapItem(row: {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  standardCost: unknown;
  listPrice: unknown;
  quantityOnHand: unknown;
  reorderPoint: unknown;
}): ItemOut {
  const qty = dec(row.quantityOnHand as never);
  const cost = dec(row.standardCost as never);
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    quantity: qty,
    unit: row.unit,
    cost,
    price: dec(row.listPrice as never),
    reorderPoint: dec(row.reorderPoint as never),
    value: qty * cost,
  };
}

router.get('/', async (_req, res) => {
  if (!useDatabase()) {
    res.json({ items: mockItems });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.inventoryItem.findMany({
      where: { companyId: company.id },
      orderBy: { sku: 'asc' },
    });
    res.json({ items: rows.map(mapItem) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    sku?: string;
    name?: string;
    category?: string;
    unit?: string;
    standardCost?: number;
    listPrice?: number;
    quantityOnHand?: number;
    reorderPoint?: number;
    description?: string;
  };

  if (!useDatabase()) {
    const item: ItemOut = {
      id: String(mockItems.length + 1),
      sku: body.sku ?? `SKU-${Date.now()}`,
      name: body.name ?? 'New item',
      category: body.category ?? null,
      quantity: Number(body.quantityOnHand) || 0,
      unit: body.unit ?? 'unit',
      cost: Number(body.standardCost) || 0,
      price: Number(body.listPrice) || 0,
      reorderPoint: Number(body.reorderPoint) || 0,
      value: (Number(body.quantityOnHand) || 0) * (Number(body.standardCost) || 0),
    };
    res.status(201).json({ item });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const sku = body.sku?.trim();
    const name = body.name?.trim();
    if (!sku || !name) {
      res.status(400).json({ error: 'sku and name are required' });
      return;
    }

    const standardCost = Number(body.standardCost) || 0;
    const listPrice = Number(body.listPrice) || 0;
    const qty = Number(body.quantityOnHand) || 0;
    const reorder = Number(body.reorderPoint) || 0;

    const row = await prisma.inventoryItem.create({
      data: {
        companyId: company.id,
        sku,
        name,
        description: body.description ?? null,
        category: body.category ?? null,
        unit: body.unit ?? 'unit',
        standardCost,
        lastCost: standardCost,
        quantityOnHand: qty,
        reorderPoint: reorder,
        listPrice,
      },
    });
    res.status(201).json({ item: mapItem(row) });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'SKU already exists' : 'Could not create item' });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const item = mockItems.find((i) => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ item });
    return;
  }

  try {
    const row = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id },
    });
    if (!row) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ item: mapItem(row) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.patch('/:id', async (req, res) => {
  const body = req.body as Partial<{
    name: string;
    category: string;
    unit: string;
    standardCost: number;
    listPrice: number;
    quantityOnHand: number;
    reorderPoint: number;
    isActive: boolean;
  }>;

  if (!useDatabase()) {
    const idx = mockItems.findIndex((i) => i.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const prev = mockItems[idx];
    const item: ItemOut = {
      ...prev,
      ...body,
      quantity: body.quantityOnHand ?? prev.quantity,
      cost: body.standardCost ?? prev.cost,
      price: body.listPrice ?? prev.price,
      reorderPoint: body.reorderPoint ?? prev.reorderPoint,
      value: (body.quantityOnHand ?? prev.quantity) * (body.standardCost ?? prev.cost),
    };
    res.json({ item });
    return;
  }

  try {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.unit !== undefined) data.unit = body.unit;
    if (body.standardCost !== undefined) data.standardCost = body.standardCost;
    if (body.listPrice !== undefined) data.listPrice = body.listPrice;
    if (body.quantityOnHand !== undefined) data.quantityOnHand = body.quantityOnHand;
    if (body.reorderPoint !== undefined) data.reorderPoint = body.reorderPoint;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.standardCost !== undefined) data.lastCost = body.standardCost;

    const row = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ item: mapItem(row) });
  } catch {
    res.status(404).json({ error: 'Item not found' });
  }
});

export { router as inventoryRouter };
