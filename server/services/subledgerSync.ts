import { InvoiceStatus, InvoiceType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dec } from '../lib/serialize';
import { convertCurrencyAmount } from './exchangeRateService';

/** AR open invoice balances → Customer.balance (functional currency when multi-currency is on) */
export async function syncCustomerBalance(customerId: string): Promise<void> {
  const cust = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { companyId: true },
  });
  if (!cust) return;

  const co = await prisma.company.findUnique({ where: { id: cust.companyId } });
  if (!co) return;

  const rows = await prisma.invoice.findMany({
    where: {
      customerId,
      type: { in: [InvoiceType.AR_INVOICE, InvoiceType.AR_CREDIT_MEMO] },
      status: { notIn: [InvoiceStatus.CANCELLED] },
    },
    select: { balance: true, currency: true, issueDate: true },
  });

  const fc = (co.currency ?? 'USD').toUpperCase();
  let sum = 0;
  for (const r of rows) {
    const bal = dec(r.balance as never);
    const cur = (r.currency ?? fc).toUpperCase();
    if (!co.useMultiCurrency || cur === fc) {
      sum += bal;
      continue;
    }
    const c = await convertCurrencyAmount(cust.companyId, bal, cur, fc, r.issueDate);
    if (c != null) sum += c;
    else {
      console.warn(
        `[subledger] missing FX ${cur}→${fc} for AR invoice on ${r.issueDate.toISOString().slice(0, 10)}; using raw balance`
      );
      sum += bal;
    }
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { balance: sum },
  });
}

/** AP open invoice balances → Vendor.balance (functional currency when multi-currency is on) */
export async function syncVendorBalance(vendorId: string): Promise<void> {
  const ven = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { companyId: true },
  });
  if (!ven) return;

  const co = await prisma.company.findUnique({ where: { id: ven.companyId } });
  if (!co) return;

  const rows = await prisma.invoice.findMany({
    where: {
      vendorId,
      type: { in: [InvoiceType.AP_INVOICE, InvoiceType.AP_CREDIT_MEMO] },
      status: { notIn: [InvoiceStatus.CANCELLED] },
    },
    select: { balance: true, currency: true, issueDate: true },
  });

  const fc = (co.currency ?? 'USD').toUpperCase();
  let sum = 0;
  for (const r of rows) {
    const bal = dec(r.balance as never);
    const cur = (r.currency ?? fc).toUpperCase();
    if (!co.useMultiCurrency || cur === fc) {
      sum += bal;
      continue;
    }
    const c = await convertCurrencyAmount(ven.companyId, bal, cur, fc, r.issueDate);
    if (c != null) sum += c;
    else {
      console.warn(
        `[subledger] missing FX ${cur}→${fc} for AP invoice on ${r.issueDate.toISOString().slice(0, 10)}; using raw balance`
      );
      sum += bal;
    }
  }

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { balance: sum },
  });
}
