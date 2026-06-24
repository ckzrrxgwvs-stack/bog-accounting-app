import crypto from 'crypto';

/** Sliding window for “same basket” duplicate detection across clerks (minutes). */
export function orderDedupWindowMinutes(): number {
  const n = Number(process.env.ORDER_DEDUP_WINDOW_MINUTES ?? 30);
  return Number.isFinite(n) && n >= 1 && n <= 24 * 60 ? Math.floor(n) : 30;
}

export function hashIdempotencyKey(companyId: string, scope: string, rawKey: string): string {
  const trimmed = rawKey.trim();
  return crypto.createHash('sha256').update(`${companyId}|${scope}|${trimmed}`).digest('hex');
}

export type NormalizedSoLine = {
  inventoryItemId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
};

export function computeSalesOrderFingerprint(
  customerId: string,
  currency: string,
  lines: NormalizedSoLine[]
): string {
  const normalized = [...lines]
    .map((l) => ({
      sku: l.inventoryItemId ?? '',
      d: l.description.trim().toLowerCase(),
      q: l.quantity,
      p: l.unitPrice,
    }))
    .sort((a, b) => `${a.sku}\t${a.d}`.localeCompare(`${b.sku}\t${b.d}`, 'en'));
  const payload = JSON.stringify({
    customerId,
    currency: currency.toUpperCase(),
    lines: normalized,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export type NormalizedPoLine = {
  inventoryItemId: string | null;
  description: string;
  quantity: string;
  unitCost: string;
};

export function computePurchaseOrderFingerprint(
  vendorId: string,
  currency: string,
  lines: NormalizedPoLine[]
): string {
  const normalized = [...lines]
    .map((l) => ({
      sku: l.inventoryItemId ?? '',
      d: l.description.trim().toLowerCase(),
      q: l.quantity,
      c: l.unitCost,
    }))
    .sort((a, b) => `${a.sku}\t${a.d}`.localeCompare(`${b.sku}\t${b.d}`, 'en'));
  const payload = JSON.stringify({
    vendorId,
    currency: currency.toUpperCase(),
    lines: normalized,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}
