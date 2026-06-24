import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { SaleOrderPaidPayload } from '../agentOrg/types';

async function findOrCreateShopifyCustomer(
  companyId: string,
  payload: SaleOrderPaidPayload
): Promise<string | null> {
  const email = payload.customerEmail?.trim().toLowerCase();
  const name = payload.customerName?.trim() || (email ? email.split('@')[0] : 'Shopify Customer');

  if (email) {
    const byEmail = await prisma.customer.findFirst({
      where: { companyId, email: { equals: email, mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const count = await prisma.customer.count({ where: { companyId } });
  const code = `SHOP-${String(count + 1).padStart(4, '0')}`;

  const created = await prisma.customer.create({
    data: {
      companyId,
      code,
      name,
      email: email || null,
      isActive: true,
      balance: 0,
    },
    select: { id: true },
  });
  return created.id;
}

/** Draft AR invoice from a classified sale — does not post to GL. */
export async function draftArInvoiceFromSale(
  companyId: string,
  eventId: string,
  payload: SaleOrderPaidPayload,
  externalId: string | null
) {
  const total = payload.total ?? payload.subtotal;
  if (total == null || total < 0) {
    throw new Error('Sale payload missing total');
  }

  const invNum = payload.orderNumber
    ? `SHOPIFY-${payload.orderNumber.replace(/^#/, '')}`
    : `SHOPIFY-${externalId ?? eventId.slice(0, 8)}`;

  const existing = await prisma.invoice.findFirst({
    where: { companyId, invoiceNumber: invNum },
    select: { id: true },
  });
  if (existing) {
    return { invoiceId: existing.id, created: false as const };
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { currency: true, useMultiCurrency: true },
  });
  const fc = (company.currency ?? 'USD').toUpperCase();
  let currency = (payload.currency ?? fc).toUpperCase();
  if (!company.useMultiCurrency) currency = fc;

  const subtotal = payload.subtotal ?? total;
  const taxAmount = payload.taxAmount ?? Math.max(0, total - subtotal);
  const customerId = await findOrCreateShopifyCustomer(companyId, payload);
  const issue = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const due = new Date(issue.getTime() + 30 * 86400000);

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNumber: invNum,
      type: 'AR_INVOICE',
      customerId,
      issueDate: issue,
      dueDate: due,
      currency,
      subtotal,
      taxAmount,
      discountAmount: 0,
      total,
      paidAmount: 0,
      balance: total,
      status: InvoiceStatus.DRAFT,
      lines: {
        create: [
          {
            description: `Shopify order ${payload.orderNumber ?? externalId ?? ''}`.trim(),
            quantity: 1,
            unitPrice: subtotal,
            discount: 0,
            total: subtotal,
            taxRate: subtotal > 0 && taxAmount > 0 ? (taxAmount / subtotal) * 100 : null,
          },
        ],
      },
    },
    select: { id: true },
  });

  return { invoiceId: invoice.id, created: true as const };
}
