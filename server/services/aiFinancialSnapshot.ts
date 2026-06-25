import { AccountType, InvoiceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { getOrCreateInvestmentCompany } from './investmentBooks';
import {
  aggregatePostedJournal,
  aggregatePostedJournalThrough,
  signedBalanceForAccount,
} from './journalAggregates';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

/** Live books data for AI CPA — commerce + investment ledgers. */
export async function buildFinancialSnapshot(): Promise<string> {
  if (!databaseConfigured()) {
    return '[Financial snapshot unavailable: DATABASE_URL not connected. Answer with GAAP guidance only; tell user to connect the API database.]';
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const mtdStart = new Date(year, month - 1, 1);
    const ytdStart = new Date(year, 0, 1);

    const [mtdAgg, ytdAgg, throughAgg, accounts, jeCounts, arOpen, apOpen] = await Promise.all([
      aggregatePostedJournal(company.id, mtdStart, now),
      aggregatePostedJournal(company.id, ytdStart, now),
      aggregatePostedJournalThrough(company.id, now),
      prisma.account.findMany({
        where: { companyId: company.id, isActive: true },
        orderBy: { code: 'asc' },
      }),
      prisma.journalEntry.groupBy({
        by: ['status'],
        where: { companyId: company.id },
        _count: { id: true },
      }),
      prisma.invoice.count({
        where: {
          companyId: company.id,
          type: 'AR_INVOICE',
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        },
      }),
      prisma.invoice.count({
        where: {
          companyId: company.id,
          type: 'AP_INVOICE',
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        },
      }),
    ]);

    let mtdRevenue = 0;
    let mtdCogs = 0;
    let mtdExpenses = 0;
    let ytdRevenue = 0;
    let ytdCogs = 0;
    let ytdExpenses = 0;

    const byId = new Map(accounts.map((a) => [a.id, a]));
    const sumAgg = (agg: Map<string, { debit: number; credit: number }>) => {
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
      return { revenue, cogs, expenses };
    };

    const mtd = sumAgg(mtdAgg);
    const ytd = sumAgg(ytdAgg);
    mtdRevenue = mtd.revenue;
    mtdCogs = mtd.cogs;
    mtdExpenses = mtd.expenses;
    ytdRevenue = ytd.revenue;
    ytdCogs = ytd.cogs;
    ytdExpenses = ytd.expenses;

    const mtdNet = mtdRevenue - mtdCogs - mtdExpenses;
    const ytdNet = ytdRevenue - ytdCogs - ytdExpenses;

    const balances = accounts.map((a) => {
      const v = throughAgg.get(a.id) ?? { debit: 0, credit: 0 };
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        balance: signedBalanceForAccount(a.type, v.debit, v.credit),
      };
    });

    const nonZero = balances.filter((b) => Math.abs(b.balance) > 0.01).slice(0, 24);
    const cashAccounts = balances.filter(
      (b) => b.type === AccountType.ASSET && /cash|bank/i.test(b.name) && Math.abs(b.balance) > 0.01
    );
    const jeSummary = jeCounts.map((r) => `${r.status}:${r._count.id}`).join(', ');

    const investmentBlocks: string[] = [];
    for (const bookId of ['investment_personal', 'investment_sma'] as const) {
      try {
        const invCo = await getOrCreateInvestmentCompany(bookId);
        const invAccounts = await prisma.account.findMany({
          where: { companyId: invCo.id, isActive: true },
          orderBy: { code: 'asc' },
        });
        const invAgg = await aggregatePostedJournalThrough(invCo.id, now);
        const lines = invAccounts
          .map((a) => {
            const v = invAgg.get(a.id) ?? { debit: 0, credit: 0 };
            const bal = signedBalanceForAccount(a.type, v.debit, v.credit);
            return Math.abs(bal) > 0.01 ? `  ${a.code} ${a.name}: ${fmt(bal)}` : null;
          })
          .filter(Boolean);
        if (lines.length > 0) {
          investmentBlocks.push(`### ${invCo.name}\n${lines.join('\n')}`);
        }
      } catch {
        /* skip */
      }
    }

    return `## Company: ${company.name} (Commerce ledger)
As-of: ${now.toISOString().slice(0, 10)}

### Income (posted journals)
- MTD (${month}/${year}): Revenue ${fmt(mtdRevenue)}, COGS ${fmt(mtdCogs)}, Expenses ${fmt(mtdExpenses)}, Net ${fmt(mtdNet)}
- YTD (${year}): Revenue ${fmt(ytdRevenue)}, COGS ${fmt(ytdCogs)}, Expenses ${fmt(ytdExpenses)}, Net ${fmt(ytdNet)}

### Open documents
- AR invoices (open): ${arOpen}
- AP invoices (open): ${apOpen}

### Journal entries by status
${jeSummary || 'none'}

### Cash & liquidity (commerce)
${cashAccounts.length ? cashAccounts.map((b) => `- ${b.code} ${b.name}: ${fmt(b.balance)}`).join('\n') : '- (no cash balance posted yet)'}

### Commerce account balances (non-zero)
${nonZero.length ? nonZero.map((b) => `- ${b.code} ${b.name} (${b.type}): ${fmt(b.balance)}`).join('\n') : '- (all zero — post journals or use Opening balances)'}

${investmentBlocks.length ? `## Investment ledgers (separate books)\n${investmentBlocks.join('\n\n')}` : ''}

When the user asks for a report, quote these figures directly in a clear table or bullet list. Do not say you lack access if the numbers appear above. For PDF/export, direct them to Reports in the app sidebar.`;
  } catch (e) {
    console.error('buildFinancialSnapshot', e);
    return '[Financial snapshot error — use Reports menu for trial balance, income statement, balance sheet.]';
  }
}
