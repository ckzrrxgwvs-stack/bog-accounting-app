import type { Decimal } from '@prisma/client/runtime/library';

export function dec(v: Decimal | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'object' && 'toNumber' in v ? (v as Decimal).toNumber() : Number(v);
}
