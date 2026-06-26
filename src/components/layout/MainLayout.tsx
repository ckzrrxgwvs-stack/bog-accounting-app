// Main shell — BOG “ledger workspace”: structured nav (QB-like clarity) + ink/paper (our brand)

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { LogoWithStatus } from '@/components/Logo';
import { useServerMode } from '@/hooks/useServerMode';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  CreditCard,
  FileText,
  Package,
  Receipt,
  BarChart3,
  Table2,
  MessageSquare,
  LayoutGrid,
  Sparkles,
  ShoppingCart,
  ClipboardList,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  FileCheck,
  Landmark,
  Building2,
  UserCircle,
  Lock,
  PenLine,
  Lightbulb,
  Bot,
  Link2,
  FileSpreadsheet,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useCompanyPolicy } from '@/hooks/useCompanyPolicy';
import { CommandPalette } from '@/components/CommandPalette';
import { BusinessWorkspaceProvider, BusinessWorkspaceSwitcher } from '@/context/BusinessWorkspaceContext';

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  module: string;
  hideWhenManualOps?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' }],
  },
  {
    label: 'Ledger',
    items: [
      { name: 'Chart of accounts', href: '/ledger/coa', icon: Layers, module: 'general_ledger' },
      { name: 'Opening balances', href: '/ledger/opening-balances', icon: Landmark, module: 'general_ledger' },
      { name: 'General Ledger', href: '/ledger', icon: BookOpen, module: 'general_ledger' },
      { name: 'Period close', href: '/ledger/period-close', icon: Lock, module: 'general_ledger' },
    ],
  },
  {
    label: 'Receivables & payables',
    items: [
      { name: 'Customers', href: '/master/customers', icon: UserCircle, module: 'accounts_receivable' },
      { name: 'Accounts Receivable', href: '/ar', icon: FileText, module: 'accounts_receivable' },
      { name: 'Vendors', href: '/master/vendors', icon: Building2, module: 'accounts_payable' },
      { name: 'Accounts Payable', href: '/ap', icon: CreditCard, module: 'accounts_payable' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Package, module: 'inventory' },
      { name: 'Payroll', href: '/payroll', icon: Receipt, module: 'payroll' },
      { name: 'CFDI (Mexico)', href: '/cfdi', icon: FileCheck, module: 'cfdi' },
    ],
  },
  {
    label: 'Reporting & tools',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' },
      { name: 'Data Studio', href: '/data-studio', icon: Table2, module: 'reports' },
      { name: 'Office hub', href: '/office', icon: FileSpreadsheet, module: 'reports' },
      { name: 'Bank connections', href: '/integrations/financial', icon: Link2, module: 'settings' },
    ],
  },
  {
    label: 'ERP',
    items: [
      { name: 'ERP hub', href: '/erp', icon: LayoutGrid, module: 'erp' },
      {
        name: 'ERP Assistant',
        href: '/erp/assistant',
        icon: Sparkles,
        module: 'erp',
        hideWhenManualOps: true,
      },
      { name: 'Purchase orders', href: '/erp/purchase-orders', icon: ShoppingCart, module: 'erp' },
      { name: 'Sales orders', href: '/erp/sales-orders', icon: ClipboardList, module: 'erp' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        name: 'AI CPA Assistant',
        href: '/ai-cpa',
        icon: MessageSquare,
        module: 'ai_cpa',
        hideWhenManualOps: true,
      },
    ],
  },
];

const bottomNavigation = [
  { name: 'Users', href: '/users', icon: Users, module: 'users' },
  {
    name: 'Agent operations',
    href: '/agent-operations',
    icon: Bot,
    module: 'agent_org',
  },
  {
    name: 'Product intelligence',
    href: '/product-intelligence',
    icon: Lightbulb,
    module: 'product_intel',
  },
  {
    name: 'Manual operations',
    href: '/settings/manual-operations',
    icon: PenLine,
    module: '_executive_only',
  },
  { name: 'Settings', href: '/settings', icon: Settings, module: 'settings' },
];

function navIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainLayout() {
  const location = useLocation();
  const { user, logout, hasModuleAccess } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { manualOperationsMode, loading: policyLoading } = useCompanyPolicy();
  const serverMode = useServerMode();
  const logoStatus =
    serverMode === 'database'
      ? 'active'
      : serverMode === 'loading' || serverMode === 'schema_pending'
        ? 'syncing'
        : 'demo';

  const isExecutive = Boolean(
    user && (user.role === 'PRESIDENT' || user.role === 'CFO' || user.role === 'CONTROLLER')
  );

  const filterNavItem = (item: NavItem) => {
    if (!hasModuleAccess(item.module)) return false;
    if (item.hideWhenManualOps && !policyLoading && manualOperationsMode) return false;
    return true;
  };

  const filteredNavGroups = navigationGroups
    .map((group) => ({ ...group, items: group.items.filter(filterNavItem) }))
    .filter((group) => group.items.length > 0);

  const filteredBottomNav = bottomNavigation.filter((item) => {
    if (item.module === '_executive_only') return isExecutive;
    return hasModuleAccess(item.module);
  });

  const [testerDaysLeft, setTesterDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.isTester) {
      setTesterDaysLeft(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await api.getMyTesterAccess();
      if (cancelled || !res.success || !res.data) return;
      const d = res.data;
      if (d.isTester && d.daysRemaining != null) setTesterDaysLeft(d.daysRemaining);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.isTester]);

  const testerExpiryLabel =
    user?.accessExpiresAt != null
      ? new Date(user.accessExpiresAt).toLocaleDateString()
      : null;

  return (
    <BusinessWorkspaceProvider>
    <div className="min-h-screen bg-bog-paper text-bog-ink">
      <CommandPalette />
      {user?.isTester && testerDaysLeft != null ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          <strong>Family &amp; friends preview</strong> — BOG is still in development. {testerDaysLeft} day
          {testerDaysLeft === 1 ? '' : 's'} left
          {testerExpiryLabel ? ` (through ${testerExpiryLabel})` : ''}. Share input in{' '}
          <Link to="/product-intelligence" className="font-medium underline">
            Product intelligence
          </Link>
          .
        </div>
      ) : null}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-bog-ink/40 backdrop-blur-[2px] lg:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-bog-sidebar transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link to="/" className="min-w-0" onClick={() => setSidebarOpen(false)}>
            <LogoWithStatus status={logoStatus} />
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 bog-sidebar-nav">
          {filteredNavGroups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="bog-section-label px-3 pb-1.5 pt-2 first:pt-1">{group.label}</p>
              {group.items.map((item) => {
                const isActive = navIsActive(location.pathname, item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center gap-3 rounded-lg border-l-[3px] py-2 pl-2 pr-2 text-sm font-medium transition-colors bog-focus-accent ${
                      isActive
                        ? 'border-[hsl(var(--bog-accent))] bg-white/[0.08] text-white shadow-inner shadow-black/20'
                        : 'border-transparent text-zinc-400 hover:border-zinc-600 hover:bg-white/[0.05] hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="flex flex-1 items-center">
                      <item.icon
                        size={18}
                        className={`shrink-0 ${isActive ? 'text-[hsl(var(--bog-accent))]' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                        strokeWidth={isActive ? 2.25 : 2}
                      />
                      <span className="ml-3 truncate">{item.name}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <p className="bog-section-label px-3 pb-2">Administration</p>
          <div className="space-y-0.5">
            {filteredBottomNav.map((item) => {
              const isActive = navIsActive(location.pathname, item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg py-2 pl-3 pr-2 text-sm transition-colors ${
                    isActive ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:bg-white/[0.05] hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={18} className="shrink-0 opacity-80" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 font-figures text-xs font-semibold text-white">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate font-figures text-[11px] text-zinc-500">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-bog-rule bg-white/95 shadow-sm backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-zinc-600 hover:bg-bog-sheet hover:text-bog-ink lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              <BusinessWorkspaceSwitcher />
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('bog:open-command-palette'))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-bog-rule bg-white px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-bog-sheet hover:text-bog-ink bog-focus-accent"
              aria-label="Open quick navigation (⌘K)"
            >
              <Search size={14} className="shrink-0" />
              <span className="hidden font-figures sm:inline">⌘K</span>
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)] bog-main-content">
          {serverMode === 'schema_pending' && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
              Database connected — applying schema on API startup. Wait ~1 min, then click <strong>Refresh</strong> on
              Chart of accounts. If it persists, redeploy Render service <code className="font-mono">bog-accounting-api</code>.
            </div>
          )}
          {serverMode === 'offline' && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
              API offline — start <code className="font-mono">pnpm run dev:program</code> with Docker Postgres for live books.
            </div>
          )}
          {serverMode === 'demo' && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
              Database not connected — run <code className="font-mono">pnpm run go-live:local</code> then{' '}
              <code className="font-mono">pnpm run dev:program</code>. BOG no longer shows sample financial data.
            </div>
          )}
          <Outlet />
        </main>

        <footer className="border-t border-bog-rule bg-white px-6 py-3">
          <div className="flex flex-col gap-1 text-[11px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-figures tracking-wide">
              BOG-Pi · Books On The Go <span className="text-[hsl(var(--bog-accent))]">π</span>{' '}
              <span className="text-zinc-400">v1.0</span>
            </span>
            <span className="text-zinc-400">3.1416… · {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
    </BusinessWorkspaceProvider>
  );
}
