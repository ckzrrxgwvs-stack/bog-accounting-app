import { Router } from 'express';
import { EntryStatus, InvoiceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

/** Operational reminders: overdue invoices, draft journals — API consumers / UI dashboard. */
router.get('/summary', async (_req, res) => {
  if (!useDatabase()) {
    res.json({
      overdueArCount: 0,
      overdueApCount: 0,
      draftJournalCount: 0,
      pendingApprovalJournalCount: 0,
      lowStockItems: 0,
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [overdueAr, overdueAp, drafts, pending, invRows] = await Promise.all([
      prisma.invoice.count({
        where: {
          companyId: company.id,
          type: { in: ['AR_INVOICE', 'AR_CREDIT_MEMO'] },
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
          dueDate: { lt: today },
          balance: { gt: 0 },
        },
      }),
      prisma.invoice.count({
        where: {
          companyId: company.id,
          type: { in: ['AP_INVOICE', 'AP_CREDIT_MEMO'] },
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
          dueDate: { lt: today },
          balance: { gt: 0 },
        },
      }),
      prisma.journalEntry.count({
        where: { companyId: company.id, status: EntryStatus.DRAFT },
      }),
      prisma.journalEntry.count({
        where: { companyId: company.id, status: EntryStatus.PENDING_APPROVAL },
      }),
      prisma.inventoryItem
        .findMany({
          where: { companyId: company.id, isActive: true },
          select: { quantityOnHand: true, reorderPoint: true },
        })
        .catch(() => [] as { quantityOnHand: unknown; reorderPoint: unknown }[]),
    ]);

    const lowStock = invRows.filter((i) => {
      const rp = dec(i.reorderPoint as never);
      const q = dec(i.quantityOnHand as never);
      return rp > 0 && q <= rp;
    }).length;

    res.json({
      overdueArCount: overdueAr,
      overdueApCount: overdueAp,
      draftJournalCount: drafts,
      pendingApprovalJournalCount: pending,
      lowStockItems: lowStock,
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as dashboardRouter };
