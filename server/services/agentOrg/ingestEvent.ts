import { prisma } from '../../lib/prisma';
import type { IngestEventInput } from './types';

export async function ingestAccountingEvent(input: IngestEventInput) {
  const externalId = input.externalId?.trim() || null;

  if (externalId) {
    const existing = await prisma.accountingEvent.findUnique({
      where: {
        companyId_source_externalId: {
          companyId: input.companyId,
          source: input.source,
          externalId,
        },
      },
    });
    if (existing) {
      return { event: existing, replay: true as const };
    }
  }

  const event = await prisma.accountingEvent.create({
    data: {
      companyId: input.companyId,
      source: input.source,
      eventType: input.eventType,
      externalId,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      payloadJson: input.payload,
      status: 'RECEIVED',
    },
  });

  return { event, replay: false as const };
}
