import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dec } from '../lib/serialize';

type Tx = PrismaTypes.TransactionClient;

export async function applyPurchaseToStockTx(
  tx: Tx,
  params: {
    companyId: string;
    itemId: string;
    quantity: number;
    unitCost: number;
    reference: string;
    notes?: string;
    txDate?: Date;
  }
): Promise<void> {
  const { companyId, itemId, quantity, unitCost, reference, notes } = params;
  const q = quantity;
  const uc = unitCost;
  if (q <= 0 || uc < 0) throw new Error('Invalid purchase quantity or cost');

  const item = await tx.inventoryItem.findFirst({
    where: { id: itemId, companyId },
  });
  if (!item) throw new Error('Item not found for company');

  const oldQ = dec(item.quantityOnHand as never);
  const oldStd = dec(item.standardCost as never);
  const totalCost = Math.round(q * uc * 100) / 100;
  const newQ = oldQ + q;
  const newAvg = newQ > 0 ? (oldQ * oldStd + q * uc) / newQ : oldStd;
  const runQty = newQ;
  const runVal = Math.round(newQ * newAvg * 100) / 100;

  await tx.inventoryTransaction.create({
    data: {
      companyId,
      itemId,
      type: 'PURCHASE',
      date: params.txDate ?? new Date(),
      quantity: new Prisma.Decimal(String(q)),
      unitCost: new Prisma.Decimal(String(uc)),
      totalCost: new Prisma.Decimal(String(totalCost)),
      reference,
      notes: notes ?? null,
      runningQuantity: new Prisma.Decimal(String(runQty)),
      runningValue: new Prisma.Decimal(String(runVal)),
    },
  });

  await tx.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantityOnHand: new Prisma.Decimal(String(newQ)),
      lastCost: new Prisma.Decimal(String(uc)),
      standardCost: new Prisma.Decimal(String(newAvg)),
    },
  });
}

export async function applyPurchaseToStock(params: {
  companyId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  reference: string;
  notes?: string;
  txDate?: Date;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await applyPurchaseToStockTx(tx, params);
  });
}

export async function applySaleFromStockTx(
  tx: Tx,
  params: {
    companyId: string;
    itemId: string;
    quantity: number;
    reference: string;
    notes?: string;
    txDate?: Date;
  }
): Promise<{ unitCost: number; totalCost: number }> {
  const { companyId, itemId, quantity, reference, notes } = params;
  const q = quantity;
  if (q <= 0) throw new Error('Invalid sale quantity');

  const item = await tx.inventoryItem.findFirst({
    where: { id: itemId, companyId },
  });
  if (!item) throw new Error('Item not found for company');

  const oldQ = dec(item.quantityOnHand as never);
  if (oldQ + 1e-9 < q) throw new Error('Insufficient quantity on hand');
  const uc = dec(item.standardCost as never);
  const totalCost = Math.round(q * uc * 100) / 100;
  const newQ = oldQ - q;
  const runQty = newQ;
  const runVal = Math.round(newQ * uc * 100) / 100;

  await tx.inventoryTransaction.create({
    data: {
      companyId,
      itemId,
      type: 'SALE',
      date: params.txDate ?? new Date(),
      quantity: new Prisma.Decimal(String(q)),
      unitCost: new Prisma.Decimal(String(uc)),
      totalCost: new Prisma.Decimal(String(totalCost)),
      reference,
      notes: notes ?? null,
      runningQuantity: new Prisma.Decimal(String(runQty)),
      runningValue: new Prisma.Decimal(String(runVal)),
    },
  });

  await tx.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantityOnHand: new Prisma.Decimal(String(newQ)),
    },
  });

  return { unitCost: uc, totalCost };
}

export async function applySaleFromStock(params: {
  companyId: string;
  itemId: string;
  quantity: number;
  reference: string;
  notes?: string;
  txDate?: Date;
}): Promise<{ unitCost: number; totalCost: number }> {
  return prisma.$transaction(async (tx) => applySaleFromStockTx(tx, params));
}

export async function applyAdjustmentMovementTx(
  tx: Tx,
  params: {
    companyId: string;
    itemId: string;
    quantityDelta: number;
    unitCost: number;
    type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    reference: string;
    notes?: string;
    txDate?: Date;
  }
): Promise<void> {
  const { companyId, itemId, quantityDelta, unitCost, type, reference, notes } = params;
  const absQ = Math.abs(quantityDelta);
  if (absQ <= 0) throw new Error('Invalid adjustment quantity');

  const item = await tx.inventoryItem.findFirst({
    where: { id: itemId, companyId },
  });
  if (!item) throw new Error('Item not found for company');

  const oldQ = dec(item.quantityOnHand as never);
  const std = dec(item.standardCost as never);
  const delta = type === 'ADJUSTMENT_IN' ? absQ : -absQ;
  const newQ = oldQ + delta;
  if (newQ < -1e-9) throw new Error('Adjustment would drive quantity negative');

  const tc = Math.round(absQ * unitCost * 100) / 100;
  const runQty = Math.max(0, newQ);
  const oldVal = oldQ * std;
  const runVal =
    type === 'ADJUSTMENT_IN'
      ? Math.round((oldVal + tc) * 100) / 100
      : Math.max(0, Math.round((oldVal - tc) * 100) / 100);

  await tx.inventoryTransaction.create({
    data: {
      companyId,
      itemId,
      type,
      date: params.txDate ?? new Date(),
      quantity: new Prisma.Decimal(String(absQ)),
      unitCost: new Prisma.Decimal(String(unitCost)),
      totalCost: new Prisma.Decimal(String(tc)),
      reference,
      notes: notes ?? null,
      runningQuantity: new Prisma.Decimal(String(runQty)),
      runningValue: new Prisma.Decimal(String(runVal)),
    },
  });

  await tx.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantityOnHand: new Prisma.Decimal(String(Math.max(0, newQ))),
      ...(type === 'ADJUSTMENT_IN' ? { lastCost: new Prisma.Decimal(String(unitCost)) } : {}),
    },
  });
}

export async function applyAdjustmentMovement(params: {
  companyId: string;
  itemId: string;
  quantityDelta: number;
  unitCost: number;
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  reference: string;
  notes?: string;
  txDate?: Date;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await applyAdjustmentMovementTx(tx, params);
  });
}
