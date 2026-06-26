import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

/** List BOMs (one row per finished good) */
router.get('/', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.bomHeader.findMany({
      where: { companyId: company.id },
      include: {
        finishedGoods: { select: { id: true, sku: true, name: true } },
        lines: { include: { component: { select: { id: true, sku: true, name: true } } } },
      },
    });
    res.json({
      boms: rows.map((b) => ({
        id: b.id,
        finishedGoodsItemId: b.finishedGoodsItemId,
        finishedSku: b.finishedGoods.sku,
        finishedName: b.finishedGoods.name,
        lineCount: b.lines.length,
        lines: b.lines.map((l) => ({
          id: l.id,
          componentId: l.componentItemId,
          componentSku: l.component.sku,
          componentName: l.component.name,
          quantityPer: dec(l.quantityPer as never),
        })),
        notes: b.notes,
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
    lines?: { componentItemId?: string; quantityPer?: number }[];
    notes?: string;
  };

  if (!requireDatabase(res)) return;

  if (!body.finishedGoodsItemId || !Array.isArray(body.lines) || body.lines.length === 0) {
    res.status(400).json({ error: 'finishedGoodsItemId and lines[] required' });
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

    const creates: { componentItemId: string; quantityPer: Prisma.Decimal }[] = [];
    for (const ln of body.lines) {
      const q = Number(ln.quantityPer);
      if (!ln.componentItemId || !Number.isFinite(q) || q <= 0) {
        res.status(400).json({ error: 'Each BOM line needs componentItemId and positive quantityPer' });
        return;
      }
      const comp = await prisma.inventoryItem.findFirst({
        where: { id: ln.componentItemId, companyId: company.id },
      });
      if (!comp) {
        res.status(400).json({ error: `Component ${ln.componentItemId} not found` });
        return;
      }
      creates.push({
        componentItemId: comp.id,
        quantityPer: new Prisma.Decimal(String(q)),
      });
    }

    const bom = await prisma.bomHeader.create({
      data: {
        companyId: company.id,
        finishedGoodsItemId: fg.id,
        notes: body.notes ?? null,
        lines: { create: creates },
      },
      include: {
        finishedGoods: true,
        lines: { include: { component: true } },
      },
    });

    res.status(201).json({
      bom: {
        id: bom.id,
        finishedGoodsItemId: bom.finishedGoodsItemId,
        lines: bom.lines.map((l) => ({
          componentItemId: l.componentItemId,
          quantityPer: dec(l.quantityPer as never),
        })),
      },
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'BOM already exists for this finished good' : 'Could not create BOM' });
  }
});

export { router as bomRouter };
