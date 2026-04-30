// Dashboard page con personalidad

import React from 'react';
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
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
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
          <span className="font-semibold text-black group-hover:text-black">{title}</span>
          {badge && <span className="ml-2">{badge}</span>}
        </div>
        <span className="text-sm text-gray-500">{description}</span>
      </div>
      <ArrowRight size={18} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
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
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          isPositive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {icon}
        </div>
        <div className="ml-3">
          <div className="font-medium text-black">{description}</div>
          <div className="text-xs text-gray-500">{date} • {type}</div>
        </div>
      </div>
      <div className={`font-figures font-semibold tabular-nums ${isPositive ? 'text-green-700' : 'text-bog-ink'}`}>
        {amount}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuthStore();

  const kpis = [
    {
      title: 'Total Revenue',
      value: '$124,500',
      change: 12.5,
      trend: 'up' as const,
      icon: <DollarSign size={22} />,
    },
    {
      title: 'Total Expenses',
      value: '$89,200',
      change: -3.2,
      trend: 'down' as const,
      icon: <CreditCard size={22} />,
      highlight: true,
    },
    {
      title: 'Net Income',
      value: '$35,300',
      change: 18.7,
      trend: 'up' as const,
      icon: <TrendingUp size={22} />,
    },
    {
      title: 'Cash Balance',
      value: '$52,800',
      change: 5.1,
      trend: 'up' as const,
      icon: <DollarSign size={22} />,
    },
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
      badge: <StatusBadge status="warning" label="3 overdue" />,
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

  const recentTransactions = [
    { date: 'Today', description: 'Invoice #1024 - Acme Corp', amount: '+$5,200', type: 'Invoice', icon: <Receipt size={18} /> },
    { date: 'Today', description: 'Vendor Payment - Office Supplies', amount: '-$890', type: 'Payment', icon: <CreditCard size={18} /> },
    { date: 'Yesterday', description: 'Invoice #1023 - TechStart Inc', amount: '+$12,500', type: 'Invoice', icon: <Receipt size={18} /> },
    { date: 'Yesterday', description: 'Rent Payment', amount: '-$3,500', type: 'Journal', icon: <FileText size={18} /> },
    { date: 'Apr 27', description: 'Invoice #1022 - Global Ltd', amount: '+$8,900', type: 'Invoice', icon: <Receipt size={18} /> },
  ];

  return (
    <div className="bog-workspace border-b border-bog-rule">
      <div className="border-b border-bog-rule bg-white/85 px-6 py-6 backdrop-blur-sm lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <p className="bog-section-label">Overview</p>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 font-figures text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Demo
            </span>
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
            {recentTransactions.map((transaction, index) => (
              <RecentTransaction key={index} {...transaction} />
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Aging Summary */}
          <div className="bog-statement-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-bog-ink">Aging summary</h2>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  Updated just now
                </div>
              </div>
            </div>

            {/* AR Aging */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500">Accounts Receivable</h3>
                <span className="rounded-md bg-bog-sheet px-2 py-1 font-figures text-xs font-semibold text-bog-ink">$43,700</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Current', value: '$18,500', color: 'bg-green-500' },
                  { label: '1-30 days', value: '$12,300', color: 'bg-amber-500' },
                  { label: '31-60 days', value: '$8,700', color: 'bg-orange-500' },
                  { label: '60+ days', value: '$4,200', color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 ${item.color} rounded-full mr-2`} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-figures text-sm font-semibold text-bog-ink">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AP Aging */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500">Accounts Payable</h3>
                <span className="rounded-md bg-bog-sheet px-2 py-1 font-figures text-xs font-semibold text-bog-ink">$29,500</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Current', value: '$15,200', color: 'bg-green-500' },
                  { label: '1-30 days', value: '$9,800', color: 'bg-amber-500' },
                  { label: '31-60 days', value: '$3,400', color: 'bg-orange-500' },
                  { label: '60+ days', value: '$1,100', color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 ${item.color} rounded-full mr-2`} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-figures text-sm font-semibold text-bog-ink">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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

          {/* Team Activity */}
          <div className="bog-statement-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-bog-ink">Team</h2>
              <Link to="/users" className="text-xs font-medium text-[hsl(var(--bog-accent))] hover:underline">
                Manage
              </Link>
            </div>
            <div className="-space-x-2 flex items-center">
              {[
                { initials: 'JS', name: 'John Smith' },
                { initials: 'SJ', name: 'Sarah Johnson' },
                { initials: 'CR', name: 'Carlos Rodriguez' },
              ].map((member, i) => (
                <div
                  key={i}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-bog-ink text-xs font-bold text-white transition-transform hover:scale-110"
                  title={member.name}
                >
                  {member.initials}
                </div>
              ))}
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-bog-sheet text-xs font-medium text-zinc-600">
                +2
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}