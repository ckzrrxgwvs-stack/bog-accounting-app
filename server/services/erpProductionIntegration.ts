import { Prisma, ProductionOrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dec } from '../lib/serialize';
import { applyAdjustmentMovementTx } from './inventoryMovement';

export async function completeProductionRun(params: {
  companyId: string;
  productionOrderId: string;
  quantityGood: number;
}): Promise<void> {
  const { companyId, productionOrderId, quantityGood } = params;
  if (quantityGood <= 0) throw new Error('Completed quantity must be positive');

  await prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findFirst({
      where: { id: productionOrderId, companyId },
      include: {
        bomHeader: { include: { lines: true } },
      },
    });
    if (!order) throw new Error('Production order not found');
    if (order.status !== ProductionOrderStatus.RELEASED) {
      throw new Error('Release the production order before completion');
    }

    const remaining = dec(order.quantityOrdered as never) - dec(order.quantityCompleted as never);
    if (quantityGood > remaining + 1e-9) throw new Error('Quantity exceeds remaining on the work order');

    let bom = order.bomHeader;
    if (!bom) {
      bom = await tx.bomHeader.findFirst({
        where: { companyId, finishedGoodsItemId: order.finishedGoodsItemId },
        include: { lines: true },
      });
    }
    if (!bom?.lines.length) {
      throw new Error('Add a bill of materials for this finished good (ERP → BOM) before completing production');
    }

    let fgUnitCost = 0;
    for (const bl of bom.lines) {
      const comp = await tx.inventoryItem.findFirst({
        where: { id: bl.componentItemId, companyId },
      });
      if (!comp) throw new Error('BOM references a missing component item');
      fgUnitCost += dec(bl.quantityPer as never) * dec(comp.standardCost as never);
    }
    fgUnitCost = Math.round(fgUnitCost * 10000) / 10000;

    for (const bl of bom.lines) {
      const need = quantityGood * dec(bl.quantityPer as never);
      const comp = await tx.inventoryItem.findFirst({
        where: { id: bl.componentItemId, companyId },
      });
      if (!comp) throw new Error('Component not found');
      const uc = dec(comp.standardCost as never);
      await applyAdjustmentMovementTx(tx, {
        companyId,
        itemId: bl.componentItemId,
        quantityDelta: need,
        unitCost: uc,
        type: 'ADJUSTMENT_OUT',
        reference: order.orderNumber,
        notes: `WIP consume — ${order.orderNumber}`,
      });
    }

    await applyAdjustmentMovementTx(tx, {
      companyId,
      itemId: order.finishedGoodsItemId,
      quantityDelta: quantityGood,
      unitCost: fgUnitCost,
      type: 'ADJUSTMENT_IN',
      reference: order.orderNumber,
      notes: `Finished goods — ${order.orderNumber}`,
    });

    const newDone = dec(order.quantityCompleted as never) + quantityGood;
    const ordered = dec(order.quantityOrdered as never);
    const done = newDone >= ordered - 1e-9;

    await tx.productionOrder.update({
      where: { id: order.id },
      data: {
        quantityCompleted: new Prisma.Decimal(String(newDone)),
        status: done ? ProductionOrderStatus.COMPLETED : ProductionOrderStatus.RELEASED,
      },
    });
  });
}
