import { UserRoleType } from '@prisma/client';

/** Modules a Controller may assign to department managers and below. */
export const DELEGATABLE_MODULES = [
  'general_ledger',
  'accounts_payable',
  'accounts_receivable',
  'collections',
  'inventory',
  'payroll',
  'cfdi',
  'reports',
] as const;

export type DelegatableModule = (typeof DELEGATABLE_MODULES)[number];

export const MODULE_LABELS: Record<DelegatableModule, string> = {
  general_ledger: 'General ledger',
  accounts_payable: 'Accounts payable (AP)',
  accounts_receivable: 'Accounts receivable (AR)',
  collections: 'Collections',
  inventory: 'Inventory',
  payroll: 'Payroll',
  cfdi: 'CFDI (Mexico)',
  reports: 'Reports & data studio',
};

/** Sub-units a department manager may pass down within AR. */
export const MODULE_CHILD_MODULES: Partial<Record<DelegatableModule, DelegatableModule[]>> = {
  accounts_receivable: ['collections'],
};

export const EXECUTIVE_ROLES: UserRoleType[] = [
  UserRoleType.PRESIDENT,
  UserRoleType.CFO,
  UserRoleType.CONTROLLER,
];

const ROLE_RANK: Record<UserRoleType, number> = {
  [UserRoleType.PRESIDENT]: 70,
  [UserRoleType.CFO]: 60,
  [UserRoleType.CONTROLLER]: 50,
  [UserRoleType.ACCOUNTANT]: 40,
  [UserRoleType.AP_CLERK]: 20,
  [UserRoleType.AR_CLERK]: 20,
  [UserRoleType.READONLY]: 10,
};

export function isExecutiveRole(role: UserRoleType): boolean {
  return EXECUTIVE_ROLES.includes(role);
}

export function canAssignBookAccess(role: UserRoleType): boolean {
  return isExecutiveRole(role);
}

export function canCreatePortfolioBooks(role: UserRoleType): boolean {
  return role === UserRoleType.PRESIDENT || role === UserRoleType.CFO;
}

export function roleRank(role: UserRoleType): number {
  return ROLE_RANK[role] ?? 0;
}

export function canAssignAccessToTarget(granterRole: UserRoleType, targetRole: UserRoleType): boolean {
  if (targetRole === UserRoleType.PRESIDENT) return false;
  if (granterRole === UserRoleType.PRESIDENT) return true;
  if (granterRole === UserRoleType.CFO) return targetRole !== UserRoleType.PRESIDENT;
  if (granterRole === UserRoleType.CONTROLLER) {
    return roleRank(targetRole) < roleRank(UserRoleType.CONTROLLER);
  }
  return roleRank(targetRole) < roleRank(granterRole);
}

export type ModuleGrantInput = { module: string; canDelegate?: boolean };

export function modulesExecutiveMayAssign(role: UserRoleType): DelegatableModule[] {
  if (role === UserRoleType.PRESIDENT || role === UserRoleType.CFO) {
    return [...DELEGATABLE_MODULES];
  }
  if (role === UserRoleType.CONTROLLER) {
    return [...DELEGATABLE_MODULES];
  }
  return [];
}

export function modulesDelegatorMayAssign(
  granterRole: UserRoleType,
  granterGrants: ModuleGrantInput[]
): DelegatableModule[] {
  const executive = modulesExecutiveMayAssign(granterRole);
  if (executive.length > 0) return executive;

  const delegatable = new Set<DelegatableModule>();
  for (const g of granterGrants) {
    if (!g.canDelegate) continue;
    if (!DELEGATABLE_MODULES.includes(g.module as DelegatableModule)) continue;
    delegatable.add(g.module as DelegatableModule);
    const children = MODULE_CHILD_MODULES[g.module as DelegatableModule];
    if (children) children.forEach((c) => delegatable.add(c));
  }
  return [...delegatable];
}

export function validateModuleAssignment(input: {
  granterRole: UserRoleType;
  granterGrants: ModuleGrantInput[];
  targetRole: UserRoleType;
  modules: ModuleGrantInput[];
}): { ok: true } | { ok: false; error: string } {
  if (!canAssignAccessToTarget(input.granterRole, input.targetRole)) {
    return { ok: false, error: 'You cannot change access for this user' };
  }

  const allowed = new Set(
    modulesDelegatorMayAssign(input.granterRole, input.granterGrants).map((m) => m)
  );
  if (allowed.size === 0 && input.modules.length > 0) {
    return { ok: false, error: 'You are not authorized to assign department access' };
  }

  for (const m of input.modules) {
    if (!DELEGATABLE_MODULES.includes(m.module as DelegatableModule)) {
      return { ok: false, error: `Invalid module: ${m.module}` };
    }
    if (!allowed.has(m.module as DelegatableModule)) {
      return { ok: false, error: `You cannot assign module: ${m.module}` };
    }
    if (m.canDelegate && input.granterRole !== UserRoleType.PRESIDENT && input.granterRole !== UserRoleType.CFO && input.granterRole !== UserRoleType.CONTROLLER) {
      const parent = input.granterGrants.find((g) => g.module === m.module && g.canDelegate);
      const parentAr = m.module === 'collections' && input.granterGrants.find((g) => g.module === 'accounts_receivable' && g.canDelegate);
      if (!parent && !parentAr) {
        return { ok: false, error: 'Only executives or delegated managers can grant re-delegation' };
      }
    }
    if (m.canDelegate && roleRank(input.targetRole) >= roleRank(UserRoleType.ACCOUNTANT) && !isExecutiveRole(input.granterRole)) {
      return { ok: false, error: 'Re-delegation is for department managers and clerks only' };
    }
  }

  return { ok: true };
}

export function canManageUserAccess(
  granterRole: UserRoleType,
  granterGrants: ModuleGrantInput[],
  targetRole: UserRoleType
): { books: boolean; departments: boolean } {
  const books = canAssignBookAccess(granterRole);
  const departments =
    isExecutiveRole(granterRole) || modulesDelegatorMayAssign(granterRole, granterGrants).length > 0;
  const mayTouch = canAssignAccessToTarget(granterRole, targetRole);
  return {
    books: books && mayTouch,
    departments: departments && mayTouch,
  };
}
