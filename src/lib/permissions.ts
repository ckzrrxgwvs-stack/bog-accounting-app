// Role module permissions — single source of truth (see SPEC.md §4.2)

import type { UserRoleType } from '@/types';

/** For each role, which actions are allowed on each module (empty = no access). */
export const ROLE_MODULE_ACTIONS: Record<UserRoleType, Record<string, string[]>> = {
  PRESIDENT: {
    dashboard: ['read', 'create', 'update', 'delete', 'export'],
    general_ledger: ['read', 'create', 'update', 'delete', 'export'],
    accounts_payable: ['read', 'create', 'update', 'delete', 'export'],
    accounts_receivable: ['read', 'create', 'update', 'delete', 'export'],
    inventory: ['read', 'create', 'update', 'delete', 'export'],
    payroll: ['read', 'create', 'update', 'delete', 'export'],
    cfdi: ['read', 'create', 'update', 'delete', 'export'],
    reports: ['read', 'create', 'update', 'delete', 'export'],
    ai_cpa: ['read', 'create', 'update', 'delete', 'export'],
    users: ['read', 'create', 'update', 'delete', 'export'],
    settings: ['read', 'create', 'update', 'delete', 'export'],
  },
  CFO: {
    dashboard: ['read', 'create', 'update', 'delete', 'export'],
    general_ledger: ['read', 'create', 'update', 'export'],
    accounts_payable: ['read', 'create', 'update', 'export'],
    accounts_receivable: ['read', 'create', 'update', 'export'],
    inventory: ['read', 'create', 'update', 'export'],
    payroll: ['read', 'create', 'update', 'export'],
    cfdi: ['read', 'create', 'update', 'export'],
    reports: ['read', 'create', 'update', 'export'],
    ai_cpa: ['read', 'create', 'update', 'export'],
    users: ['read'],
    settings: [],
  },
  CONTROLLER: {
    dashboard: ['read', 'create', 'update', 'export'],
    general_ledger: ['read', 'create', 'update', 'export'],
    accounts_payable: ['read', 'create', 'update', 'export'],
    accounts_receivable: ['read', 'create', 'update', 'export'],
    inventory: ['read', 'create', 'update', 'export'],
    payroll: ['read', 'export'],
    cfdi: ['read', 'create', 'update', 'export'],
    reports: ['read', 'create', 'update', 'export'],
    ai_cpa: ['read', 'create', 'update', 'export'],
    users: [],
    settings: [],
  },
  ACCOUNTANT: {
    dashboard: ['read', 'create', 'export'],
    general_ledger: ['read', 'create', 'update', 'export'],
    accounts_payable: ['read', 'create', 'update', 'export'],
    accounts_receivable: ['read', 'create', 'update', 'export'],
    inventory: ['read', 'create', 'update', 'export'],
    payroll: [],
    reports: ['read', 'export'],
    ai_cpa: ['read', 'create', 'export'],
    users: [],
    settings: [],
  },
  AP_CLERK: {
    dashboard: ['read', 'create', 'export'],
    general_ledger: [],
    accounts_payable: ['read', 'create', 'update', 'export'],
    accounts_receivable: [],
    inventory: [],
    payroll: [],
    reports: ['read', 'export'],
    ai_cpa: ['read', 'create', 'export'],
    users: [],
    settings: [],
  },
  AR_CLERK: {
    dashboard: ['read', 'create', 'export'],
    general_ledger: [],
    accounts_payable: [],
    accounts_receivable: ['read', 'create', 'update', 'export'],
    inventory: [],
    payroll: [],
    reports: ['read', 'export'],
    ai_cpa: ['read', 'create', 'export'],
    users: [],
    settings: [],
  },
  READONLY: {
    dashboard: ['read', 'export'],
    general_ledger: ['read', 'export'],
    accounts_payable: ['read', 'export'],
    accounts_receivable: ['read', 'export'],
    inventory: ['read', 'export'],
    payroll: ['read'],
    cfdi: ['read', 'export'],
    reports: ['read', 'export'],
    ai_cpa: ['read', 'create', 'export'],
    users: [],
    settings: [],
  },
};

export function checkPermissionForRole(
  role: UserRoleType,
  module: string,
  action: string
): boolean {
  return ROLE_MODULE_ACTIONS[role]?.[module]?.includes(action) ?? false;
}

/** Module appears in navigation when the role has at least one allowed action on it. */
export function hasModuleAccessForRole(role: UserRoleType, module: string): boolean {
  const actions = ROLE_MODULE_ACTIONS[role]?.[module];
  return Array.isArray(actions) && actions.length > 0;
}
