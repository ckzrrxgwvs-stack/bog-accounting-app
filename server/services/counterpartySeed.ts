import type { Prisma } from '@prisma/client';

export type CounterpartyVendorSeed = {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  tax1099Category?: string;
};

export type CounterpartyCustomerSeed = {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
};

export async function seedVendorsTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  vendors: CounterpartyVendorSeed[],
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const v of vendors) {
    const existing = await tx.vendor.findFirst({
      where: { companyId, code: v.code },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await tx.vendor.create({
      data: {
        companyId,
        code: v.code,
        name: v.name,
        email: v.email ?? null,
        phone: v.phone ?? null,
        country: v.country ?? 'US',
        tax1099Category: v.tax1099Category ?? null,
        isActive: true,
      },
    });
    created++;
  }
  return { created, skipped };
}

export async function seedCustomersTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  customers: CounterpartyCustomerSeed[],
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const c of customers) {
    const existing = await tx.customer.findFirst({
      where: { companyId, code: c.code },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await tx.customer.create({
      data: {
        companyId,
        code: c.code,
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        country: c.country ?? 'US',
        isActive: true,
      },
    });
    created++;
  }
  return { created, skipped };
}

/** Investment SMA (Agentic) — vendors & customers in active use. */
export const INVESTMENT_SMA_COUNTERPARTIES = {
  vendors: [
    {
      code: 'V-RH',
      name: 'Robinhood Markets',
      email: 'support@robinhood.com',
      tax1099Category: 'broker',
    },
    {
      code: 'V-RESEND',
      name: 'Resend',
      email: 'support@resend.com',
      tax1099Category: 'software',
    },
    {
      code: 'V-CURSOR',
      name: 'Cursor (Anysphere)',
      email: 'hi@cursor.com',
      tax1099Category: 'software',
    },
  ] satisfies CounterpartyVendorSeed[],
  customers: [
    {
      code: 'C-GP',
      name: 'Manuel Mejia (General Partner)',
      email: 'manuel.ivan.mejia@gmail.com',
    },
  ] satisfies CounterpartyCustomerSeed[],
};

/** Default store / dropship company — separate BOG ledger. */
export const STORE_COUNTERPARTIES = {
  vendors: [
    { code: 'V-SHOPIFY', name: 'Shopify Inc.', email: 'support@shopify.com', tax1099Category: 'platform' },
    { code: 'V-META', name: 'Meta Platforms (Ads)', email: 'ads-support@meta.com', tax1099Category: 'advertising' },
    { code: 'V-SHIPPO', name: 'Shippo', email: 'support@goshippo.com', tax1099Category: 'fulfillment' },
    { code: 'V-ALIEXPRESS', name: 'AliExpress / Alibaba', tax1099Category: 'supplier' },
    { code: 'V-RESEND', name: 'Resend', email: 'support@resend.com', tax1099Category: 'software' },
  ] satisfies CounterpartyVendorSeed[],
  customers: [
    { code: 'C-SHOPIFY-RETAIL', name: 'Shopify Retail Customers (aggregate)' },
    { code: 'C-GP', name: 'Manuel Mejia (Owner)', email: 'manuel.ivan.mejia@gmail.com' },
  ] satisfies CounterpartyCustomerSeed[],
};
