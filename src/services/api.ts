// API Client - Frontend to Backend Communication

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  /** True when the failure looks transient (server cold start, timeout, gateway error) and a retry may succeed. */
  retryable?: boolean;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  /** Don't attach Bearer token (used for login). */
  skipAuth?: boolean;
  /** Safe retries / double-submit protection (SO, PO, etc.). */
  idempotencyKey?: string;
  /** Abort the request after this many ms (free-tier API can cold-start ~30-60s). */
  timeoutMs?: number;
  /** Number of extra attempts for transient/cold-start failures (with backoff). */
  retries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    const maxAttempts = Math.max(1, (options.retries ?? 0) + 1);
    let lastError: ApiResponse<T> = { success: false, error: 'Network error', retryable: true };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = options.timeoutMs ? new AbortController() : undefined;
      const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller?.signal,
        });

        const text = await response.text();
        // The API may return a non-JSON body (e.g. a proxy/boot HTML page while the
        // free-tier server is waking up). Parse defensively instead of throwing.
        let data: Record<string, unknown> = {};
        let parsed = true;
        if (text) {
          try {
            data = JSON.parse(text) as Record<string, unknown>;
          } catch {
            parsed = false;
          }
        }

        if (!response.ok) {
          const transient = response.status >= 500 || response.status === 408 || response.status === 429;
          lastError = {
            success: false,
            error: parsed
              ? String(data.error ?? `HTTP Error: ${response.status}`)
              : `The server is starting up. Please try again in a moment. (HTTP ${response.status})`,
            retryable: transient || !parsed,
          };
          if (lastError.retryable && attempt < maxAttempts) {
            await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
            continue;
          }
          return lastError;
        }

        if (!parsed) {
          // 2xx but unparseable body — treat as a transient gateway/boot response.
          lastError = {
            success: false,
            error: 'The server is starting up. Please try again in a moment.',
            retryable: true,
          };
          if (attempt < maxAttempts) {
            await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
            continue;
          }
          return lastError;
        }

        return {
          success: true,
          data: (data.data ?? data) as T,
        };
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        console.error('API Error:', error);
        lastError = {
          success: false,
          error: aborted
            ? 'The server is taking longer than expected to respond. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Network error',
          retryable: true,
        };
        if (attempt < maxAttempts) {
          await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
          continue;
        }
        return lastError;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    return lastError;
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

  async getOwnerSetupStatus() {
    return this.request<{
      needsOwnerSetup: boolean;
      ownerSetupCompleted: boolean;
      bootstrapUsersAvailable: boolean;
      presidentEmail: string | null;
      options: {
        availableNow: Array<{ id: string; label: string; description: string }>;
        availableLater: Array<{ id: string; label: string; description: string }>;
      };
    }>('/setup/owner-status', { skipAuth: true });
  }

  async completeOwnerSetup(body: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    generatePassword?: boolean;
    companyName: string;
    deactivateBootstrapUsers?: boolean;
  }) {
    return this.request<{
      token: string;
      generatedPassword?: string;
      user: Record<string, unknown>;
    }>('/setup/owner', { method: 'POST', body, skipAuth: true });
  }

  async getDelegationOptions() {
    return this.request<{
      canAssignBooks: boolean;
      canCreateBooks: boolean;
      assignableModules: Array<{ id: string; label: string }>;
      allModules: Array<{ id: string; label: string }>;
    }>('/portfolio/delegation-options');
  }

  async updateUserAccess(
    userId: string,
    body: {
      canViewPortfolio?: boolean;
      bookIds?: string[];
      modules?: Array<{ module: string; canDelegate?: boolean }>;
    }
  ) {
    return this.request(`/portfolio/users/${userId}/access`, { method: 'PUT', body });
  }

  async createPortfolioProjectBook(label: string) {
    return this.request<{
      book: {
        id: string;
        bookId: string;
        slug: string;
        label: string;
        glCompanyId: string;
        kind: string;
      };
    }>('/portfolio/books', { method: 'POST', body: { label } });
  }

  async getPortfolioBooks() {
    return this.request<{
      books: Array<{ id: string; slug: string; label: string; kind: string; glCompanyId: string }>;
      canViewPortfolio: boolean;
      portfolioCompanyName: string;
    }>('/portfolio/books');
  }

  async getBusinessWorkspaces() {
    return this.request<{
      workspaces: Array<{
        id: string;
        bookId?: string;
        label: string;
        companyId: string;
        kind: 'commerce' | 'investment' | 'project';
        apiBook?: string;
        ledgerKey?: 'commerce' | 'personal' | 'agentic';
      }>;
      canViewPortfolio: boolean;
      activeWorkspaceId: string;
      commerceCompanyName: string;
    }>('/company/workspaces');
  }

  async getDashboardFinancials(params?: { month?: number; year?: number; book?: string }) {
    const q = new URLSearchParams();
    if (params?.month != null) q.set('month', String(params.month));
    if (params?.year != null) q.set('year', String(params.year));
    if (params?.book) q.set('book', params.book);
    const qs = q.toString();
    return this.request(`/dashboard/financials${qs ? `?${qs}` : ''}`);
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

  async getPeriodClosePreview(year: number, period: number) {
    return this.request<{
      year: number;
      period: number;
      alreadyClosed: boolean;
      closedAt: string | null;
      trialBalance: { totalDebits: number; totalCredits: number; isBalanced: boolean };
      openJournals: { id: string; entryNumber: number; date: string; description: string; status: string }[];
      canClose: boolean;
    }>(`/periods/preview?year=${year}&period=${period}`);
  }

  async getIngestSummary() {
    return this.request<{
      books: Array<{
        bookId: string;
        companyName: string;
        draftCount: number;
        postedCount: number;
        pendingApprovalCount: number;
        sources: Array<{
          source: string;
          sourceType: string;
          draftCount: number;
          postedCount: number;
          pendingApprovalCount: number;
          lastPostedAt: string | null;
        }>;
      }>;
      totalDraftCount: number;
      hint: string | null;
    }>('/dashboard/ingest-summary');
  }

  async getBankFeedAccounts() {
    return this.request<{
      accounts: Array<{
        id: string;
        name: string;
        institution: string | null;
        accountMask: string | null;
        currency: string;
        transactionCount: number;
      }>;
      useBankFeeds: boolean;
    }>('/bank-feeds/accounts');
  }

  async getBankFeedTransactions(params?: { accountId?: string; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.accountId) q.set('accountId', params.accountId);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request<{
      transactions: Array<{
        id: string;
        accountId: string;
        accountName: string;
        date: string;
        amount: number;
        memo: string;
      }>;
    }>(`/bank-feeds/transactions${qs ? `?${qs}` : ''}`);
  }

  async importBankFeedCsv(body: {
    csv?: string;
    accountName: string;
    accountMask?: string;
    institution?: string;
    dryRun?: boolean;
  }) {
    return this.request<{
      dryRun: boolean;
      imported: number;
      skipped: number;
      previewCount: number;
      preview: Array<{ date: string; amount: number; memo: string }>;
      hint?: string;
    }>('/bank-feeds/import-csv', { method: 'POST', body });
  }

  async getFinancialProviders() {
    return this.request<{
      providers: Array<{
        provider: string;
        label: string;
        institutionTypes: string[];
        description: string;
        liveReady: boolean;
        envKeys: string[];
        docsUrl?: string;
      }>;
    }>('/financial-connections/providers');
  }

  async getFinancialConnections() {
    return this.request<{
      connections: Array<{
        id: string;
        displayName: string;
        institutionName: string | null;
        institutionType: string;
        provider: string;
        status: string;
        accountMask: string | null;
        lastSyncAt: string | null;
        lastError: string | null;
        bankFeedAccountId: string | null;
        transactionCount: number;
      }>;
      useBankFeeds: boolean;
    }>('/financial-connections');
  }

  async connectFinancialInstitution(body: {
    provider: string;
    institutionType: string;
    displayName: string;
    institutionName?: string;
    accountMask?: string;
  }) {
    return this.request<{
      id: string;
      status: string;
      bankFeedAccountId: string | null;
      lastError: string | null;
    }>('/financial-connections/connect', { method: 'POST', body });
  }

  async syncFinancialConnection(id: string) {
    return this.request<{ imported: number; skipped: number; accountId: string | null }>(
      `/financial-connections/${id}/sync`,
      { method: 'POST', body: {} }
    );
  }

  async disconnectFinancialConnection(id: string) {
    return this.request<{ ok: boolean }>(`/financial-connections/${id}`, { method: 'DELETE' });
  }

  async getOfficeCatalog() {
    return this.request<{
      excelExports: Array<{ id: string; label: string; format: string }>;
      wordTemplates: Array<{ id: string; label: string; description: string }>;
      note: string;
    }>('/office/catalog');
  }

  async downloadOfficeFile(path: string, filename: string) {
    const token = getAuthBearerToken();
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async importJournalExcel(base64: string, dryRun = true) {
    return this.request<{
      dryRun: boolean;
      rowCount: number;
      missingAccountCodes: string[];
      parseErrors: string[];
      preview: Array<Record<string, unknown>>;
      hint?: string;
    }>('/office/excel/import/journals', { method: 'POST', body: { base64, dryRun } });
  }

  async generateWordDocument(template: string, variables?: Record<string, string>) {
    const token = getAuthBearerToken();
    const url = `${this.baseUrl}/office/word/generate`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ template, variables }),
    });
    if (!res.ok) throw new Error(`Word generation failed (${res.status})`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${template}.docx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Trial balance CSV — triggers browser download when given blob handling on caller */
  async fetchTrialBalanceCsv(params: { month?: number; year?: number; book?: string }) {
    const q = new URLSearchParams();
    if (params.month != null) q.set('month', String(params.month));
    if (params.year != null) q.set('year', String(params.year));
    if (params.book) q.set('book', params.book);
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

  async getArAgingReport(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<{ buckets: { bucket: string; amount: number }[] }>(`/reports/ar-aging${q}`, {
      method: 'GET',
    });
  }

  async getApAgingReport(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<{ buckets: { bucket: string; amount: number }[] }>(`/reports/ap-aging${q}`, {
      method: 'GET',
    });
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

  async getTesterInvite(token: string) {
    return this.request<{
      label: string | null;
      trialDays: number;
      isActive: boolean;
      enrollmentCount: number;
      inviteUrl: string;
    }>(`/tester-invites/${encodeURIComponent(token)}`, {
      skipAuth: true,
      timeoutMs: 30000,
      retries: 4,
    });
  }

  async claimTesterInvite(
    token: string,
    body: {
      email: string;
      firstName: string;
      lastName: string;
      companyName?: string;
      password?: string;
      generatePassword?: boolean;
    }
  ) {
    return this.request<{
      token: string;
      generatedPassword?: string;
      accessExpiresAt: string;
      trialDays: number;
      user: Record<string, unknown>;
    }>(`/tester-invites/${encodeURIComponent(token)}/claim`, {
      method: 'POST',
      body,
      skipAuth: true,
      timeoutMs: 45000,
      retries: 2,
    });
  }

  async listTesterInvites() {
    return this.request<{
      links: Array<{
        id: string;
        token: string;
        label: string | null;
        trialDays: number;
        isActive: boolean;
        inviteUrl: string;
        issuedAt: string;
        revokedAt: string | null;
        enrollmentCount: number;
        recentEnrollments: Array<{
          email: string;
          name: string;
          firstLoginAt: string;
          accessExpiresAt: string;
          expired: boolean;
        }>;
      }>;
    }>('/tester-invites');
  }

  async issueTesterInvite(body: { label?: string; trialDays?: number }) {
    return this.request<{ id: string; token: string; inviteUrl: string; trialDays: number }>(
      '/tester-invites/issue',
      { method: 'POST', body }
    );
  }

  async revokeTesterInvite(id: string) {
    return this.request(`/tester-invites/${id}/revoke`, { method: 'POST' });
  }

  async getMyTesterAccess() {
    return this.request<{
      isTester: boolean;
      accessExpiresAt: string | null;
      daysRemaining: number | null;
      expired: boolean;
    }>('/tester-invites/me/access');
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