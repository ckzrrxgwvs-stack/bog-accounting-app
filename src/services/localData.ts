// Local Data Service - Free tier storage using localStorage
// Can be swapped for Supabase/PostgreSQL when going live

// Simple UUID generator (browser compatible)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEYS = {
  COMPANY: 'accounting_company',
  USERS: 'accounting_users',
  ACCOUNTS: 'accounting_accounts',
  JOURNAL_ENTRIES: 'accounting_journal_entries',
  CUSTOMERS: 'accounting_customers',
  VENDORS: 'accounting_vendors',
  INVOICES: 'accounting_invoices',
  PAYMENTS: 'accounting_payments',
  INVENTORY: 'accounting_inventory',
  CHAT_SESSIONS: 'accounting_chat_sessions',
  AUDIT_LOG: 'accounting_audit_log',
};

class LocalDataService {
  // Generic CRUD operations
  private getData<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setData<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Company
  getCompany() {
    let company = this.getData<any>(STORAGE_KEYS.COMPANY)[0];
    if (!company) {
      company = {
        id: generateId(),
        name: 'Acme Corporation',
        legalName: 'Acme Corporation Inc.',
        country: 'US',
        currency: 'USD',
        taxId: '12-3456789',
        email: 'admin@acme.com',
        phone: '(555) 123-4567',
        address: '123 Main Street, Suite 100',
        useInventory: true,
        usePayroll: true,
        useMultiCurrency: false,
        useCostCenters: false,
        createdAt: new Date().toISOString(),
      };
      this.setData(STORAGE_KEYS.COMPANY, [company]);
    }
    return company;
  }

  updateCompany(data: Partial<any>) {
    const company = this.getCompany();
    const updated = { ...company, ...data };
    this.setData(STORAGE_KEYS.COMPANY, [updated]);
    return updated;
  }

  // Users
  getUsers() {
    let users = this.getData<any>(STORAGE_KEYS.USERS);
    if (users.length === 0) {
      // Seed demo users
      users = [
        {
          id: generateId(),
          email: 'admin@company.com',
          passwordHash: 'demo123',
          firstName: 'John',
          lastName: 'Smith',
          role: 'PRESIDENT',
          mfaEnabled: true,
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: '2026-01-15T10:00:00',
        },
        {
          id: generateId(),
          email: 'cfo@company.com',
          passwordHash: 'demo123',
          firstName: 'Sarah',
          lastName: 'Johnson',
          role: 'CFO',
          mfaEnabled: true,
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: '2026-01-20T14:30:00',
        },
        {
          id: generateId(),
          email: 'accountant@company.com',
          passwordHash: 'demo123',
          firstName: 'Carlos',
          lastName: 'Rodriguez',
          role: 'ACCOUNTANT',
          mfaEnabled: true,
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: '2026-02-01T09:00:00',
        },
      ];
      this.setData(STORAGE_KEYS.USERS, users);
    }
    return users;
  }

  createUser(userData: any) {
    const users = this.getUsers();
    const newUser = {
      id: generateId(),
      ...userData,
      mfaEnabled: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.setData(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  updateUser(id: string, data: Partial<any>) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      this.setData(STORAGE_KEYS.USERS, users);
      return users[index];
    }
    return null;
  }

  deleteUser(id: string) {
    const users = this.getUsers().filter(u => u.id !== id);
    this.setData(STORAGE_KEYS.USERS, users);
  }

  // Accounts (Chart of Accounts)
  getAccounts() {
    let accounts = this.getData<any>(STORAGE_KEYS.ACCOUNTS);
    if (accounts.length === 0) {
      accounts = this.seedDefaultAccounts();
      this.setData(STORAGE_KEYS.ACCOUNTS, accounts);
    }
    return accounts;
  }

  private seedDefaultAccounts() {
    return [
      // Assets
      { id: generateId(), code: '1100', name: 'Cash', type: 'ASSET', subtype: 'Cash', allowPosting: true, isActive: true },
      { id: generateId(), code: '1200', name: 'Accounts Receivable', type: 'ASSET', subtype: 'Receivables', allowPosting: true, isActive: true },
      { id: generateId(), code: '1300', name: 'Inventory', type: 'ASSET', subtype: 'Inventory', allowPosting: true, isActive: true },
      { id: generateId(), code: '1500', name: 'Equipment', type: 'ASSET', subtype: 'Fixed Assets', allowPosting: true, isActive: true },
      { id: generateId(), code: '1600', name: 'Accumulated Depreciation', type: 'ASSET', subtype: 'Contra', allowPosting: true, isActive: true },
      // Liabilities
      { id: generateId(), code: '2100', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'Payables', allowPosting: true, isActive: true },
      { id: generateId(), code: '2200', name: 'Salaries Payable', type: 'LIABILITY', subtype: 'Payroll', allowPosting: true, isActive: true },
      { id: generateId(), code: '2300', name: 'Taxes Payable', type: 'LIABILITY', subtype: 'Taxes', allowPosting: true, isActive: true },
      { id: generateId(), code: '2500', name: 'Notes Payable', type: 'LIABILITY', subtype: 'Debt', allowPosting: true, isActive: true },
      // Equity
      { id: generateId(), code: '3100', name: 'Common Stock', type: 'EQUITY', subtype: 'Capital', allowPosting: true, isActive: true },
      { id: generateId(), code: '3200', name: 'Retained Earnings', type: 'EQUITY', subtype: 'Earnings', allowPosting: true, isActive: true },
      { id: generateId(), code: '3900', name: 'Net Income', type: 'EQUITY', subtype: 'Earnings', allowPosting: true, isActive: true },
      // Revenue
      { id: generateId(), code: '4100', name: 'Sales Revenue', type: 'REVENUE', subtype: 'Operating', allowPosting: true, isActive: true },
      { id: generateId(), code: '4200', name: 'Service Revenue', type: 'REVENUE', subtype: 'Operating', allowPosting: true, isActive: true },
      { id: generateId(), code: '4300', name: 'Interest Income', type: 'REVENUE', subtype: 'Non-Operating', allowPosting: true, isActive: true },
      // Expenses
      { id: generateId(), code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', subtype: 'COGS', allowPosting: true, isActive: true },
      { id: generateId(), code: '5200', name: 'Salaries Expense', type: 'EXPENSE', subtype: 'Payroll', allowPosting: true, isActive: true },
      { id: generateId(), code: '5300', name: 'Rent Expense', type: 'EXPENSE', subtype: 'Operating', allowPosting: true, isActive: true },
      { id: generateId(), code: '5400', name: 'Utilities Expense', type: 'EXPENSE', subtype: 'Operating', allowPosting: true, isActive: true },
      { id: generateId(), code: '5500', name: 'Depreciation Expense', type: 'EXPENSE', subtype: 'Non-Cash', allowPosting: true, isActive: true },
      { id: generateId(), code: '5600', name: 'Interest Expense', type: 'EXPENSE', subtype: 'Non-Operating', allowPosting: true, isActive: true },
      { id: generateId(), code: '5700', name: 'Income Tax Expense', type: 'EXPENSE', subtype: 'Taxes', allowPosting: true, isActive: true },
    ];
  }

  createAccount(accountData: any) {
    const accounts = this.getAccounts();
    const newAccount = {
      id: generateId(),
      ...accountData,
      allowPosting: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    accounts.push(newAccount);
    this.setData(STORAGE_KEYS.ACCOUNTS, accounts);
    return newAccount;
  }

  // Journal Entries
  getJournalEntries(filters?: { startDate?: string; endDate?: string; status?: string }) {
    let entries = this.getData<any>(STORAGE_KEYS.JOURNAL_ENTRIES);
    if (filters) {
      if (filters.status) {
        entries = entries.filter(e => e.status === filters.status);
      }
      if (filters.startDate) {
        entries = entries.filter(e => e.date >= filters.startDate);
      }
      if (filters.endDate) {
        entries = entries.filter(e => e.date <= filters.endDate);
      }
    }
    return entries;
  }

  createJournalEntry(entryData: any) {
    const entries = this.getJournalEntries();
    const newEntry = {
      id: generateId(),
      entryNumber: entries.length + 1,
      date: new Date().toISOString(),
      status: 'DRAFT',
      ...entryData,
      createdAt: new Date().toISOString(),
    };
    entries.push(newEntry);
    this.setData(STORAGE_KEYS.JOURNAL_ENTRIES, entries);
    return newEntry;
  }

  updateJournalEntry(id: string, data: Partial<any>) {
    const entries = this.getJournalEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...data };
      this.setData(STORAGE_KEYS.JOURNAL_ENTRIES, entries);
      return entries[index];
    }
    return null;
  }

  // Customers
  getCustomers() {
    let customers = this.getData<any>(STORAGE_KEYS.CUSTOMERS);
    if (customers.length === 0) {
      customers = this.seedDefaultCustomers();
      this.setData(STORAGE_KEYS.CUSTOMERS, customers);
    }
    return customers;
  }

  private seedDefaultCustomers() {
    return [
      { id: generateId(), code: 'CUST-001', name: 'Tech Solutions Inc.', email: 'billing@techsolutions.com', phone: '(555) 100-2000', taxId: '12-3456789', balance: 15000, paymentTerms: 30, isActive: true },
      { id: generateId(), code: 'CUST-002', name: 'Global Industries', email: 'ap@globalind.com', phone: '(555) 200-3000', taxId: '98-7654321', balance: 8500, paymentTerms: 30, isActive: true },
      { id: generateId(), code: 'CUST-003', name: 'Smith & Associates', email: 'accounts@smithassoc.com', phone: '(555) 300-4000', taxId: '45-6789012', balance: 3200, paymentTerms: 45, isActive: true },
    ];
  }

  createCustomer(customerData: any) {
    const customers = this.getCustomers();
    const newCustomer = {
      id: generateId(),
      code: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      balance: 0,
      isActive: true,
      ...customerData,
      createdAt: new Date().toISOString(),
    };
    customers.push(newCustomer);
    this.setData(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  // Vendors
  getVendors() {
    let vendors = this.getData<any>(STORAGE_KEYS.VENDORS);
    if (vendors.length === 0) {
      vendors = this.seedDefaultVendors();
      this.setData(STORAGE_KEYS.VENDORS, vendors);
    }
    return vendors;
  }

  private seedDefaultVendors() {
    return [
      { id: generateId(), code: 'VEND-001', name: 'Office Supplies Co.', email: 'orders@officesupplies.com', phone: '(555) 900-1000', taxId: '11-2223334', balance: 2500, paymentTerms: 30, isActive: true },
      { id: generateId(), code: 'VEND-002', name: 'Tech Vendor LLC', email: 'procurement@techvendor.com', phone: '(555) 800-2000', taxId: '55-6667778', balance: 12000, paymentTerms: 30, isActive: true },
      { id: generateId(), code: 'VEND-003', name: 'Utility Services', email: 'billing@utilities.com', phone: '(555) 700-3000', taxId: '99-0001112', balance: 450, paymentTerms: 15, isActive: true },
    ];
  }

  createVendor(vendorData: any) {
    const vendors = this.getVendors();
    const newVendor = {
      id: generateId(),
      code: `VEND-${String(vendors.length + 1).padStart(3, '0')}`,
      balance: 0,
      isActive: true,
      ...vendorData,
      createdAt: new Date().toISOString(),
    };
    vendors.push(newVendor);
    this.setData(STORAGE_KEYS.VENDORS, vendors);
    return newVendor;
  }

  // Invoices
  getInvoices(type?: 'AR' | 'AP') {
    let invoices = this.getData<any>(STORAGE_KEYS.INVOICES);
    if (invoices.length === 0) {
      invoices = this.seedDefaultInvoices();
      this.setData(STORAGE_KEYS.INVOICES, invoices);
    }
    if (type) {
      invoices = invoices.filter(i => i.type === type);
    }
    return invoices;
  }

  private seedDefaultInvoices() {
    const now = new Date();
    return [
      { id: generateId(), invoiceNumber: 'INV-2026-0045', type: 'AR', customerId: null, issueDate: now.toISOString(), dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), subtotal: 15000, taxAmount: 1200, total: 16200, paidAmount: 0, balance: 16200, status: 'SENT' },
      { id: generateId(), invoiceNumber: 'INV-2026-0044', type: 'AR', customerId: null, issueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(), subtotal: 8500, taxAmount: 680, total: 9180, paidAmount: 5000, balance: 4180, status: 'PARTIAL' },
      { id: generateId(), invoiceNumber: 'INV-2026-0043', type: 'AR', customerId: null, issueDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), subtotal: 5000, taxAmount: 400, total: 5400, paidAmount: 0, balance: 5400, status: 'OVERDUE' },
      { id: generateId(), invoiceNumber: 'BILL-2026-0089', type: 'AP', vendorId: null, issueDate: now.toISOString(), dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), subtotal: 12000, taxAmount: 960, total: 12960, paidAmount: 0, balance: 12960, status: 'PENDING' },
      { id: generateId(), invoiceNumber: 'BILL-2026-0088', type: 'AP', vendorId: null, issueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), subtotal: 2500, taxAmount: 200, total: 2700, paidAmount: 0, balance: 2700, status: 'PENDING' },
    ];
  }

  createInvoice(invoiceData: any) {
    const invoices = this.getInvoices();
    const newInvoice = {
      id: generateId(),
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      status: 'DRAFT',
      paidAmount: 0,
      balance: invoiceData.total || 0,
      ...invoiceData,
      createdAt: new Date().toISOString(),
    };
    invoices.push(newInvoice);
    this.setData(STORAGE_KEYS.INVOICES, invoices);
    return newInvoice;
  }

  // Audit Log
  addAuditLog(entry: any) {
    const logs = this.getData<any>(STORAGE_KEYS.AUDIT_LOG);
    logs.unshift({
      id: generateId(),
      timestamp: new Date().toISOString(),
      success: true,
      ...entry,
    });
    // Keep only last 1000 entries
    this.setData(STORAGE_KEYS.AUDIT_LOG, logs.slice(0, 1000));
  }

  getAuditLog(filters?: { module?: string; userId?: string }) {
    let logs = this.getData<any>(STORAGE_KEYS.AUDIT_LOG);
    if (filters?.module) {
      logs = logs.filter(l => l.module === filters.module);
    }
    if (filters?.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    return logs;
  }

  // Clear all data (for testing)
  clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const localDataService = new LocalDataService();
export default localDataService;