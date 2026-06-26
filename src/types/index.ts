// Accounting system types based on SPEC.md

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  country: 'US' | 'MX';
  currency: 'USD' | 'MXN';
  fiscalYearStart: number;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  useInventory: boolean;
  usePayroll: boolean;
  useMultiCurrency: boolean;
  useCostCenters: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  mfaEnabled: boolean;
  mfaSecret?: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  companyId: string;
  companyName?: string;
  canViewPortfolio?: boolean;
  moduleGrants?: Array<{ module: string; canDelegate: boolean }>;
  /** Beta tester sandbox — access expires after first-login trial window. */
  isTester?: boolean;
  accessExpiresAt?: string | null;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRoleType =
  | 'PRESIDENT'
  | 'CFO'
  | 'CONTROLLER'
  | 'ACCOUNTANT'
  | 'AP_CLERK'
  | 'AR_CLERK'
  | 'READONLY';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: string;
  description?: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  cashFlowCategory?: 'Operating' | 'Investing' | 'Financing';
  allowPosting: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'COST_OF_GOODS_SOLD';

export interface JournalEntry {
  id: string;
  entryNumber: number;
  date: Date;
  description: string;
  reference?: string;
  status: EntryStatus;
  isRecurring: boolean;
  recurringId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  period: number;
  year: number;
  companyId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines: JournalLine[];
}

export type EntryStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'POSTED'
  | 'REVERSED'
  | 'DELETED';

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  description?: string;
  debit?: number;
  credit?: number;
  costCenterId?: string;
  account?: Account;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  creditLimit?: number;
  paymentTerms: number;
  discountPercent?: number;
  balance: number;
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  paymentTerms: number;
  discountPercent?: number;
  tax1099Category?: string;
  balance: number;
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  customerId?: string;
  vendorId?: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  cfdiUuid?: string;
  cfdiSatId?: string;
  cfdiStatus?: string;
  notes?: string;
  terms?: string;
  companyId: string;
  customer?: Customer;
  vendor?: Vendor;
  lines: InvoiceLine[];
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceType =
  | 'AR_INVOICE'
  | 'AP_INVOICE'
  | 'AR_CREDIT_MEMO'
  | 'AP_CREDIT_MEMO';

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'CFDI_PENDING'
  | 'CFDI_STAMPED';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  taxRate?: number;
  taxCode?: string;
  inventoryItemId?: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  date: Date;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  checkNumber?: string;
  status: PaymentStatus;
  appliedAmount: number;
  notes?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod =
  | 'CASH'
  | 'CHECK'
  | 'WIRE_TRANSFER'
  | 'CREDIT_CARD'
  | 'ACH'
  | 'OTHER';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSED'
  | 'VOID';

export interface ChatSession {
  id: string;
  title?: string;
  isActive: boolean;
  contextSnapshot?: string;
  userId: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  tokens?: number;
  model?: string;
  latency?: number;
  attachments?: ChatAttachment[];
  userId?: string;
  createdAt: Date;
}

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface ChatAttachment {
  type: 'report' | 'chart' | 'table' | 'document';
  data: any;
  description: string;
}

// Dashboard types
export interface DashboardKPIs {
  revenue: number;
  expenses: number;
  netIncome: number;
  cashBalance: number;
  revenueTrend: number;
  expenseTrend: number;
  outstandingAR: number;
  outstandingAP: number;
}

export interface RecentTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'invoice' | 'payment' | 'journal';
  status: string;
}

// Report types
export interface TrialBalance {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  period: number;
  year: number;
}

export interface TrialBalanceAccount {
  account: Account;
  debit: number;
  credit: number;
}

export interface FinancialStatement {
  title: string;
  period: string;
  lines: FinancialStatementLine[];
  totals: Record<string, number>;
}

export interface FinancialStatementLine {
  label: string;
  level: number;
  amount?: number;
  isBold: boolean;
  isTotal: boolean;
}