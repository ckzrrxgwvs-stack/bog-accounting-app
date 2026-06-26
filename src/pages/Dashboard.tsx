// Dashboard page con personalidad

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  Package,
  Receipt,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { useServerMode } from '@/hooks/useServerMode';
import { StatusBadge, FeatureBadge } from '@/components/StatusBadge';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

function KPICard({ title, value, change, icon, trend = 'neutral', highlight = false }: KPICardProps) {
  return (
    <div
      className={`rounded-lg p-5 transition-shadow hover:shadow-md ${
      highlight
        ? 'border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white shadow-sm'
        : 'bog-statement-card'
    }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`bog-section-label ${highlight ? '!text-zinc-400' : ''}`}>{title}</span>
        <div className={`rounded-md p-2 ${highlight ? 'bg-white/10' : 'bg-bog-sheet'}`}>
          {icon}
        </div>
      </div>
      <div className={`font-figures text-3xl font-semibold tracking-tight mb-2 ${highlight ? 'text-white' : 'text-bog-ink'}`}>{value}</div>
      {change !== undefined && (
        <div
          className={`inline-flex items-center text-sm font-medium rounded-full px-2.5 py-1 ${
            highlight
              ? trend === 'up'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
              : trend === 'up'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
          {change > 0 ? '+' : ''}{change}% vs last month
        </div>
      )}
    </div>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

function QuickAction({ title, description, href, icon, badge }: QuickActionProps) {
  return (
    <Link
      to={href}
      className="group bog-statement-card flex items-center p-4 transition-all hover:border-[hsl(var(--bog-accent))]/40 hover:shadow-md"
    >
      <div className="rounded-md bg-bog-sheet p-3 transition-colors group-hover:bg-bog-ink group-hover:text-white">
        {icon}
      </div>
      <div className="ml-4 flex-1">
        <div className="flex items-center">
          <span className="font-semibold text-bog-ink group-hover:text-bog-ink">{title}</span>
          {badge && <span className="ml-2">{badge}</span>}
        </div>
        <span className="text-sm text-zinc-500">{description}</span>
      </div>
      <ArrowRight size={18} className="text-zinc-300 transition-all group-hover:translate-x-1 group-hover:text-bog-ink" />
    </Link>
  );
}

interface RecentTransactionProps {
  date: string;
  description: string;
  amount: string;
  type: string;
  icon: React.ReactNode;
}

function RecentTransaction({ date, description, amount, type, icon }: RecentTransactionProps) {
  const isPositive = amount.startsWith('+');
  return (
    <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-bog-sheet/80">
      <div className="flex items-center">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-bog-sheet text-zinc-600'
        }`}>
          {icon}
        </div>
        <div className="ml-3">
          <div className="font-medium text-bog-ink">{description}</div>
          <div className="text-xs text-zinc-500">{date} • {type}</div>
        </div>
      </div>
      <div className={`font-figures font-semibold tabular-nums ${isPositive ? 'text-green-700' : 'text-bog-ink'}`}>
        {amount}
      </div>
    </div>
  );
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

type AgingBucket = { bucket: string; amount: number };

const BUCKET_COLORS: Record<string, string> = {
  Current: 'bg-green-500',
  '1-30 days': 'bg-amber-500',
  '31-60 days': 'bg-orange-500',
  '60+ days': 'bg-red-500',
};

function AgingBucketList({ buckets, emptyLabel }: { buckets: AgingBucket[]; emptyLabel: string }) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  if (total === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {buckets.map((item) => (
        <div key={item.bucket} className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-2 h-2 ${BUCKET_COLORS[item.bucket] ?? 'bg-zinc-400'} rounded-full mr-2`} />
            <span className="text-sm text-zinc-600">{item.bucket}</span>
          </div>
          <span className="font-figures text-sm font-semibold text-bog-ink">{fmtMoney(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuthStore();
  const serverMode = useServerMode();
  const [opsNote, setOpsNote] = useState<string | null>(null);
  const [financials, setFinancials] = useState<{
    revenue: number;
    expenses: number;
    netIncome: number;
    cash: number;
    empty: boolean;
    recentActivity: { id: string; date: string; description: string }[];
  } | null>(null);
  const [aging, setAging] = useState<{
    arTotal: number;
    apTotal: number;
    arBuckets: AgingBucket[];
    apBuckets: AgingBucket[];
  }>({ arTotal: 0, apTotal: 0, arBuckets: [], apBuckets: [] });
  const [ingest, setIngest] = useState<{
    totalDraftCount: number;
    hint: string | null;
    books: Array<{ bookId: string; companyName: string; draftCount: number; postedCount: number }>;
  } | null>(null);
  const [overdueAr, setOverdueAr] = useState(0);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    let alive = true;
    (async () => {
      const [summaryRes, finRes, arRes, apRes, ingestRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardFinancials({ month, year }),
        api.getArAgingReport(),
        api.getApAgingReport(),
        api.getIngestSummary(),
      ]);
      if (!alive) return;

      if (summaryRes.success && summaryRes.data) {
        const d = summaryRes.data as {
          overdueArCount: number;
          overdueApCount: number;
          draftJournalCount: number;
          pendingApprovalJournalCount: number;
          lowStockItems: number;
        };
        setOverdueAr(d.overdueArCount);
        const parts: string[] = [];
        if (d.overdueArCount) parts.push(`${d.overdueArCount} overdue AR`);
        if (d.overdueApCount) parts.push(`${d.overdueApCount} overdue AP`);
        if (d.draftJournalCount) parts.push(`${d.draftJournalCount} draft journals`);
        if (d.pendingApprovalJournalCount) parts.push(`${d.pendingApprovalJournalCount} journals pending approval`);
        if (d.lowStockItems) parts.push(`${d.lowStockItems} low-stock items`);
        setOpsNote(parts.length ? parts.join(' · ') : null);
      }

      if (finRes.success && finRes.data) {
        const f = finRes.data as typeof financials;
        setFinancials(f);
      }

      const bucketsFrom = (data: unknown) => {
        const buckets = (data as { buckets?: AgingBucket[] })?.buckets ?? [];
        const total = buckets.reduce((s, b) => s + (Number(b.amount) || 0), 0);
        return { buckets, total };
      };
      if (arRes.success) {
        const { buckets, total } = bucketsFrom(arRes.data);
        setAging((a) => ({ ...a, arTotal: total, arBuckets: buckets }));
      }
      if (apRes.success) {
        const { buckets, total } = bucketsFrom(apRes.data);
        setAging((a) => ({ ...a, apTotal: total, apBuckets: buckets }));
      }
      if (ingestRes.success && ingestRes.data) {
        setIngest(ingestRes.data);
      }
    })();
    return () => {
      alive = false;
    };
  }, [month, year]);

  const kpis = financials
    ? [
        {
          title: 'Total Revenue',
          value: fmtMoney(financials.revenue),
          icon: <DollarSign size={22} />,
        },
        {
          title: 'Total Expenses',
          value: fmtMoney(financials.expenses),
          icon: <CreditCard size={22} />,
          highlight: true,
        },
        {
          title: 'Net Income',
          value: fmtMoney(financials.netIncome),
          icon: <TrendingUp size={22} />,
        },
        {
          title: 'Cash Balance',
          value: fmtMoney(financials.cash),
          icon: <DollarSign size={22} />,
        },
      ]
    : [
        { title: 'Total Revenue', value: '—', icon: <DollarSign size={22} /> },
        { title: 'Total Expenses', value: '—', icon: <CreditCard size={22} />, highlight: true },
        { title: 'Net Income', value: '—', icon: <TrendingUp size={22} /> },
        { title: 'Cash Balance', value: '—', icon: <DollarSign size={22} /> },
      ];

  const quickActions = [
    {
      title: 'New Journal Entry',
      description: 'Record a manual journal entry',
      href: '/ledger/new',
      icon: <FileText size={22} />,
      badge: null,
    },
    {
      title: 'Accounts Receivable',
      description: 'View outstanding invoices',
      href: '/ar',
      icon: <Receipt size={22} />,
      badge: overdueAr > 0 ? <StatusBadge status="warning" label={`${overdueAr} overdue`} /> : null,
    },
    {
      title: 'Inventory',
      description: 'Track stock and items',
      href: '/inventory',
      icon: <Package size={22} />,
      badge: <StatusBadge status="active" label="OK" />,
    },
    {
      title: 'AI CPA Assistant',
      description: 'Ask about your finances',
      href: '/ai-cpa',
      icon: <Sparkles size={22} />,
      badge: <FeatureBadge type="new" />,
    },
  ];

  const recentTransactions =
    financials?.recentActivity?.map((r) => ({
      date: r.date,
      description: r.description.slice(0, 48),
      amount: '—',
      type: 'Journal',
      icon: <FileText size={18} />,
    })) ?? [];

  return (
    <div className="bog-workspace border-b border-bog-rule">
      <div className="border-b border-bog-rule bg-white/85 px-6 py-6 backdrop-blur-sm lg:px-8">
      {opsNote && (
        <div className="mb-4 rounded-lg border border-[hsl(var(--bog-accent))]/25 bg-[hsl(var(--bog-accent-muted))] px-4 py-3 text-sm text-bog-ink">
          <p className="bog-section-label mb-1.5 !text-[hsl(var(--bog-accent))]">Action items</p>
          <span className="font-medium">{opsNote}</span>
        </div>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <p className="bog-section-label">Overview</p>
            {serverMode === 'database' && (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-figures text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                Live
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-bog-ink lg:text-3xl">Dashboard</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Welcome back, <span className="font-semibold text-bog-ink">{user?.firstName}</span>. Numbers below behave like a statement — precise and readable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/reports"
            className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2.5 text-sm font-medium text-bog-ink shadow-sm transition-colors hover:bg-bog-sheet"
          >
            <FileText size={16} className="mr-2" />
            View reports
          </Link>
          <Link
            to="/ledger/new"
            className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
          >
            <Plus size={16} className="mr-2" />
            New journal entry
          </Link>
        </div>
      </div>
      </div>

      <div className="p-6 lg:p-8">

      {/* KPI row — card KPIs like a summary band */}
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Quick actions — task shortcuts without cloning QB’s icon grid */}
      <div className="mb-8">
        <h2 className="bog-section-label mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickAction key={action.title} {...action} />
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions - Spanning 2 columns */}
        <div className="bog-statement-card lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-bog-ink">Recent activity</h2>
              <p className="mt-0.5 text-sm text-zinc-500">Last five movements · amounts use ledger-style alignment</p>
            </div>
            <Link to="/ledger" className="inline-flex items-center text-sm font-medium text-[hsl(var(--bog-accent))] hover:underline">
              View all <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-bog-rule rounded-md border border-bog-rule bg-white">
            {recentTransactions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">No posted journal activity yet.</p>
            ) : (
              recentTransactions.map((transaction, index) => (
                <RecentTransaction key={index} {...transaction} />
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Aging Summary */}
          <div className="bog-statement-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-bog-ink">Aging summary</h2>
                <div className="mt-1 flex items-center text-xs text-zinc-500">
                  <Clock size={12} className="mr-1" />
                  Updated just now
                </div>
              </div>
            </div>

            {/* AR Aging */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-500">Accounts Receivable</h3>
                <span className="rounded-md bg-bog-sheet px-2 py-1 font-figures text-xs font-semibold text-bog-ink">
                  {fmtMoney(aging.arTotal)}
                </span>
              </div>
              {aging.arTotal === 0 ? (
                <p className="text-sm text-zinc-500">No open receivables.</p>
              ) : (
                <AgingBucketList buckets={aging.arBuckets} emptyLabel="No open receivables." />
              )}
            </div>

            {/* AP Aging */}
            <div className="border-t border-bog-rule pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-500">Accounts Payable</h3>
                <span className="rounded-md bg-bog-sheet px-2 py-1 font-figures text-xs font-semibold text-bog-ink">
                  {fmtMoney(aging.apTotal)}
                </span>
              </div>
              {aging.apTotal === 0 ? (
                <p className="text-sm text-zinc-500">No open payables.</p>
              ) : (
                <AgingBucketList buckets={aging.apBuckets} emptyLabel="No open payables." />
              )}
            </div>
          </div>

          {/* Crew ingest status */}
          {ingest && (
            <div className="bog-statement-card p-6">
              <h2 className="text-lg font-semibold text-bog-ink mb-1">Crew ingest</h2>
              <p className="text-xs text-zinc-500 mb-4">Journal sync from dropship &amp; investment crews (last 30 days)</p>
              {ingest.hint && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {ingest.hint}
                </div>
              )}
              <div className="space-y-3">
                {ingest.books.map((b) => (
                  <div key={b.bookId} className="rounded-lg border border-bog-rule bg-white px-3 py-2">
                    <div className="flex items-center justify-between text-sm font-medium text-bog-ink">
                      <span>{b.companyName}</span>
                      {b.draftCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          {b.draftCount} draft
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {b.postedCount} posted · {b.draftCount} draft
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI CPA Quick Access */}
          <Link
            to="/ai-cpa"
            className="block rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-md bg-white/10 p-2">
                <Sparkles size={22} />
              </div>
              <FeatureBadge type="new" />
            </div>
            <h3 className="mb-1 text-lg font-bold">AI CPA</h3>
            <p className="mb-4 text-sm text-white/70">
              Your controller-style assistant — plain questions, structured answers.
            </p>
            <div className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-bog-ink">
              Open assistant <ArrowRight size={14} className="ml-2" />
            </div>
          </Link>

          {/* Team — link only; no placeholder avatars */}
          <div className="bog-statement-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-bog-ink">Team</h2>
              <Link to="/users" className="text-xs font-medium text-[hsl(var(--bog-accent))] hover:underline">
                Manage users
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500">
              Invite colleagues and assign module access under Users. Team activity will appear here when user
              presence is wired to the API.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}