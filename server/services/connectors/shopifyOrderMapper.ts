import type { SaleOrderPaidPayload } from '../agentOrg/types';

/** Minimal Shopify order JSON (orders/paid webhook). */
export type ShopifyOrderBody = {
  id?: number | string;
  name?: string;
  order_number?: number;
  email?: string;
  currency?: string;
  subtotal_price?: string;
  total_tax?: string;
  total_price?: string;
  financial_status?: string;
  processed_at?: string;
  customer?: { first_name?: string; last_name?: string; email?: string };
};

function num(s: string | undefined): number | undefined {
  if (s == null || s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function mapShopifyOrderToSalePayload(order: ShopifyOrderBody): SaleOrderPaidPayload {
  const customer = order.customer;
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim();
  return {
    orderNumber: order.name ?? (order.order_number != null ? String(order.order_number) : undefined),
    customerName: name || undefined,
    customerEmail: customer?.email ?? order.email,
    currency: order.currency?.toUpperCase(),
    subtotal: num(order.subtotal_price),
    taxAmount: num(order.total_tax),
    total: num(order.total_price),
    paidAt: order.processed_at,
  };
}

export function shopifyOrderExternalId(order: ShopifyOrderBody): string {
  return String(order.id ?? '');
}
