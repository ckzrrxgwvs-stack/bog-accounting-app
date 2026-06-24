import { prisma } from '../../lib/prisma';
import type { SaleOrderPaidPayload } from './types';
import { draftArInvoiceFromSale } from './draftArFromSale';

const BATCH = Number(process.env.AGENT_BOOKKEEPER_BATCH ?? 25);

function summarizeSale(payload: SaleOrderPaidPayload): string {
  const parts = [
    payload.orderNumber ? `order ${payload.orderNumber}` : null,
    payload.customerName ? `customer ${payload.customerName}` : null,
    payload.total != null ? `total ${payload.total} ${payload.currency ?? 'USD'}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'sale event';
}

async function ensureControllerReview(
  companyId: string,
  eventId: string,
  title: string,
  description: string
) {
  const existing = await prisma.agentWorkItem.findFirst({
    where: {
      companyId,
      eventId,
      agentRole: 'CONTROLLER',
      status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
    },
  });
  if (existing) return existing;

  return prisma.agentWorkItem.create({
    data: {
      companyId,
      agentRole: 'CONTROLLER',
      eventId,
      title,
      description,
      priority: 30,
      status: 'OPEN',
      createdBy: 'BOOKKEEPER',
    },
  });
}

async function processOneEvent(eventId: string) {
  const event = await prisma.accountingEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'RECEIVED') {
    return { skipped: true as const, eventId };
  }

  await prisma.accountingEvent.update({
    where: { id: eventId },
    data: { status: 'QUEUED' },
  });

  try {
    if (event.eventType === 'SALE_ORDER_PAID') {
      const payload = event.payloadJson as SaleOrderPaidPayload;
      const summary = summarizeSale(payload);

      let invoiceId: string | undefined;
      let draftNote = '';
      try {
        const draft = await draftArInvoiceFromSale(
          event.companyId,
          eventId,
          payload,
          event.externalId
        );
        invoiceId = draft.invoiceId;
        draftNote = draft.created
          ? 'Draft AR invoice created.'
          : 'Existing draft AR invoice linked.';
      } catch (draftErr) {
        draftNote =
          draftErr instanceof Error
            ? `Could not auto-draft invoice: ${draftErr.message}`
            : 'Could not auto-draft invoice.';
      }

      await prisma.accountingEvent.update({
        where: { id: eventId },
        data: {
          status: 'DRAFT_READY',
          statusMessage: `Bookkeeper classified ${summary}. ${draftNote} Controller must approve before GL post.`,
          invoiceId: invoiceId ?? null,
          processedAt: new Date(),
        },
      });

      await ensureControllerReview(
        event.companyId,
        eventId,
        `Approve AR draft — ${summary}`,
        [
          'Bookkeeper created or linked a DRAFT AR invoice from this sale.',
          'Controller: verify amounts vs Shopify, then post to ledger from AR when ready.',
          `Source: ${event.source}. External id: ${event.externalId ?? 'n/a'}.`,
          invoiceId ? `Invoice id: ${invoiceId}` : draftNote,
        ].join('\n')
      );

      return { processed: true as const, eventId, outcome: 'DRAFT_READY' as const };
    }

    await prisma.accountingEvent.update({
      where: { id: eventId },
      data: {
        status: 'NEEDS_REVIEW',
        statusMessage: `Event type ${event.eventType} received; no auto-handler yet — Controller or PM to route.`,
        processedAt: new Date(),
      },
    });

    await ensureControllerReview(
      event.companyId,
      eventId,
      `Review event — ${event.eventType}`,
      `Unhandled event type. PM may open a Systems Engineer build ticket.`
    );

    return { processed: true as const, eventId, outcome: 'NEEDS_REVIEW' as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bookkeeper processing failed';
    await prisma.accountingEvent.update({
      where: { id: eventId },
      data: { status: 'FAILED', statusMessage: message, processedAt: new Date() },
    });
    return { processed: false as const, eventId, error: message };
  }
}

/** Process RECEIVED accounting events for one company (or all companies when companyId omitted). */
export async function runBookkeeperJob(companyId?: string) {
  const pending = await prisma.accountingEvent.findMany({
    where: {
      status: 'RECEIVED',
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
    select: { id: true },
  });

  const results = [];
  for (const row of pending) {
    results.push(await processOneEvent(row.id));
  }

  return {
    scanned: pending.length,
    results,
  };
}
