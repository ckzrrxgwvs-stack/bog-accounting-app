// Role-based permissions for the accounting system

export type UserRole =
  | 'PRESIDENT'
  | 'CFO'
  | 'CONTROLLER'
  | 'ACCOUNTANT'
  | 'AP_CLERK'
  | 'AR_CLERK'
  | 'READONLY';

export interface Permission {
  module: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PRESIDENT: [
    { module: 'dashboard', read: true, create: true, update: true, delete: true, export: true },
    { module: 'general_ledger', read: true, create: true, update: true, delete: true, export: true },
    { module: 'accounts_payable', read: true, create: true, update: true, delete: true, export: true },
    { module: 'accounts_receivable', read: true, create: true, update: true, delete: true, export: true },
    { module: 'inventory', read: true, create: true, update: true, delete: true, export: true },
    { module: 'payroll', read: true, create: true, update: true, delete: true, export: true },
    { module: 'cfdi', read: true, create: true, update: true, delete: true, export: true },
    { module: 'reports', read: true, create: true, update: true, delete: true, export: true },
    { module: 'ai_cpa', read: true, create: true, update: true, delete: true, export: true },
    { module: 'users', read: true, create: true, update: true, delete: true, export: true },
    { module: 'settings', read: true, create: true, update: true, delete: true, export: true },
  ],
  CFO: [
    { module: 'dashboard', read: true, create: true, update: true, delete: true, export: true },
    { module: 'general_ledger', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_payable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_receivable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'inventory', read: true, create: true, update: true, delete: false, export: true },
    { module: 'payroll', read: true, create: true, update: true, delete: false, export: true },
    { module: 'cfdi', read: true, create: true, update: true, delete: false, export: true },
    { module: 'reports', read: true, create: true, update: true, delete: false, export: true },
    { module: 'ai_cpa', read: true, create: true, update: true, delete: false, export: true },
    { module: 'users', read: true, create: false, update: false, delete: false, export: false },
    { module: 'settings', read: false, create: false, update: false, delete: false, export: false },
  ],
  CONTROLLER: [
    { module: 'dashboard', read: true, create: true, update: true, delete: false, export: true },
    { module: 'general_ledger', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_payable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_receivable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'inventory', read: true, create: true, update: true, delete: false, export: true },
    { module: 'payroll', read: true, create: false, update: false, delete: false, export: true },
    { module: 'cfdi', read: true, create: false, update: false, delete: false, export: false },
    { module: 'reports', read: true, create: true, update: true, delete: false, export: true },
    { module: 'ai_cpa', read: true, create: true, update: true, delete: false, export: true },
    { module: 'users', read: false, create: false, update: false, delete: false, export: false },
    { module: 'settings', read: false, create: false, update: false, delete: false, export: false },
  ],
  ACCOUNTANT: [
    { module: 'dashboard', read: true, create: true, update: false, delete: false, export: true },
    { module: 'general_ledger', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_payable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_receivable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'inventory', read: true, create: true, update: true, delete: false, export: true },
    { module: 'payroll', read: false, create: false, update: false, delete: false, export: false },
    { module: 'cfdi', read: false, create: false, update: false, delete: false, export: false },
    { module: 'reports', read: true, create: false, update: false, delete: false, export: true },
    { module: 'ai_cpa', read: true, create: true, update: false, delete: false, export: true },
    { module: 'users', read: false, create: false, update: false, delete: false, export: false },
    { module: 'settings', read: false, create: false, update: false, delete: false, export: false },
  ],
  AP_CLERK: [
    { module: 'dashboard', read: true, create: true, update: false, delete: false, export: true },
    { module: 'general_ledger', read: false, create: false, update: false, delete: false, export: false },
    { module: 'accounts_payable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'accounts_receivable', read: false, create: false, update: false, delete: false, export: false },
    { module: 'inventory', read: false, create: false, update: false, delete: false, export: false },
    { module: 'payroll', read: false, create: false, update: false, delete: false, export: false },
    { module: 'cfdi', read: false, create: false, update: false, delete: false, export: false },
    { module: 'reports', read: true, create: false, update: false, delete: false, export: true },
    { module: 'ai_cpa', read: true, create: true, update: false, delete: false, export: true },
    { module: 'users', read: false, create: false, update: false, delete: false, export: false },
    { module: 'settings', read: false, create: false, update: false, delete: false, export: false },
  ],
  AR_CLERK: [
    { module: 'dashboard', read: true, create: true, update: false, delete: false, export: true },
    { module: 'general_ledger', read: false, create: false, update: false, delete: false, export: false },
    { module: 'accounts_payable', read: false, create: false, update: false, delete: false, export: false },
    { module: 'accounts_receivable', read: true, create: true, update: true, delete: false, export: true },
    { module: 'inventory', read: false, create: false, update: false, delete: false, export: false },
    { module: 'payroll', read: false, create: false, update: false, delete: false, export: false },
    { module: 'cfdi', read: false, create: false, update: false, delete: false, export: false },
    { module: 'reports', read: true, create: false, update: false, delete: false, export: true },
    { module: 'ai_cpa', read: true, create: true, update: false, delete: false, export: true },
    { module: 'users', read: false, create: false, update: false, delete: false, export: false },
    { module: 'settings', read: false, create: false, update: false, delete: false, export: false },
  ],
  READONLY: [
    { module: 'dashboard', read: true, create: false, update: false, delete: false, export: true },
    { module: 'general_ledger', read: true, create: false, update: false, delete: false, export: true },
    { module: 'accounts_payable', read: true, create: false, update: false, delete: false, export: true },
    { module: 'accounts_receivable', read: true, create: false, update: false, delete: false, export: true },
    { module: 'inventory', read: true, create: false, update: false, delete: false, export: true },
    { module: 'payroll', read: true, create: false, update: false, delete: false, export: false },
    { module: 'cfdi', read: true, create: false, update: false, delete: false, export: false },
    { module: 'reports', read: true, create: false, update: false, delete: false, export: true },
    { module: 'ai_cpa', read: true, create: true, update: false, delete: false, export: true },
    { module: 'users', read: false, create: false, update: false, delete: false, export: false },
    { module: 'settings', read: false, create: false, update: false, delete: false, export: false },
  ],
};

export function hasPermission(
  role: UserRole,
  module: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'export'
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  const modulePermission = permissions.find(p => p.module === module);
  return modulePermission ? modulePermission[action] : false;
}

export function getModulesForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role]
    .filter(p => p.read)
    .map(p => p.module);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  PRESIDENT: 'President / CEO',
  CFO: 'CFO / Finance Director',
  CONTROLLER: 'Controller / Accounting Manager',
  ACCOUNTANT: 'Accountant / Bookkeeper',
  AP_CLERK: 'AP Clerk',
  AR_CLERK: 'AR Clerk',
  READONLY: 'Read-Only User',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  PRESIDENT: 'Full system access including user management and system settings',
  CFO: 'Full access to all financial modules, reports, and AI analysis',
  CONTROLLER: 'Full access to accounting, GL, closing, and AI queries',
  ACCOUNTANT: 'Transaction entry, journal entries, and standard reports',
  AP_CLERK: 'Accounts Payable module only - vendors and payments',
  AR_CLERK: 'Accounts Receivable module only - customers and collections',
  READONLY: 'View access to permitted modules only',
};