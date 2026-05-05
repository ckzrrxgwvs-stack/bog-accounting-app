/**
 * Bridges ERP operational documents (PO/SO) to accounting + inventory — BOG-Pi patterns only.
 */
import {
  InvoiceStatus,
  InvoiceType,
  Prisma,
  PurchaseOrderStatus,
  SalesOrderStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dec } from '../lib/serialize';
import { applyPurchaseToStockTx, applySaleFromStockTx } from './inventoryMovement';
import { syncCustomerBalance, syncVendorBalance } from './subledgerSync';

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function receivePurchaseOrderReceipt(params: {
  companyId: string;
  purchaseOrderId: string;
  receipts: { lineId: string; quantity: number }[];
  issueDate?: Date;
}): Promise<{ invoiceId: string }> {
  const { companyId, purchaseOrderId, receipts } = params;
  const issue = params.issueDate ?? new Date();

  if (!receipts.length) throw new Error('Provide at least one receipt line');

  let vendorIdForSync = '';

  const invoiceId = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, companyId },
      include: { lines: true, vendor: true },
    });
    if (!po) throw new Error('Purchase order not found');
    vendorIdForSync = po.vendorId;
    if (![PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(po.status)) {
      throw new Error('PO must be APPROVED or PARTIALLY_RECEIVED before receiving');
    }

    const vendor = await tx.vendor.findFirst({
      where: { id: po.vendorId, companyId },
    });
    if (!vendor) throw new Error('Vendor not found');

    const invoiceLines: {
      description: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      discount: Prisma.Decimal;
      total: Prisma.Decimal;
      inventoryItemId: string | null;
    }[] = [];

    let subtotal = 0;

    for (const r of receipts) {
      const line = po.lines.find((l) => l.id === r.lineId);
      if (!line) throw new Error(`Unknown PO line ${r.lineId}`);
      const qty = r.quantity;
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Invalid receipt quantity');

      const maxRecv = dec(line.quantity as never) - dec(line.quantityReceived as never);
      if (qty > maxRecv + 1e-9) throw new Error(`Receipt exceeds remaining on line ${line.lineNumber}`);

      const uc = dec(line.unitCost as never);
      const lineTotal = roundMoney(qty * uc);
      subtotal += lineTotal;

      invoiceLines.push({
        description: `${po.poNumber} — ${line.description}`,
        quantity: new Prisma.Decimal(String(qty)),
        unitPrice: new Prisma.Decimal(String(uc)),
        discount: new Prisma.Decimal('0'),
        total: new Prisma.Decimal(String(lineTotal)),
        inventoryItemId: line.inventoryItemId,
      });

      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: {
          quantityReceived: new Prisma.Decimal(String(roundMoney(dec(line.quantityReceived as never) + qty))),
        },
      });

      if (line.inventoryItemId) {
        await applyPurchaseToStockTx(tx, {
          companyId,
          itemId: line.inventoryItemId,
          quantity: qty,
          unitCost: uc,
          reference: po.poNumber,
          notes: `PO receipt ${po.poNumber} line ${line.lineNumber}`,
          txDate: issue,
        });
      }
    }

    const taxAmount = 0;
    const total = roundMoney(subtotal + taxAmount);
    const due = new Date(issue);
    due.setDate(due.getDate() + (vendor.paymentTerms ?? 30));

    const invNum = `AP-${po.poNumber}-${Date.now().toString(36).toUpperCase()}`;

    const invoice = await tx.invoice.create({
      data: {
        companyId,
        invoiceNumber: invNum,
        type: InvoiceType.AP_INVOICE,
        vendorId: po.vendorId,
        purchaseOrderId: po.id,
        issueDate: issue,
        dueDate: due,
        currency: po.currency,
        subtotal: new Prisma.Decimal(String(subtotal)),
        taxAmount: new Prisma.Decimal(String(taxAmount)),
        discountAmount: new Prisma.Decimal('0'),
        total: new Prisma.Decimal(String(total)),
        paidAmount: new Prisma.Decimal('0'),
        balance: new Prisma.Decimal(String(total)),
        status: InvoiceStatus.SENT,
        notes: `Vendor bill from PO ${po.poNumber}`,
        lines: { create: invoiceLines },
      },
    });

    const refreshed = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { lines: true },
    });
    if (refreshed) {
      let allReceived = true;
      for (const ln of refreshed.lines) {
        if (dec(ln.quantityReceived as never) + 1e-9 < dec(ln.quantity as never)) {
          allReceived = false;
          break;
        }
      }
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: allReceived ? PurchaseOrderStatus.CLOSED : PurchaseOrderStatus.PARTIALLY_RECEIVED,
        },
      });
    }

    return invoice.id;
  });

  await syncVendorBalance(vendorIdForSync);

  return { invoiceId };
}

export async function shipSalesOrderAndBill(params: {
  companyId: string;
  salesOrderId: string;
  shipments: { lineId: string; quantity: number }[];
  issueDate?: Date;
}): Promise<{ invoiceId: string }> {
  const { companyId, salesOrderId, shipments } = params;
  const issue = params.issueDate ?? new Date();

  if (!shipments.length) throw new Error('Provide at least one shipment line');

  let customerIdForSync = '';

  const invoiceId = await prisma.$transaction(async (tx) => {
    const so = await tx.salesOrder.findFirst({
      where: { id: salesOrderId, companyId },
      include: { lines: true, customer: true },
    });
    if (!so) throw new Error('Sales order not found');
    customerIdForSync = so.customerId;
    if (![SalesOrderStatus.CONFIRMED, SalesOrderStatus.PARTIALLY_SHIPPED].includes(so.status)) {
      throw new Error('Sales order must be CONFIRMED or PARTIALLY_SHIPPED before shipping');
    }

    const customer = await tx.customer.findFirst({
      where: { id: so.customerId, companyId },
    });
    if (!customer) throw new Error('Customer not found');

    const invoiceLines: {
      description: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      discount: Prisma.Decimal;
      total: Prisma.Decimal;
      inventoryItemId: string | null;
    }[] = [];

    let subtotal = 0;

    for (const s of shipments) {
      const line = so.lines.find((l) => l.id === s.lineId);
      if (!line) throw new Error(`Unknown SO line ${s.lineId}`);
      const qty = s.quantity;
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Invalid ship quantity');

      const maxShip = dec(line.quantity as never) - dec(line.quantityShipped as never);
      if (qty > maxShip + 1e-9) throw new Error(`Shipment exceeds remaining on line ${line.lineNumber}`);

      const up = dec(line.unitPrice as never);
      const lineTotal = roundMoney(qty * up);
      subtotal += lineTotal;

      invoiceLines.push({
        description: `${so.soNumber} — ${line.description}`,
        quantity: new Prisma.Decimal(String(qty)),
        unitPrice: new Prisma.Decimal(String(up)),
        discount: new Prisma.Decimal('0'),
        total: new Prisma.Decimal(String(lineTotal)),
        inventoryItemId: line.inventoryItemId,
      });

      await tx.salesOrderLine.update({
        where: { id: line.id },
        data: {
          quantityShipped: new Prisma.Decimal(String(roundMoney(dec(line.quantityShipped as never) + qty))),
        },
      });

      if (line.inventoryItemId) {
        await applySaleFromStockTx(tx, {
          companyId,
          itemId: line.inventoryItemId,
          quantity: qty,
          reference: so.soNumber,
          notes: `SO shipment ${so.soNumber} line ${line.lineNumber}`,
          txDate: issue,
        });
      }
    }

    const taxAmount = 0;
    const total = roundMoney(subtotal + taxAmount);
    const due = new Date(issue);
    due.setDate(due.getDate() + (customer.paymentTerms ?? 30));

    const invNum = `AR-${so.soNumber}-${Date.now().toString(36).toUpperCase()}`;

    const invoice = await tx.invoice.create({
      data: {
        companyId,
        invoiceNumber: invNum,
        type: InvoiceType.AR_INVOICE,
        customerId: so.customerId,
        salesOrderId: so.id,
        issueDate: issue,
        dueDate: due,
        currency: so.currency,
        subtotal: new Prisma.Decimal(String(subtotal)),
        taxAmount: new Prisma.Decimal(String(taxAmount)),
        discountAmount: new Prisma.Decimal('0'),
        total: new Prisma.Decimal(String(total)),
        paidAmount: new Prisma.Decimal('0'),
        balance: new Prisma.Decimal(String(total)),
        status: InvoiceStatus.SENT,
        notes: `Customer invoice from SO ${so.soNumber}`,
        lines: { create: invoiceLines },
      },
    });

    const refreshed = await tx.salesOrder.findUnique({
      where: { id: so.id },
      include: { lines: true },
    });
    if (refreshed) {
      let allShipped = true;
      for (const ln of refreshed.lines) {
        if (dec(ln.quantityShipped as never) + 1e-9 < dec(ln.quantity as never)) {
          allShipped = false;
          break;
        }
      }
      await tx.salesOrder.update({
        where: { id: so.id },
        data: {
          status: allShipped ? SalesOrderStatus.CLOSED : SalesOrderStatus.PARTIALLY_SHIPPED,
        },
      });
    }

    return invoice.id;
  });

  await syncCustomerBalance(customerIdForSync);

  return { invoiceId };
}
