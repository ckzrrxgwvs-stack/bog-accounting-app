import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type DocumentCounterScope = 'SALES_ORDER' | 'PURCHASE_ORDER';

/**
 * Next sequence for SO/PO numbering. Pass `tx` when already inside a Serializable transaction.
 */
export async function allocateNextDocumentSeq(
  companyId: string,
  scope: DocumentCounterScope,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const upsert = async (client: Prisma.TransactionClient | typeof prisma) => {
    const row = await client.documentCounter.upsert({
      where: {
        companyId_scope: { companyId, scope },
      },
      create: { companyId, scope, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return row.lastValue;
  };

  if (tx) {
    return upsert(tx);
  }

  return prisma.$transaction(
    async (inner) => upsert(inner),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export function formatSalesOrderNumber(seq: number): string {
  return `SO-${String(seq).padStart(7, '0')}`;
}

export function formatPurchaseOrderNumber(seq: number): string {
  return `PO-${String(seq).padStart(7, '0')}`;
}
