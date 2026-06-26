import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
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
  if (!requireDatabase(res)) return;

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
  if (!requireDatabase(res)) return;
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
  if (!requireDatabase(res)) return;

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
  if (!requireDatabase(res)) return;
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
