/**
 * Seed AgentWorkItem backlog for @bog-systems-engineer (idempotent by title).
 * Usage: pnpm run seed:autonomy-backlog
 */
import { config } from 'dotenv';
import type { AgentRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

config({ override: true });

type Ticket = {
  agentRole: AgentRole;
  title: string;
  description: string;
  priority: number;
  filedBy: string;
  buildSpecJson: Record<string, unknown>;
};

const TICKETS: Ticket[] = [
  {
    agentRole: 'SYSTEMS_ENGINEER',
    title: 'Dashboard AR/AP aging bucket breakdown',
    priority: 20,
    filedBy: '@bog-bookkeeper + @bog-controller',
    description:
      'Dashboard shows AR/AP totals only. Bookkeeper needs Current / 1-30 / 31-60 / 60+ buckets from open invoices, matching reports aging logic.',
    buildSpecJson: {
      goal: 'Live aging buckets on Dashboard and reusable API shape',
      acceptance: [
        'GET /api/invoices/aging returns bucket amounts used by Dashboard',
        'Dashboard renders four buckets per AR and AP with fmtMoney',
        'Uses open AR/AP invoices only (not PAID/CANCELLED)',
        'Empty state when no open balances',
      ],
      files: ['src/pages/Dashboard.tsx', 'server/routes/invoices.ts', 'src/services/api.ts'],
      reuse: ['agingBucketsFromInvoices in invoices.ts', 'getArAgingReport / getApAgingReport'],
      outOfScope: ['mock data when DB absent'],
    },
  },
  {
    agentRole: 'SYSTEMS_ENGINEER',
    title: 'Bank feed integration stub (read-only)',
    priority: 35,
    filedBy: '@bog-connector + @bog-controller',
    description:
      'Placeholder for bank transaction ingest: schema, API routes, Settings UI toggle — no live Plaid/MX credentials until Human approves.',
    buildSpecJson: {
      goal: 'BankFeedAccount + BankFeedTransaction models and manual CSV import path',
      acceptance: [
        'Prisma models with companyId, account mask, transaction date/amount/memo',
        'POST /api/bank-feeds/import-csv accepts mapped columns (dry-run + commit)',
        'Settings integrations tab shows connected/disconnected state from DB',
        'Idempotent import via externalId or hash dedup',
        'No outbound payments or auto-GL post',
      ],
      files: [
        'prisma/schema.prisma',
        'server/routes/bankFeeds.ts',
        'server/services/bankFeedImport.ts',
        'src/pages/Settings.tsx',
      ],
      reuse: ['CreationDedupKey pattern', 'company settings useBankFeeds flag'],
      outOfScope: ['Live Plaid/MX OAuth', 'auto-reconcile to GL'],
    },
  },
  {
    agentRole: 'SYSTEMS_ENGINEER',
    title: 'Period close wizard UI',
    priority: 25,
    filedBy: '@bog-controller',
    description:
      'Controller needs a guided close: validate trial balance, list unposted drafts, lock period — wired to existing period-close API.',
    buildSpecJson: {
      goal: 'Period close page with stepper calling /api/period-close',
      acceptance: [
        'New page or modal: select year/month, show TB balanced check',
        'List DRAFT/PENDING_APPROVAL journals in period before close',
        'Close action calls existing close endpoint; surfaces errors',
        'President/CFO role gate matches API',
        'Audit log entry visible after successful close',
      ],
      files: [
        'src/pages/PeriodClose.tsx',
        'server/routes/period-close.ts',
        'src/services/api.ts',
        'src/App.tsx',
      ],
      reuse: ['period-close routes', 'reports trial-balance', 'permissions.ts'],
      outOfScope: ['Auto-reverse adjusting entries'],
    },
  },
  {
    agentRole: 'SYSTEMS_ENGINEER',
    title: 'Crew journal ingest status panel',
    priority: 40,
    filedBy: '@bog-connector',
    description:
      'Surface dropship + investment-fund push status: last sync time, draft vs posted counts per ledger book.',
    buildSpecJson: {
      goal: 'Agent-org or dashboard widget for connector health',
      acceptance: [
        'GET /api/agent-org/ingest-summary by source (dropship, robinhood, shopify)',
        'Shows count DRAFT vs POSTED journals per book last 30 days',
        'Link to post:draft-journals hint when drafts > 0',
        'No secrets in response',
      ],
      files: ['server/routes/agentOrg.ts', 'src/pages/Dashboard.tsx'],
      reuse: ['journalSourceType on entries', 'INVESTMENT_BOOKS'],
      outOfScope: ['Triggering crew push from UI'],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required. Run: pnpm run go-live:local');
    process.exit(1);
  }

  const company = await getOrCreateDefaultCompany();
  let created = 0;
  let skipped = 0;

  for (const t of TICKETS) {
    const existing = await prisma.agentWorkItem.findFirst({
      where: { companyId: company.id, title: t.title, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } },
    });
    if (existing) {
      console.log(`  skip (open): ${t.title}`);
      skipped++;
      continue;
    }

    await prisma.agentWorkItem.create({
      data: {
        companyId: company.id,
        agentRole: t.agentRole,
        title: t.title,
        description: `${t.description}\n\nFiled by: ${t.filedBy}`,
        priority: t.priority,
        buildSpecJson: t.buildSpecJson,
        createdBy: 'PM_ORCHESTRATOR',
      },
    });
    console.log(`  created: [P${t.priority}] ${t.title}`);
    created++;
  }

  console.log(`\nDone. created=${created} skipped=${skipped} company=${company.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
