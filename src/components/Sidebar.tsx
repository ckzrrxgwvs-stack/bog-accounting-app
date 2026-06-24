// Sidebar Navigation con personalidad

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LogoWithStatus } from './Logo';
import { useServerMode } from '@/hooks/useServerMode';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  Wallet,
  Package,
  Users,
  Settings,
  BarChart3,
  Brain,
  Sparkles,
  Table2,
  FileCheck,
  Calculator,
  ChevronRight,
  LogOut,
  Shield,
  Bell,
  HelpCircle,
  PenLine,
  Lightbulb,
  Bot,
} from 'lucide-react';
import { useCompanyPolicy } from '@/hooks/useCompanyPolicy';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string | number;
  isNew?: boolean;
}

function NavItem({ icon, label, href, badge, isNew }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <Link
      to={href}
      className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-black text-white shadow-lg shadow-black/30'
          : 'text-gray-600 hover:bg-gray-100 hover:text-black'
      }`}
    >
      <div className="flex items-center">
        <div className={`${isActive ? '' : 'group-hover:bg-gray-200'} p-1.5 rounded-lg`}>
          {icon}
        </div>
        <span className="ml-3 font-medium text-sm">{label}</span>
        {isNew && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded-full">
            NEW
          </span>
        )}
      </div>
      {badge && (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {badge}
        </span>
      )}
      {isActive && <ChevronRight size={16} className="opacity-50" />}
    </Link>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const { user, hasModuleAccess, logout } = useAuthStore();
  const { manualOperationsMode, loading: policyLoading } = useCompanyPolicy();
  const serverMode = useServerMode();
  const logoStatus =
    serverMode === 'database' ? 'active' : serverMode === 'loading' ? 'syncing' : 'demo';

  const isExecutive = Boolean(
    user && (user.role === 'PRESIDENT' || user.role === 'CFO' || user.role === 'CONTROLLER')
  );

  const navItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      href: '/',
    },
    {
      icon: <BookOpen size={20} />,
      label: 'General Ledger',
      href: '/ledger',
      condition: hasModuleAccess('general_ledger'),
    },
    {
      icon: <Receipt size={20} />,
      label: 'Accounts Payable',
      href: '/ap',
      condition: hasModuleAccess('accounts_payable'),
    },
    {
      icon: <FileText size={20} />,
      label: 'Accounts Receivable',
      href: '/ar',
      condition: hasModuleAccess('accounts_receivable'),
    },
    {
      icon: <Wallet size={20} />,
      label: 'Payments',
      href: '/payments',
      condition:
        hasModuleAccess('accounts_receivable') || hasModuleAccess('accounts_payable'),
    },
    {
      icon: <Package size={20} />,
      label: 'Inventory',
      href: '/inventory',
      condition: hasModuleAccess('inventory'),
    },
    {
      icon: <Calculator size={20} />,
      label: 'Payroll',
      href: '/payroll',
      condition: hasModuleAccess('payroll'),
    },
    {
      icon: <FileCheck size={20} />,
      label: 'CFDI',
      href: '/cfdi',
      badge: 'MX',
      condition: hasModuleAccess('cfdi'),
    },
    {
      icon: <BarChart3 size={20} />,
      label: 'Reports',
      href: '/reports',
      condition: hasModuleAccess('reports'),
    },
    {
      icon: <Table2 size={20} />,
      label: 'Data Studio',
      href: '/data-studio',
      condition: hasModuleAccess('reports'),
    },
    {
      icon: <Brain size={20} />,
      label: 'AI CPA',
      href: '/ai-cpa',
      isNew: true,
      condition: hasModuleAccess('ai_cpa') && (policyLoading || !manualOperationsMode),
    },
    {
      icon: <Sparkles size={20} />,
      label: 'ERP Assistant',
      href: '/erp/assistant',
      condition: hasModuleAccess('erp') && (policyLoading || !manualOperationsMode),
    },
  ];

  const adminItems = [
    {
      icon: <Users size={20} />,
      label: 'Users',
      href: '/users',
      condition: hasModuleAccess('users'),
    },
    {
      icon: <Bot size={20} />,
      label: 'Agent operations',
      href: '/agent-operations',
      condition: hasModuleAccess('agent_org'),
    },
    {
      icon: <Lightbulb size={20} />,
      label: 'Product intelligence',
      href: '/product-intelligence',
      condition: hasModuleAccess('product_intel'),
    },
    {
      icon: <PenLine size={20} />,
      label: 'Manual operations',
      href: '/settings/manual-operations',
      condition: isExecutive,
    },
    {
      icon: <Settings size={20} />,
      label: 'Settings',
      href: '/settings',
      condition: hasModuleAccess('settings'),
    },
  ];

  const filteredNavItems = navItems.filter(item => item.condition !== false);
  const filteredAdminItems = adminItems.filter(item => item.condition !== false);

  return (
    <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <LogoWithStatus status={logoStatus} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item, index) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            badge={item.badge}
            isNew={item.isNew}
          />
        ))}

        {/* Divider */}
        <div className="py-4">
          <div className="border-t border-gray-100" />
        </div>

        {/* Admin Section */}
        {filteredAdminItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </span>
            </div>
            {filteredAdminItems.map((item) => (
              <NavItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
              />
            ))}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-100">
        {/* User Info */}
        <div className="flex items-center p-3 bg-gray-50 rounded-xl mb-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="font-medium text-black text-sm truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <div className="flex items-center mt-0.5">
              <Shield size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500 ml-1">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
            <Bell size={18} className="text-gray-500 mx-auto group-hover:text-black" />
          </button>
          <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
            <HelpCircle size={18} className="text-gray-500 mx-auto group-hover:text-black" />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-gray-50 hover:bg-red-50 transition-colors group"
          >
            <LogOut size={18} className="text-gray-500 mx-auto group-hover:text-red-600" />
          </button>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-medium">Demo Mode Active</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Data resets on refresh. Connect a database for production.
          </p>
        </div>
      </div>
    </aside>
  );
}