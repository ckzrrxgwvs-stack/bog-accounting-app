import { prisma } from '../../lib/prisma';

/** PM orchestrator digest — open work, stuck events, recent intake. */
export async function buildPmDigest(companyId: string) {
  const [openWork, blockedWork, needsReviewEvents, receivedEvents, recentEvents] = await Promise.all([
    prisma.agentWorkItem.count({
      where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.agentWorkItem.count({ where: { companyId, status: 'BLOCKED' } }),
    prisma.accountingEvent.count({ where: { companyId, status: 'NEEDS_REVIEW' } }),
    prisma.accountingEvent.count({ where: { companyId, status: 'RECEIVED' } }),
    prisma.accountingEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        source: true,
        eventType: true,
        status: true,
        externalId: true,
        createdAt: true,
      },
    }),
  ]);

  const workByRole = await prisma.agentWorkItem.groupBy({
    by: ['agentRole'],
    where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } },
    _count: { _all: true },
  });

  return {
    summary: {
      openWorkItems: openWork,
      blockedWorkItems: blockedWork,
      eventsNeedsReview: needsReviewEvents,
      eventsAwaitingBookkeeper: receivedEvents,
    },
    workByRole: workByRole.map((r) => ({ role: r.agentRole, count: r._count._all })),
    recentEvents,
  };
}
