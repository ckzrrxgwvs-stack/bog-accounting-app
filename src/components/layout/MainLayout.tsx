// Main shell — BOG “ledger workspace”: structured nav (QB-like clarity) + ink/paper (our brand)

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LogoWithStatus } from '@/components/Logo';
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  FileText,
  Package,
  Receipt,
  BarChart3,
  MessageSquare,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  FileCheck,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'General Ledger', href: '/ledger', icon: BookOpen, module: 'general_ledger' },
  { name: 'Accounts Payable', href: '/ap', icon: CreditCard, module: 'accounts_payable' },
  { name: 'Accounts Receivable', href: '/ar', icon: FileText, module: 'accounts_receivable' },
  { name: 'Inventory', href: '/inventory', icon: Package, module: 'inventory' },
  { name: 'Payroll', href: '/payroll', icon: Receipt, module: 'payroll' },
  { name: 'CFDI (Mexico)', href: '/cfdi', icon: FileCheck, module: 'cfdi' },
  { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' },
  { name: 'AI CPA Assistant', href: '/ai-cpa', icon: MessageSquare, module: 'ai_cpa' },
];

const bottomNavigation = [
  { name: 'Users', href: '/users', icon: Users, module: 'users' },
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

  const filteredNav = navigation.filter((item) => hasModuleAccess(item.module));
  const filteredBottomNav = bottomNavigation.filter((item) => hasModuleAccess(item.module));

  return (
    <div className="min-h-screen bg-bog-paper text-bog-ink">
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
            <LogoWithStatus status="demo" />
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

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="bog-section-label px-3 pb-2 pt-1">Workspace</p>
          {filteredNav.map((item) => {
            const isActive = navIsActive(location.pathname, item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pl-2 pr-2 text-sm font-medium transition-colors ${
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
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-bog-rule bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-600 hover:bg-bog-sheet hover:text-bog-ink"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="ml-3 font-semibold tracking-tight text-bog-ink">
            BOG-Pi<span className="font-figures text-[hsl(var(--bog-accent))]"> π</span>
          </span>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
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
  );
}
