/**
 * Sidebar navigation catalog — stable ids for menu customization (show/hide, reorder).
 */
import type { LucideIcon } from 'lucide-react';
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
  GraduationCap,
  Mail,
} from 'lucide-react';

export type NavCatalogItem = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  group: string;
  section: 'main' | 'admin';
  module: string;
  hideWhenManualOps?: boolean;
  executiveOnly?: boolean;
};

export const NAV_CATALOG: NavCatalogItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'Overview', section: 'main', module: 'dashboard' },
  { id: 'coa', name: 'Chart of accounts', href: '/ledger/coa', icon: Layers, group: 'Ledger', section: 'main', module: 'general_ledger' },
  { id: 'opening-balances', name: 'Opening balances', href: '/ledger/opening-balances', icon: Landmark, group: 'Ledger', section: 'main', module: 'general_ledger' },
  { id: 'general-ledger', name: 'General Ledger', href: '/ledger', icon: BookOpen, group: 'Ledger', section: 'main', module: 'general_ledger' },
  { id: 'period-close', name: 'Period close', href: '/ledger/period-close', icon: Lock, group: 'Ledger', section: 'main', module: 'general_ledger' },
  { id: 'customers', name: 'Customers', href: '/master/customers', icon: UserCircle, group: 'Receivables & payables', section: 'main', module: 'accounts_receivable' },
  { id: 'ar', name: 'Accounts Receivable', href: '/ar', icon: FileText, group: 'Receivables & payables', section: 'main', module: 'accounts_receivable' },
  { id: 'vendors', name: 'Vendors', href: '/master/vendors', icon: Building2, group: 'Receivables & payables', section: 'main', module: 'accounts_payable' },
  { id: 'ap', name: 'Accounts Payable', href: '/ap', icon: CreditCard, group: 'Receivables & payables', section: 'main', module: 'accounts_payable' },
  { id: 'inventory', name: 'Inventory', href: '/inventory', icon: Package, group: 'Operations', section: 'main', module: 'inventory' },
  { id: 'payroll', name: 'Payroll', href: '/payroll', icon: Receipt, group: 'Operations', section: 'main', module: 'payroll' },
  { id: 'cfdi', name: 'CFDI (Mexico)', href: '/cfdi', icon: FileCheck, group: 'Operations', section: 'main', module: 'cfdi' },
  { id: 'reports', name: 'Reports', href: '/reports', icon: BarChart3, group: 'Reporting & tools', section: 'main', module: 'reports' },
  { id: 'data-studio', name: 'Data Studio', href: '/data-studio', icon: Table2, group: 'Reporting & tools', section: 'main', module: 'reports' },
  { id: 'documents', name: 'Document Studio', href: '/documents', icon: Mail, group: 'Reporting & tools', section: 'main', module: 'reports' },
  { id: 'office', name: 'Office hub', href: '/office', icon: FileSpreadsheet, group: 'Reporting & tools', section: 'main', module: 'reports' },
  { id: 'bank-connections', name: 'Bank connections', href: '/integrations/financial', icon: Link2, group: 'Reporting & tools', section: 'main', module: 'settings' },
  { id: 'erp-hub', name: 'ERP hub', href: '/erp', icon: LayoutGrid, group: 'ERP', section: 'main', module: 'erp' },
  { id: 'erp-assistant', name: 'ERP Assistant', href: '/erp/assistant', icon: Sparkles, group: 'ERP', section: 'main', module: 'erp', hideWhenManualOps: true },
  { id: 'purchase-orders', name: 'Purchase orders', href: '/erp/purchase-orders', icon: ShoppingCart, group: 'ERP', section: 'main', module: 'erp' },
  { id: 'sales-orders', name: 'Sales orders', href: '/erp/sales-orders', icon: ClipboardList, group: 'ERP', section: 'main', module: 'erp' },
  { id: 'ai-cpa', name: 'AI CPA Assistant', href: '/ai-cpa', icon: MessageSquare, group: 'Intelligence', section: 'main', module: 'ai_cpa', hideWhenManualOps: true },
  { id: 'pi-academy', name: 'Pi Academy', href: '/academy', icon: GraduationCap, group: 'Intelligence', section: 'main', module: 'ai_cpa' },
  { id: 'users', name: 'Users', href: '/users', icon: Users, group: 'Administration', section: 'admin', module: 'users' },
  { id: 'agent-ops', name: 'Agent operations', href: '/agent-operations', icon: Bot, group: 'Administration', section: 'admin', module: 'agent_org' },
  { id: 'product-intel', name: 'Product intelligence', href: '/product-intelligence', icon: Lightbulb, group: 'Administration', section: 'admin', module: 'product_intel' },
  { id: 'manual-ops', name: 'Manual operations', href: '/settings/manual-operations', icon: PenLine, group: 'Administration', section: 'admin', module: '_executive_only', executiveOnly: true },
  { id: 'settings', name: 'Settings', href: '/settings', icon: Settings, group: 'Administration', section: 'admin', module: 'settings' },
];

export const DEFAULT_NAV_ORDER = NAV_CATALOG.map((item) => item.id);

export const NAV_GROUP_ORDER = [
  'Overview',
  'Ledger',
  'Receivables & payables',
  'Operations',
  'Reporting & tools',
  'ERP',
  'Intelligence',
  'Administration',
];

export function getNavItemById(id: string): NavCatalogItem | undefined {
  return NAV_CATALOG.find((item) => item.id === id);
}
