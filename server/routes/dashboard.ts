import { Router } from 'express';
import { AccountType, EntryStatus, InvoiceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { resolveCompanyFromRequest } from '../lib/resolveCompany';
import { requireDatabase } from '../lib/requireDatabase';
import { dec } from '../lib/serialize';
import { aggregatePostedJournal, aggregatePostedJournalThrough } from '../services/journalAggregates';

const router = Router();

function monthBounds(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Operational reminders: overdue invoices, draft journals — API consumers / UI dashboard. */
router.get('/summary', async (_req, res) => {
  if (!requireDatabase(res)) return;

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

/** Live KPIs + recent posted journals for dashboard (per ledger book). */
router.get('/financials', async (req, res) => {
  if (!requireDatabase(res)) return;

  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  const year = Number(req.query.year ?? new Date().getFullYear());
  const { start, end } = monthBounds(month, year);

  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }

    const agg = await aggregatePostedJournal(company.id, start, end);
    const accounts = await prisma.account.findMany({ where: { companyId: company.id } });
    const byId = new Map(accounts.map((a) => [a.id, a]));

    let revenue = 0;
    let cogs = 0;
    let expenses = 0;
    for (const [aid, v] of agg) {
      const ac = byId.get(aid);
      if (!ac) continue;
      if (ac.type === AccountType.REVENUE) revenue += v.credit - v.debit;
      else if (ac.type === AccountType.COST_OF_GOODS_SOLD) cogs += v.debit - v.credit;
      else if (ac.type === AccountType.EXPENSE) expenses += v.debit - v.credit;
    }

    const throughAgg = await aggregatePostedJournalThrough(company.id, end);
    let cash = 0;
    for (const ac of accounts) {
      if (ac.type !== AccountType.ASSET) continue;
      const name = ac.name.toLowerCase();
      const code = ac.code;
      if (!name.includes('cash') && code !== '1100' && code !== '1000' && code !== '1200') continue;
      const v = throughAgg.get(ac.id) ?? { debit: 0, credit: 0 };
      cash += v.debit - v.credit;
    }

    const recent = await prisma.journalEntry.findMany({
      where: { companyId: company.id, status: EntryStatus.POSTED },
      orderBy: [{ date: 'desc' }, { entryNumber: 'desc' }],
      take: 5,
      select: { id: true, date: true, description: true, status: true },
    });

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    res.json({
      period: { month, year },
      revenue: Math.round(revenue * 100) / 100,
      expenses: Math.round((cogs + expenses) * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      cash: Math.round(cash * 100) / 100,
      empty: agg.size === 0,
      recentActivity: recent.map((r) => ({
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        description: r.description,
        status: r.status,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as dashboardRouter };
