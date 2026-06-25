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
  /** Don't attach Bearer token (used for login). */
  skipAuth?: boolean;
  /** Safe retries / double-submit protection (SO, PO, etc.). */
  idempotencyKey?: string;
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

    const token = options.skipAuth ? null : getAuthBearerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.idempotencyKey?.trim()) {
      headers['Idempotency-Key'] = options.idempotencyKey.trim();
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
    return this.request<{ status: string; timestamp: string; openai: boolean; database: boolean; mock?: boolean; schemaReady?: boolean }>(
      '/health'
    );
  }

  /** Requires DATABASE_URL and users with bcrypt password hashes on the server. */
  async login(email: string, password: string) {
    return this.request<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
  }

  async getDashboardSummary() {
    return this.request<{
      overdueArCount: number;
      overdueApCount: number;
      draftJournalCount: number;
      pendingApprovalJournalCount: number;
      lowStockItems: number;
    }>('/dashboard/summary');
  }

  async getClosedPeriods() {
    return this.request<{ periods: { id: string; year: number; period: number; closedAt: string; closedBy: string | null }[] }>(
      '/periods/closed'
    );
  }

  async closePeriod(year: number, period: number, closedBy?: string) {
    return this.request('/periods/close', { method: 'POST', body: { year, period, closedBy } });
  }

  async reopenPeriod(year: number, period: number) {
    return this.request('/periods/reopen', { method: 'POST', body: { year, period } });
  }

  /** Trial balance CSV — triggers browser download when given blob handling on caller */
  async fetchTrialBalanceCsv(params: { month?: number; year?: number }) {
    const q = new URLSearchParams();
    if (params.month != null) q.set('month', String(params.month));
    if (params.year != null) q.set('year', String(params.year));
    q.set('format', 'csv');
    const token = getAuthBearerToken();
    const url = `${this.baseUrl}/reports/trial-balance?${q.toString()}`;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { headers });
  }

  async getCompany() {
    return this.request<{ company: Record<string, unknown> }>('/company');
  }

  async updateCompany(id: string, data: Record<string, unknown>) {
    return this.request(`/company/${id}`, { method: 'PATCH', body: data });
  }

  /** President / CFO / Controller — manual operations mode and/or AI tenant memory opt-in. */
  async patchCompanyExecutiveSettings(
    id: string,
    body: { manualOperationsMode?: boolean; aiRetainSessionMemory?: boolean }
  ) {
    return this.request<{ company: Record<string, unknown> }>(`/company/${id}/executive-settings`, {
      method: 'PATCH',
      body,
    });
  }

  // ERP — operational orders (own implementation; not affiliated with any commercial ERP product)
  async getErpSummary() {
    return this.request<{
      purchaseOrders: { draft: number; open: number; closed: number };
      salesOrders: { draft: number; open: number; closed: number };
      logistics?: { shipmentsOpen: number; asnInFlight: number; rmaOpen: number };
      hint?: string;
    }>('/erp/summary');
  }

  async getPurchaseOrders() {
    return this.request<{
      purchaseOrders: Array<Record<string, unknown>>;
    }>('/purchase-orders');
  }

  async createPurchaseOrder(
    body: {
      vendorId: string;
      expectedDate?: string;
      currency?: string;
      notes?: string;
      supplierReference?: string;
      lines: { description: string; quantity: number; unitCost: number; inventoryItemId?: string | null }[];
    },
    opts?: { idempotencyKey?: string }
  ) {
    return this.request('/purchase-orders', {
      method: 'POST',
      body,
      idempotencyKey: opts?.idempotencyKey,
    });
  }

  async patchPurchaseOrderStatus(id: string, status: string) {
    return this.request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: { status } });
  }

  async getPurchaseOrderById(id: string) {
    return this.request<{ purchaseOrder: Record<string, unknown> }>(`/purchase-orders/${id}`);
  }

  /** Goods receipt → stock + vendor bill (AP) when DATABASE_URL is set. */
  async receivePurchaseOrder(id: string, receipts: { lineId: string; quantity: number }[]) {
    return this.request<{ success: boolean; invoiceId: string }>(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: { receipts },
    });
  }

  async getSalesOrders() {
    return this.request<{
      salesOrders: Array<Record<string, unknown>>;
    }>('/sales-orders');
  }

  async createSalesOrder(
    body: {
      customerId: string;
      requestedShipDate?: string;
      currency?: string;
      notes?: string;
      customerPurchaseOrderRef?: string;
      lines: { description: string; quantity: number; unitPrice: number; inventoryItemId?: string | null }[];
    },
    opts?: { idempotencyKey?: string }
  ) {
    return this.request('/sales-orders', {
      method: 'POST',
      body,
      idempotencyKey: opts?.idempotencyKey,
    });
  }

  async patchSalesOrderStatus(id: string, status: string) {
    return this.request(`/sales-orders/${id}/status`, { method: 'PATCH', body: { status } });
  }

  async getSalesOrderById(id: string) {
    return this.request<{ salesOrder: Record<string, unknown> }>(`/sales-orders/${id}`);
  }

  /** Shipment → stock issue + customer invoice (AR) when DATABASE_URL is set. */
  async shipSalesOrder(id: string, shipments: { lineId: string; quantity: number }[]) {
    return this.request<{ success: boolean; invoiceId: string }>(`/sales-orders/${id}/ship`, {
      method: 'POST',
      body: { shipments },
    });
  }

  async getBoms() {
    return this.request<{ boms: Array<Record<string, unknown>> }>('/bom');
  }

  async createBom(body: {
    finishedGoodsItemId: string;
    notes?: string;
    lines: { componentItemId: string; quantityPer: number }[];
  }) {
    return this.request('/bom', { method: 'POST', body });
  }

  async getProductionOrders() {
    return this.request<{ productionOrders: Array<Record<string, unknown>> }>('/production-orders');
  }

  async createProductionOrder(body: {
    finishedGoodsItemId: string;
    quantityOrdered: number;
    bomHeaderId?: string | null;
    notes?: string;
    orderNumber?: string;
  }) {
    return this.request('/production-orders', { method: 'POST', body });
  }

  async patchProductionOrderStatus(id: string, status: string) {
    return this.request(`/production-orders/${id}/status`, { method: 'PATCH', body: { status } });
  }

  async completeProductionOrder(id: string, quantity: number) {
    return this.request<{ success: boolean; productionOrder: Record<string, unknown> | null }>(
      `/production-orders/${id}/complete`,
      { method: 'POST', body: { quantity } }
    );
  }

  // ERP — logistics & traceability (shipping docs, ASN, RMA, lots/serials, freight audit, barcodes)
  async getLogisticsCarriers() {
    return this.request<{ carriers: Array<Record<string, unknown>> }>('/logistics/carriers');
  }

  async createLogisticsCarrier(body: Record<string, unknown>) {
    return this.request('/logistics/carriers', { method: 'POST', body });
  }

  async getWarehouseLocations() {
    return this.request<{ locations: Array<Record<string, unknown>> }>('/logistics/warehouse-locations');
  }

  async createWarehouseLocation(body: Record<string, unknown>) {
    return this.request('/logistics/warehouse-locations', { method: 'POST', body });
  }

  async getLogisticsShipments() {
    return this.request<{ shipments: Array<Record<string, unknown>> }>('/logistics/shipments');
  }

  async createLogisticsShipment(body: Record<string, unknown>) {
    return this.request('/logistics/shipments', { method: 'POST', body });
  }

  async issueLogisticsStandardDocs(shipmentId: string) {
    return this.request<{ documents: Array<Record<string, unknown>> }>(
      `/logistics/shipments/${shipmentId}/issue-standard-docs`,
      { method: 'POST' }
    );
  }

  async getInboundAsns() {
    return this.request<{ asns: Array<Record<string, unknown>> }>('/logistics/asn');
  }

  async createInboundAsn(body: Record<string, unknown>) {
    return this.request('/logistics/asn', { method: 'POST', body });
  }

  async getLogisticsRmas() {
    return this.request<{ rmas: Array<Record<string, unknown>> }>('/logistics/rma');
  }

  async createLogisticsRma(body: Record<string, unknown>) {
    return this.request('/logistics/rma', { method: 'POST', body });
  }

  async getFreightCharges(params?: { shipmentId?: string }) {
    const q = new URLSearchParams();
    if (params?.shipmentId) q.set('shipmentId', params.shipmentId);
    const qs = q.toString();
    return this.request<{ freightCharges: Array<Record<string, unknown>> }>(
      `/logistics/freight-charges${qs ? `?${qs}` : ''}`
    );
  }

  async createFreightCharge(body: Record<string, unknown>) {
    return this.request('/logistics/freight-charges', { method: 'POST', body });
  }

  async getInventoryLots(itemId?: string) {
    const q = itemId ? `?itemId=${encodeURIComponent(itemId)}` : '';
    return this.request<{ lots: Array<Record<string, unknown>> }>(`/logistics/lots${q}`);
  }

  async createInventoryLot(body: Record<string, unknown>) {
    return this.request('/logistics/lots', { method: 'POST', body });
  }

  async getInventorySerials(itemId?: string) {
    const q = itemId ? `?itemId=${encodeURIComponent(itemId)}` : '';
    return this.request<{ serials: Array<Record<string, unknown>> }>(`/logistics/serials${q}`);
  }

  async createInventorySerial(body: Record<string, unknown>) {
    return this.request('/logistics/serials', { method: 'POST', body });
  }

  async issueLogisticsBarcode(body: {
    payload: string;
    humanReadable?: string;
    symbology?: string;
    linkType?: string;
    linkId?: string;
  }) {
    return this.request<{ barcode: Record<string, unknown>; svgUrl: string }>('/logistics/barcodes', {
      method: 'POST',
      body,
    });
  }

  // Accounts
  async getAccounts(filters?: {
    book?: string;
    type?: string;
    search?: string;
    includeInactive?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.book) params.set('book', filters.book);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.includeInactive) params.set('includeInactive', '1');
    const qs = params.toString();
    return this.request(`/accounts${qs ? `?${qs}` : ''}`);
  }

  async getAccountById(id: string) {
    return this.request(`/accounts/${id}`);
  }

  async createAccount(data: Record<string, unknown>, opts?: { book?: string }) {
    const qs = opts?.book ? `?book=${encodeURIComponent(opts.book)}` : '';
    return this.request(`/accounts${qs}`, { method: 'POST', body: data });
  }

  async updateAccount(id: string, data: Record<string, unknown>) {
    return this.request(`/accounts/${id}`, { method: 'PATCH', body: data });
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

  async submitJournalEntry(id: string) {
    return this.request(`/journal-entries/${id}/submit`, { method: 'POST' });
  }

  async approveJournalEntry(id: string, approvedBy?: string) {
    return this.request(`/journal-entries/${id}/approve`, {
      method: 'POST',
      body: approvedBy ? { approvedBy } : {},
    });
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

  /** Post invoice to GL (requires JWT when server enforces auth). */
  async postInvoiceToLedger(id: string) {
    return this.request<{ journalEntryId: string; alreadyPosted: boolean }>(`/invoices/${id}/post-to-ledger`, {
      method: 'POST',
    });
  }

  /** Post payment to GL (requires JWT when server enforces auth). */
  async postPaymentToLedger(id: string) {
    return this.request<{ journalEntryId: string; alreadyPosted: boolean }>(`/payments/${id}/post-to-ledger`, {
      method: 'POST',
    });
  }

  /** AI accounting review — suggestions only; does not modify data. */
  async accountingReview(body: { invoiceId: string } | { paymentId: string }) {
    return this.request<{
      summary: string;
      risks: string[];
      suggestions: string[];
      checksPassed: string[];
      demoMode: boolean;
    }>('/ai/accounting-review', { method: 'POST', body });
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

  async updateCustomer(id: string, data: Record<string, unknown>) {
    return this.request(`/customers/${id}`, { method: 'PATCH', body: data });
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

  async updateVendor(id: string, data: Record<string, unknown>) {
    return this.request(`/vendors/${id}`, { method: 'PATCH', body: data });
  }

  // Payments
  async getPayments(filters?: { type?: 'AR' | 'AP' }) {
    const q =
      filters?.type != null ? `?type=${encodeURIComponent(filters.type)}` : '';
    return this.request(`/payments${q}`);
  }

  async getPaymentById(id: string) {
    return this.request(`/payments/${id}`);
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
  async sendAIMessage(message: string, context?: Record<string, unknown>) {
    return this.request<{
      success?: boolean;
      response: string;
      model?: string;
      tokens?: number;
      latency?: number;
    }>('/ai/chat', { method: 'POST', body: { message, context } });
  }

  async getAIHealth() {
    return this.request<{ status: string; openaiConfigured: boolean; mode: string }>('/ai/health');
  }

  /** ERP Assistant — plain-language help for CS clerks; uses live order/shipment snapshot when DB is connected. */
  async sendErpAssistantMessage(message: string) {
    return this.request<{
      success: boolean;
      response: string;
      model?: string;
      tokens?: number;
      latency?: number;
    }>('/ai/erp-assistant', { method: 'POST', body: { message } });
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

  /** Redeem product-style code → creates tenant (public; uses skipAuth). */
  async activateRegistration(body: { code: string; organizationName?: string }) {
    return this.request<{
      displayCode: string;
      companyId: string;
      companyName: string;
      alreadyActivated: boolean;
      message?: string;
    }>('/registrations/activate', { method: 'POST', body, skipAuth: true });
  }

  /** Vendor-side: list issued registration records (requires JWT + issuer role). */
  async listCustomerRegistrations() {
    return this.request<{
      registrations: Array<{
        id: string;
        registrationCode: string;
        customerName: string | null;
        contactEmail: string | null;
        internalNotes: string | null;
        status: string;
        issuedAt: string;
        expiresAt: string | null;
        activatedAt: string | null;
        revokedAt: string | null;
        companyId: string | null;
        companyName: string | null;
      }>;
    }>('/registrations');
  }

  async issueCustomerRegistration(body: {
    customerName?: string;
    contactEmail?: string;
    internalNotes?: string;
    expiresAt?: string;
  }) {
    return this.request<{ id: string; registrationCode: string }>('/registrations/issue', {
      method: 'POST',
      body,
    });
  }

  async revokeCustomerRegistration(id: string) {
    return this.request(`/registrations/${id}/revoke`, { method: 'POST' });
  }

  /** Listed stored FX rows (requires JWT). */
  async getExchangeRates(params?: { limit?: number }) {
    const q = params?.limit != null ? `?limit=${params.limit}` : '';
    return this.request<{ rates: Array<Record<string, unknown>> }>(`/exchange-rates${q}`);
  }

  /** Pull ECB reference rates via Frankfurter (free, no API key). Requires JWT + accountant-level role. */
  async refreshExchangeRates(body?: { quoteCurrencies?: string[]; date?: string; baseCurrency?: string }) {
    return this.request<{
      message: string;
      date: string;
      base: string;
      quotesWritten: number;
    }>('/exchange-rates/refresh', { method: 'POST', body: body ?? {} });
  }

  /** Convert using stored rates for the given UTC date (default today). */
  async convertCurrency(params: { amount: number; from: string; to: string; date?: string }) {
    const q = new URLSearchParams({
      amount: String(params.amount),
      from: params.from,
      to: params.to,
    });
    if (params.date) q.set('date', params.date);
    return this.request<{
      amount: number;
      fromCurrency: string;
      toCurrency: string;
      convertedAmount: number;
      date: string;
    }>(`/exchange-rates/convert?${q.toString()}`);
  }

  // --- Product intelligence (feedback, allow-listed intel digest, spec drafts) ---
  async submitProductFeedback(body: { category: string; title?: string; body: string }) {
    return this.request<{ feedback: Record<string, unknown> }>('/product-intel/feedback', {
      method: 'POST',
      body,
    });
  }

  async getMyProductFeedback() {
    return this.request<{ feedback: Record<string, unknown>[] }>('/product-intel/feedback/mine');
  }

  async getCompanyProductFeedback() {
    return this.request<{ feedback: Record<string, unknown>[] }>('/product-intel/feedback');
  }

  async patchProductFeedbackStatus(id: string, status: string) {
    return this.request(`/product-intel/feedback/${id}`, { method: 'PATCH', body: { status } });
  }

  async listIntelSources() {
    return this.request<{ sources: Record<string, unknown>[] }>('/product-intel/intel/sources');
  }

  async createIntelSource(body: { label: string; url: string }) {
    return this.request<{ source: Record<string, unknown> }>('/product-intel/intel/sources', {
      method: 'POST',
      body,
    });
  }

  async deleteIntelSource(id: string) {
    return this.request(`/product-intel/intel/sources/${id}`, { method: 'DELETE' });
  }

  async runIntelDigest() {
    return this.request<{ ok: boolean; sourcesProcessed: number; itemsWritten: number }>(
      '/product-intel/intel/run',
      { method: 'POST', body: {} }
    );
  }

  async listIntelDigests(params?: { limit?: number }) {
    const q = params?.limit != null ? `?limit=${params.limit}` : '';
    return this.request<{ digests: Record<string, unknown>[] }>(`/product-intel/intel/digests${q}`);
  }

  async draftProductSpec(topic: string, context?: string) {
    return this.request<{ markdown: string }>('/product-intel/spec-draft', {
      method: 'POST',
      body: { topic, context },
    });
  }

  // --- Agent org (automated accounting program) ---
  async getAgentOrgDigest() {
    return this.request<Record<string, unknown>>('/agent-org/digest');
  }

  async listAgentOrgEvents(params?: { status?: string; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request<{ events: Record<string, unknown>[] }>(`/agent-org/events${qs ? `?${qs}` : ''}`);
  }

  async ingestAgentOrgEvent(body: {
    source: string;
    eventType: string;
    externalId?: string;
    idempotencyKey?: string;
    payload: Record<string, unknown>;
  }) {
    return this.request<{ event: Record<string, unknown>; idempotentReplay?: boolean }>('/agent-org/events', {
      method: 'POST',
      body,
    });
  }

  async patchAgentOrgEvent(id: string, status: string, statusMessage?: string) {
    return this.request(`/agent-org/events/${id}`, {
      method: 'PATCH',
      body: { status, statusMessage },
    });
  }

  async runAgentBookkeeper() {
    return this.request<Record<string, unknown>>('/agent-org/run-bookkeeper', { method: 'POST', body: {} });
  }

  async listAgentOrgWork(params?: { role?: string }) {
    const q = params?.role ? `?role=${encodeURIComponent(params.role)}` : '';
    return this.request<{ workItems: Record<string, unknown>[] }>(`/agent-org/work${q}`);
  }

  async createAgentWorkItem(body: {
    agentRole: string;
    title: string;
    description?: string;
    priority?: number;
    buildSpecJson?: Record<string, unknown>;
    eventId?: string;
  }) {
    return this.request<{ workItem: Record<string, unknown> }>('/agent-org/work', { method: 'POST', body });
  }

  async getShopifyConnectorStatus() {
    return this.request<Record<string, unknown>>('/connectors/shopify/status');
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;