/** Client mirror of server delegatable modules (labels for Users access UI). */

export const DELEGATABLE_MODULE_LABELS: Record<string, string> = {
  general_ledger: 'General ledger',
  accounts_payable: 'Accounts payable (AP)',
  accounts_receivable: 'Accounts receivable (AR)',
  collections: 'Collections',
  inventory: 'Inventory',
  payroll: 'Payroll',
  cfdi: 'CFDI (Mexico)',
  reports: 'Reports & data studio',
};

export type ModuleGrant = { module: string; canDelegate: boolean };

export function isExecutiveRole(role: string): boolean {
  return role === 'PRESIDENT' || role === 'CFO' || role === 'CONTROLLER';
}
