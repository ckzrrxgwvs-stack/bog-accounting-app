// API Client - Frontend to Backend Communication

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

function getAuthBearerToken(): string | null {
  const direct = localStorage.getItem('auth_token');
  if (direct) return direct;
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      ...options.headers,
    };

    const method = options.method || 'GET';
    if (method !== 'GET' && options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const token = getAuthBearerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await response.text();
      const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

      if (!response.ok) {
        return {
          success: false,
          error: String(data.error ?? `HTTP Error: ${response.status}`),
        };
      }

      return {
        success: true,
        data: (data.data ?? data) as T,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async getHealth() {
    return this.request<{ status: string; timestamp: string; openai: boolean; database: boolean }>('/health');
  }

  async getCompany() {
    return this.request<{ company: Record<string, unknown> }>('/company');
  }

  async updateCompany(id: string, data: Record<string, unknown>) {
    return this.request(`/company/${id}`, { method: 'PATCH', body: data });
  }

  // Accounts
  async getAccounts(filters?: { type?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.request(`/accounts${qs ? `?${qs}` : ''}`);
  }

  async getAccountById(id: string) {
    return this.request(`/accounts/${id}`);
  }

  async createAccount(data: any) {
    return this.request('/accounts', { method: 'POST', body: data });
  }

  // Journal Entries
  async getJournalEntries(filters?: { startDate?: string; endDate?: string; status?: string }) {
    const params = new URLSearchParams(filters as any);
    return this.request(`/journal-entries?${params}`);
  }

  async getJournalEntryById(id: string) {
    return this.request(`/journal-entries/${id}`);
  }

  async createJournalEntry(data: any) {
    return this.request('/journal-entries', { method: 'POST', body: data });
  }

  async postJournalEntry(id: string) {
    return this.request(`/journal-entries/${id}/post`, { method: 'POST' });
  }

  // Invoices
  async getInvoices(type: 'AR' | 'AP') {
    return this.request(`/invoices?type=${type}`);
  }

  async getInvoiceById(id: string) {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.request('/invoices', { method: 'POST', body: data });
  }

  async updateInvoiceStatus(id: string, status: string) {
    return this.request(`/invoices/${id}/status`, { method: 'PUT', body: { status } });
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async getCustomerById(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.request('/customers', { method: 'POST', body: data });
  }

  // Vendors
  async getVendors() {
    return this.request('/vendors');
  }

  async getVendorById(id: string) {
    return this.request(`/vendors/${id}`);
  }

  async createVendor(data: any) {
    return this.request('/vendors', { method: 'POST', body: data });
  }

  // Payments
  async getPayments() {
    return this.request('/payments');
  }

  async createPayment(data: any) {
    return this.request('/payments', { method: 'POST', body: data });
  }

  async getInventoryItems() {
    return this.request('/inventory');
  }

  async createInventoryItem(data: Record<string, unknown>) {
    return this.request('/inventory', { method: 'POST', body: data });
  }

  // Reports (server exposes GET with hyphenated paths)
  async getReport(type: 'income_statement' | 'balance_sheet' | 'trial_balance', params?: Record<string, string>) {
    const pathMap = {
      income_statement: 'income-statement',
      balance_sheet: 'balance-sheet',
      trial_balance: 'trial-balance',
    } as const;
    const q = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/reports/${pathMap[type]}${q}`, { method: 'GET' });
  }

  async getCashFlowReport(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/reports/cash-flow${q}`, { method: 'GET' });
  }

  // AI CPA
  async sendAIMessage(message: string, context?: any) {
    return this.request('/ai/chat', { method: 'POST', body: { message, context } });
  }

  async getAIHistory() {
    return this.request('/ai/history');
  }

  // CFDI
  async stampCFDI(data: any) {
    return this.request('/cfdi/stamp', { method: 'POST', body: data });
  }

  async cancelCFDI(uuid: string, rfcEmisor: string) {
    return this.request('/cfdi/cancel', { method: 'POST', body: { uuid, rfcEmisor } });
  }

  async verifyCFDI(uuid: string) {
    return this.request(`/cfdi/verify/${uuid}`);
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(data: any) {
    return this.request('/users', { method: 'POST', body: data });
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, { method: 'PUT', body: data });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  async updateUserRole(id: string, role: string) {
    return this.request(`/users/${id}/role`, { method: 'PUT', body: { role } });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;