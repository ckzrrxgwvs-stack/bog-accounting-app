// Settings Page - Company, Security, and System Configuration

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import {
  Settings as SettingsIcon,
  Building,
  Users,
  Shield,
  Database,
  Key,
  Globe,
  Bell,
  FileText,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  Download,
  Server,
  Sparkles,
  FileCheck,
  ExternalLink,
  Zap,
  Star,
  Landmark,
  KeyRound,
  Scale,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useComfortMode } from '@/context/ComfortModeContext';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { id: 'company', label: 'Company', icon: <Building size={18} /> },
  { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  { id: 'integrations', label: 'Integrations', icon: <Globe size={18} /> },
  { id: 'display', label: 'Display & comfort', icon: <Eye size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { id: 'audit', label: 'Audit Log', icon: <FileText size={18} /> },
];

const LICENSING_TAB: TabItem = {
  id: 'licensing',
  label: 'Licensing',
  icon: <KeyRound size={18} />,
};

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  success: boolean;
}

interface CompanySettings {
  name: string;
  legalName: string;
  country: 'US' | 'MX';
  currency: 'USD' | 'MXN';
  taxId: string;
  email: string;
  phone: string;
  address: string;
  useInventory: boolean;
  usePayroll: boolean;
  useMultiCurrency: boolean;
  useCostCenters: boolean;
  glCashAccountCode: string;
  glArAccountCode: string;
  glApAccountCode: string;
  glRevenueAccountCode: string;
  glExpenseAccountCode: string;
  glSalesTaxPayableAccountCode: string;
  glPurchasesExpenseAccountCode: string;
  useBankFeeds: boolean;
  useBankOutboundPayments: boolean;
  bankIntegrationNotes: string;
  useUsPayrollTaxReporting: boolean;
  useUsInformationReturns: boolean;
  usTaxIntegrationNotes: string;
}

export function Settings() {
  const comfort = useComfortMode();
  const [activeTab, setActiveTab] = useState('company');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoadError, setCompanyLoadError] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: '',
    legalName: '',
    country: 'US',
    currency: 'USD',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    useInventory: true,
    usePayroll: true,
    useMultiCurrency: false,
    useCostCenters: false,
    glCashAccountCode: '1100',
    glArAccountCode: '1200',
    glApAccountCode: '2100',
    glRevenueAccountCode: '4100',
    glExpenseAccountCode: '6100',
    glSalesTaxPayableAccountCode: '2150',
    glPurchasesExpenseAccountCode: '5100',
    useBankFeeds: false,
    useBankOutboundPayments: false,
    bankIntegrationNotes: '',
    useUsPayrollTaxReporting: false,
    useUsInformationReturns: false,
    usTaxIntegrationNotes: '',
  });

  const userRole = useAuthStore((s) => s.user?.role);
  const canManageLicenses =
    userRole === 'PRESIDENT' || userRole === 'CFO' || userRole === 'CONTROLLER';

  const visibleTabs = useMemo(() => {
    if (!canManageLicenses) return tabs;
    const next = [...tabs];
    const integrationsIdx = next.findIndex((t) => t.id === 'integrations');
    if (integrationsIdx >= 0) {
      next.splice(integrationsIdx + 1, 0, LICENSING_TAB);
    }
    return next;
  }, [canManageLicenses]);

  type RegRow = {
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
  };

  const [registrations, setRegistrations] = useState<RegRow[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [issueCustomerName, setIssueCustomerName] = useState('');
  const [issueContactEmail, setIssueContactEmail] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueExpires, setIssueExpires] = useState('');
  const [fxStatus, setFxStatus] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<
    { id: string; name: string; accountMask: string | null; transactionCount: number }[]
  >([]);
  const [bankCsv, setBankCsv] = useState('');
  const [bankImportAccount, setBankImportAccount] = useState('Operating');
  const [bankImportMsg, setBankImportMsg] = useState<string | null>(null);
  const [bankImportBusy, setBankImportBusy] = useState(false);

  useEffect(() => {
    if (activeTab !== 'integrations' || !companySettings.useBankFeeds) return;
    let cancelled = false;
    (async () => {
      const res = await api.getBankFeedAccounts();
      if (cancelled || !res.success || !res.data) return;
      setBankAccounts(res.data.accounts ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, companySettings.useBankFeeds]);

  useEffect(() => {
    if (activeTab !== 'licensing' || !canManageLicenses) return;
    let cancelled = false;
    (async () => {
      setRegLoading(true);
      const res = await api.listCustomerRegistrations();
      if (cancelled) return;
      setRegLoading(false);
      if (!res.success || !res.data) {
        setRegistrations([]);
        return;
      }
      const payload = res.data as { registrations?: RegRow[] };
      setRegistrations(payload.registrations ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, canManageLicenses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getCompany();
      if (cancelled) return;
      if (!res.success || !res.data) {
        setCompanyLoadError(res.error ?? 'Could not load company (API or database).');
        return;
      }
      const payload = res.data as { company?: Record<string, unknown> };
      const co = payload.company;
      if (!co) return;
      setCompanyId(typeof co.id === 'string' ? co.id : null);
      setCompanySettings((prev) => ({
        ...prev,
        name: (co.name as string) ?? prev.name,
        legalName: (co.legalName as string) ?? prev.legalName,
        country: (co.country as 'US' | 'MX') ?? prev.country,
        currency: (co.currency as 'USD' | 'MXN') ?? prev.currency,
        taxId: (co.taxId as string) ?? prev.taxId,
        email: (co.email as string) ?? prev.email,
        phone: (co.phone as string) ?? prev.phone,
        address: (co.address as string) ?? prev.address,
        useInventory: Boolean(co.useInventory),
        usePayroll: Boolean(co.usePayroll),
        useMultiCurrency: Boolean(co.useMultiCurrency),
        useCostCenters: Boolean(co.useCostCenters),
        glCashAccountCode: (co.glCashAccountCode as string) ?? prev.glCashAccountCode,
        glArAccountCode: (co.glArAccountCode as string) ?? prev.glArAccountCode,
        glApAccountCode: (co.glApAccountCode as string) ?? prev.glApAccountCode,
        glRevenueAccountCode: (co.glRevenueAccountCode as string) ?? prev.glRevenueAccountCode,
        glExpenseAccountCode: (co.glExpenseAccountCode as string) ?? prev.glExpenseAccountCode,
        glSalesTaxPayableAccountCode: (co.glSalesTaxPayableAccountCode as string) ?? prev.glSalesTaxPayableAccountCode,
        glPurchasesExpenseAccountCode: (co.glPurchasesExpenseAccountCode as string) ?? prev.glPurchasesExpenseAccountCode,
        useBankFeeds: Boolean(co.useBankFeeds),
        useBankOutboundPayments: Boolean(co.useBankOutboundPayments),
        bankIntegrationNotes: (co.bankIntegrationNotes as string) ?? '',
        useUsPayrollTaxReporting: Boolean(co.useUsPayrollTaxReporting),
        useUsInformationReturns: Boolean(co.useUsInformationReturns),
        usTaxIntegrationNotes: (co.usTaxIntegrationNotes as string) ?? '',
      }));
      setCompanyLoadError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const auditLog: AuditEntry[] = [
    {
      id: '1',
      timestamp: '2026-04-29T08:30:00',
      user: 'john.smith@company.com',
      action: 'LOGIN',
      module: 'auth',
      details: 'Successful login with MFA',
      ipAddress: '192.168.1.100',
      success: true,
    },
    {
      id: '2',
      timestamp: '2026-04-29T08:35:00',
      user: 'john.smith@company.com',
      action: 'CREATE',
      module: 'invoice',
      details: 'Created invoice INV-2026-0045',
      ipAddress: '192.168.1.100',
      success: true,
    },
    {
      id: '3',
      timestamp: '2026-04-29T09:15:00',
      user: 'sarah.johnson@company.com',
      action: 'UPDATE',
      module: 'journal',
      details: 'Posted journal entry JE-2026-0089',
      ipAddress: '192.168.1.105',
      success: true,
    },
    {
      id: '4',
      timestamp: '2026-04-29T09:45:00',
      user: 'maria.garcia@company.com',
      action: 'VIEW',
      module: 'report',
      details: 'Generated Accounts Receivable aging report',
      ipAddress: '192.168.1.110',
      success: true,
    },
    {
      id: '5',
      timestamp: '2026-04-28T17:00:00',
      user: 'david.wilson@company.com',
      action: 'FAILED_LOGIN',
      module: 'auth',
      details: 'Invalid MFA code',
      ipAddress: '192.168.1.115',
      success: false,
    },
  ];

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-700';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-700';
      case 'DELETE':
        return 'bg-red-100 text-red-700';
      case 'LOGIN':
      case 'LOGOUT':
        return 'bg-purple-100 text-purple-700';
      case 'FAILED_LOGIN':
        return 'bg-red-100 text-red-700';
      case 'VIEW':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSaveCompany = async () => {
    if (!companyId) {
      alert('Company record not loaded. Configure DATABASE_URL and ensure /api/company returns data.');
      return;
    }
    const res = await api.updateCompany(companyId, {
      name: companySettings.name,
      legalName: companySettings.legalName,
      country: companySettings.country,
      currency: companySettings.currency,
      taxId: companySettings.taxId,
      email: companySettings.email,
      phone: companySettings.phone,
      address: companySettings.address,
      useInventory: companySettings.useInventory,
      usePayroll: companySettings.usePayroll,
      useMultiCurrency: companySettings.useMultiCurrency,
      useCostCenters: companySettings.useCostCenters,
      glCashAccountCode: companySettings.glCashAccountCode,
      glArAccountCode: companySettings.glArAccountCode,
      glApAccountCode: companySettings.glApAccountCode,
      glRevenueAccountCode: companySettings.glRevenueAccountCode,
      glExpenseAccountCode: companySettings.glExpenseAccountCode,
      glSalesTaxPayableAccountCode: companySettings.glSalesTaxPayableAccountCode,
      glPurchasesExpenseAccountCode: companySettings.glPurchasesExpenseAccountCode,
      useBankFeeds: companySettings.useBankFeeds,
      useBankOutboundPayments: companySettings.useBankOutboundPayments,
      bankIntegrationNotes: companySettings.bankIntegrationNotes || null,
      useUsPayrollTaxReporting: companySettings.useUsPayrollTaxReporting,
      useUsInformationReturns: companySettings.useUsInformationReturns,
      usTaxIntegrationNotes: companySettings.usTaxIntegrationNotes.trim() || null,
    });
    if (!res.success) {
      alert(res.error ?? 'Save failed');
      return;
    }
    alert('Company settings saved.');
  };

  const handleSaveBankIntegrationPrefs = async () => {
    if (!companyId) {
      alert('Company record not loaded. Configure DATABASE_URL and ensure /api/company returns data.');
      return;
    }
    const res = await api.updateCompany(companyId, {
      useBankFeeds: companySettings.useBankFeeds,
      useBankOutboundPayments: companySettings.useBankOutboundPayments,
      bankIntegrationNotes: companySettings.bankIntegrationNotes.trim() || null,
    });
    if (!res.success) {
      alert(res.error ?? 'Save failed');
      return;
    }
    alert('Bank integration preferences saved.');
  };

  const handleSaveUsTaxIntegrationPrefs = async () => {
    if (!companyId) {
      alert('Company record not loaded. Configure DATABASE_URL and ensure /api/company returns data.');
      return;
    }
    const res = await api.updateCompany(companyId, {
      useUsPayrollTaxReporting: companySettings.useUsPayrollTaxReporting,
      useUsInformationReturns: companySettings.useUsInformationReturns,
      usTaxIntegrationNotes: companySettings.usTaxIntegrationNotes.trim() || null,
    });
    if (!res.success) {
      alert(res.error ?? 'Save failed');
      return;
    }
    alert('US federal tax integration preferences saved.');
  };

  const handleRefreshExchangeRates = async () => {
    setFxStatus(null);
    const res = await api.refreshExchangeRates();
    if (!res.success) {
      setFxStatus(res.error ?? 'Refresh failed');
      return;
    }
    const d = res.data as { quotesWritten?: number; date?: string; base?: string };
    setFxStatus(`Updated ${d.quotesWritten ?? 0} quote pair(s) — base ${d.base ?? ''}, rate date ${d.date ?? ''}.`);
  };

  const handleIssueRegistration = async () => {
    const res = await api.issueCustomerRegistration({
      customerName: issueCustomerName || undefined,
      contactEmail: issueContactEmail || undefined,
      internalNotes: issueNotes || undefined,
      expiresAt: issueExpires || undefined,
    });
    if (!res.success) {
      alert(res.error ?? 'Could not issue code');
      return;
    }
    const d = res.data as { registrationCode?: string };
    alert(`Registration code issued:\n${d.registrationCode ?? ''}\n\nCopy this to your signed customer.`);
    setIssueCustomerName('');
    setIssueContactEmail('');
    setIssueNotes('');
    setIssueExpires('');
    const list = await api.listCustomerRegistrations();
    if (list.success && list.data) {
      const payload = list.data as { registrations?: RegRow[] };
      setRegistrations(payload.registrations ?? []);
    }
  };

  const renderLicensingTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-2">Signed-customer registration codes</h3>
        <p className="text-sm text-gray-500 mb-6">
          Issue product-style keys (16 characters, grouped as XXXX-XXXX-XXXX-XXXX). Codes use an unambiguous alphabet
          (no O/0 or I/1). Each record tracks the customer you issued to and activation status. Redeeming a code on the
          login screen creates a new organization and seeds the chart of accounts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Customer / organization label</label>
            <input
              type="text"
              value={issueCustomerName}
              onChange={(e) => setIssueCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Acme Holdings LLC"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Contact email (optional)</label>
            <input
              type="email"
              value={issueContactEmail}
              onChange={(e) => setIssueContactEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="billing@customer.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-500 mb-1">Internal notes (optional)</label>
            <input
              type="text"
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Contract #, renewal date, …"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Expires (optional)</label>
            <input
              type="date"
              value={issueExpires}
              onChange={(e) => setIssueExpires(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleIssueRegistration}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          Issue new registration code
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 overflow-x-auto">
        <h3 className="font-semibold text-black mb-4">Issued registrations</h3>
        {regLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-gray-500">No codes issued yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Code</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Issued</th>
                <th className="pb-2 pr-4 font-medium">Activated org</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{r.registrationCode}</td>
                  <td className="py-2 pr-4">{r.customerName ?? '—'}</td>
                  <td className="py-2 pr-4">{r.contactEmail ?? '—'}</td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatTimestamp(r.issuedAt)}</td>
                  <td className="py-2 pr-4">{r.companyName ?? '—'}</td>
                  <td className="py-2">
                    {r.status === 'ISSUED' && (
                      <button
                        type="button"
                        className="text-red-600 hover:underline text-xs"
                        onClick={async () => {
                          if (!window.confirm('Revoke this unused code?')) return;
                          const res = await api.revokeCustomerRegistration(r.id);
                          if (!res.success) {
                            alert(res.error ?? 'Revoke failed');
                            return;
                          }
                          const list = await api.listCustomerRegistrations();
                          if (list.success && list.data) {
                            const payload = list.data as { registrations?: RegRow[] };
                            setRegistrations(payload.registrations ?? []);
                          }
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderCompanyTab = () => (
    <div className="space-y-6">
      {companyLoadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {companyLoadError} Edits still work locally; save requires a live company from the API.
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Company Name</label>
            <input
              type="text"
              value={companySettings.name}
              onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Legal Name</label>
            <input
              type="text"
              value={companySettings.legalName}
              onChange={(e) => setCompanySettings({ ...companySettings, legalName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Tax ID / RFC</label>
            <input
              type="text"
              value={companySettings.taxId}
              onChange={(e) => setCompanySettings({ ...companySettings, taxId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Country</label>
            <select
              value={companySettings.country}
              onChange={(e) => setCompanySettings({ ...companySettings, country: e.target.value as 'US' | 'MX' })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="US">United States</option>
              <option value="MX">Mexico</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Currency</label>
            <select
              value={companySettings.currency}
              onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value as 'USD' | 'MXN' })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="MXN">MXN - Mexican Peso</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={companySettings.email}
              onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={companySettings.phone}
              onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-500 mb-1">Address</label>
            <input
              type="text"
              value={companySettings.address}
              onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">Default GL accounts (chart codes)</h3>
        <p className="text-sm text-gray-500 mb-4">
          Posting AR/AP invoices and payments uses these codes — each must exist as an active posting account in your chart.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              ['glCashAccountCode', 'Cash / bank'],
              ['glArAccountCode', 'Accounts receivable'],
              ['glApAccountCode', 'Accounts payable'],
              ['glRevenueAccountCode', 'Revenue'],
              ['glExpenseAccountCode', 'Operating expense (fallback)'],
              ['glSalesTaxPayableAccountCode', 'Sales tax payable'],
              ['glPurchasesExpenseAccountCode', 'Purchases / COGS-style expense'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-gray-500 mb-1">{label}</label>
              <input
                type="text"
                value={companySettings[key]}
                onChange={(e) => setCompanySettings({ ...companySettings, [key]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">Module Configuration</h3>
        <div className="space-y-3">
          {[
            { key: 'useInventory', label: 'Inventory Management', desc: 'Track inventory items, costs, and valuations' },
            { key: 'usePayroll', label: 'Payroll', desc: 'Process payroll for USA and Mexico employees' },
            { key: 'useMultiCurrency', label: 'Multi-Currency', desc: 'Handle transactions in multiple currencies' },
            { key: 'useCostCenters', label: 'Cost Centers', desc: 'Track expenses by department or project' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-black">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <button
                onClick={() => setCompanySettings({ ...companySettings, [item.key]: !companySettings[item.key as keyof CompanySettings] })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  companySettings[item.key as keyof CompanySettings] ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  companySettings[item.key as keyof CompanySettings] ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveCompany}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">API protections</h3>
        <p className="text-sm text-gray-600 mb-3">
          The backend uses HTTP security headers (Helmet), request size limits, and per-IP rate limiting on <code className="text-xs bg-gray-100 px-1 rounded">/api/*</code>.
          Posting invoices or payments to the general ledger requires a valid JWT when the database is enabled, and your
          role must be allowed to post (President, CFO, Controller, or Accountant for any document; AR/AP clerks only for
          their side). Read-only users cannot post. Set{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">SKIP_GL_AUTH=true</code> only for trusted local development.
        </p>
        <p className="text-sm text-gray-600">
          AI accounting review returns suggestions only; it never posts journals or changes balances without your action in the product.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">MFA Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Shield className="text-green-600 mr-3" size={20} />
              <div>
                <p className="font-medium text-black">MFA Required for All Users</p>
                <p className="text-sm text-gray-500">All users must set up multi-factor authentication</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
              <Check size={12} className="mr-1" /> Enabled
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Key className="text-gray-600 mr-3" size={20} />
              <div>
                <p className="font-medium text-black">Session Timeout</p>
                <p className="text-sm text-gray-500">Users are logged out after 30 minutes of inactivity</p>
              </div>
            </div>
            <span className="text-sm text-gray-600">30 minutes</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">Password Policy</h3>
        <div className="space-y-3">
          {[
            'Minimum 8 characters',
            'At least one uppercase letter',
            'At least one number',
            'At least one special character',
            'Password expires every 90 days',
          ].map((rule, i) => (
            <div key={i} className="flex items-center text-sm">
              <Check size={16} className="text-green-600 mr-2" />
              <span className="text-gray-700">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="text-amber-600 mt-0.5 mr-3" size={20} />
          <div>
            <h3 className="font-medium text-amber-800">API Key Security</h3>
            <p className="text-sm text-amber-600 mt-1">
              Store API keys securely in environment variables. Never commit sensitive credentials to version control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      {/* Bank connectivity — opt-in flags only; no live bank API in this build */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Landmark className="text-black" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-black">Bank & cash connectivity</h3>
            <p className="text-sm text-gray-500 mt-1">
              Enable bank feeds here, then link institutions on the{' '}
              <Link to="/integrations/financial" className="font-medium text-blue-600 underline">
                Financial connections
              </Link>{' '}
              page (Plaid, MX, PayPal, CSV, or sandbox). Live OAuth requires server credentials — Human approval for production.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {(
            [
              {
                key: 'useBankFeeds' as const,
                label: 'Bank transaction import & reconciliation',
                desc: 'Planned: imported statement lines, matching, cleared balances vs ledger.',
              },
              {
                key: 'useBankOutboundPayments' as const,
                label: 'Bank-initiated payments',
                desc: 'Planned: outbound ACH/wires from the app where your provider allows.',
              },
            ] as const
          ).map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-4">
              <div>
                <p className="font-medium text-black">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCompanySettings({ ...companySettings, [item.key]: !companySettings[item.key] })
                }
                className={`w-12 h-6 rounded-full shrink-0 transition-colors ${
                  companySettings[item.key] ? 'bg-black' : 'bg-gray-300'
                }`}
                aria-pressed={companySettings[item.key]}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    companySettings[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-500 mb-1">Internal notes (optional)</label>
            <textarea
              value={companySettings.bankIntegrationNotes}
              onChange={(e) => setCompanySettings({ ...companySettings, bankIntegrationNotes: e.target.value })}
              placeholder="e.g. Target Plaid Q3 — IT to provision credentials"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveBankIntegrationPrefs}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Save bank integration preferences
            </button>
          </div>
        </div>
      </div>

      {companySettings.useBankFeeds && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-black mb-1">CSV bank import (stub)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Paste CSV with columns <code className="text-xs">date, amount, memo</code> (YYYY-MM-DD). Dry-run first; no live Plaid/MX.
          </p>
          {bankAccounts.length > 0 && (
            <ul className="mb-4 text-sm text-zinc-600 space-y-1">
              {bankAccounts.map((a) => (
                <li key={a.id}>
                  {a.name}
                  {a.accountMask ? ` ••••${a.accountMask}` : ''} — {a.transactionCount} transactions
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2 mb-3">
            <input
              type="text"
              value={bankImportAccount}
              onChange={(e) => setBankImportAccount(e.target.value)}
              placeholder="Account name"
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
            />
          </div>
          <textarea
            value={bankCsv}
            onChange={(e) => setBankCsv(e.target.value)}
            placeholder={'date,amount,memo\n2026-06-01,-50.00,Office supplies'}
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono mb-3"
          />
          {bankImportMsg && (
            <p className="text-sm mb-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">{bankImportMsg}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bankImportBusy || !bankCsv.trim()}
              onClick={async () => {
                setBankImportBusy(true);
                setBankImportMsg(null);
                const res = await api.importBankFeedCsv({
                  csv: bankCsv,
                  accountName: bankImportAccount,
                  dryRun: true,
                });
                setBankImportBusy(false);
                if (!res.success || !res.data) {
                  setBankImportMsg(res.error ?? 'Preview failed');
                  return;
                }
                setBankImportMsg(
                  `Preview: ${res.data.previewCount} new row(s), ${res.data.skipped} duplicate(s) skipped.`
                );
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Dry run
            </button>
            <button
              type="button"
              disabled={bankImportBusy || !bankCsv.trim()}
              onClick={async () => {
                setBankImportBusy(true);
                setBankImportMsg(null);
                const res = await api.importBankFeedCsv({
                  csv: bankCsv,
                  accountName: bankImportAccount,
                  dryRun: false,
                });
                setBankImportBusy(false);
                if (!res.success || !res.data) {
                  setBankImportMsg(res.error ?? 'Import failed');
                  return;
                }
                setBankImportMsg(`Imported ${res.data.imported} transaction(s), ${res.data.skipped} skipped.`);
                setBankCsv('');
                const acc = await api.getBankFeedAccounts();
                if (acc.success && acc.data) setBankAccounts(acc.data.accounts ?? []);
              }}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {/* US federal tax — opt-in only; no IRS / transmitter APIs in this build */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Scale className="text-black" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-black">US federal tax (IRS-oriented workflows)</h3>
            <p className="text-sm text-gray-500 mt-1">
              Opt in when your organization plans to streamline payroll tax reporting (e.g. withholdings, Forms W-2 / 941)
              or information returns (e.g. 1099 family) through future integrations. This application does not submit
              anything to the IRS, SSA, or any transmitter today — preferences are stored on
              the company record for roadmap features and partner onboarding (typically via an authorized e-file /
              payroll provider).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {(
            [
              {
                key: 'useUsPayrollTaxReporting' as const,
                label: 'Payroll & withholding tax reporting',
                desc: 'Planned: exports or filing paths aligned with payroll/withholding (partner-certified).',
              },
              {
                key: 'useUsInformationReturns' as const,
                label: 'Information returns (e.g. 1099)',
                desc: 'Planned: 1099-NEC/MISC-style data and transmitter-ready exports where applicable.',
              },
            ] as const
          ).map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-4">
              <div>
                <p className="font-medium text-black">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCompanySettings({ ...companySettings, [item.key]: !companySettings[item.key] })
                }
                className={`w-12 h-6 rounded-full shrink-0 transition-colors ${
                  companySettings[item.key] ? 'bg-black' : 'bg-gray-300'
                }`}
                aria-pressed={companySettings[item.key]}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    companySettings[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-500 mb-1">Internal notes (optional)</label>
            <textarea
              value={companySettings.usTaxIntegrationNotes}
              onChange={(e) => setCompanySettings({ ...companySettings, usTaxIntegrationNotes: e.target.value })}
              placeholder="e.g. Intended payroll partner — obtain EFIN via CPA firm Q4"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveUsTaxIntegrationPrefs}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Save US tax integration preferences
            </button>
          </div>
        </div>
      </div>

      {/* Exchange rates — Frankfurter (ECB reference), free API */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <RefreshCw className="text-black" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-black">Daily exchange rates</h3>
            <p className="text-sm text-gray-500 mt-1">
              Spot rates come from{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">api.frankfurter.app</code> (ECB reference data, no API
              key). Your company functional currency is the FX base; optional quote list via{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">FX_DEFAULT_QUOTES</code> in server environment. Enable
              multi-currency under Company → Module configuration for full ledger flows.
            </p>
            {!companySettings.useMultiCurrency && (
              <p className="text-xs text-amber-800 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Multi-currency module is currently off — you can still store rates for reporting or testing.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshExchangeRates}
            className="inline-flex items-center px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh daily rates
          </button>
          {fxStatus && <p className="text-sm text-gray-600">{fxStatus}</p>}
        </div>
      </div>

      {/* Database Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="text-black mr-3" size={20} />
            <h3 className="font-semibold text-black">Database</h3>
          </div>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <Check size={12} className="mr-1" /> Live ledger
          </span>
        </div>

        <div className="space-y-3">
          {/* Supabase - Recommended */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-white border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">SB</span>
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-black">Supabase</p>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      <Star size={10} className="mr-1" /> Recommended
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Free 500MB PostgreSQL database with built-in auth</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Free Tier</p>
                <p className="text-xs font-medium text-green-600">$0/mo</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                <span>500MB storage</span>
                <span>Unlimited API calls</span>
                <span>SSO ready</span>
              </div>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-black hover:underline"
              >
                Sign up free <ExternalLink size={12} className="ml-1" />
              </a>
            </div>
          </div>

          {/* Neon */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">NE</span>
                </div>
                <div>
                  <p className="font-medium text-black">Neon</p>
                  <p className="text-sm text-gray-500 mt-1">Serverless Postgres with branching for CI/CD</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Free Tier</p>
                <p className="text-xs font-medium text-gray-600">$0/mo</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                <span>3GB storage</span>
                <span>Branch per PR</span>
              </div>
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-black hover:underline"
              >
                Sign up free <ExternalLink size={12} className="ml-1" />
              </a>
            </div>
          </div>

          {/* Local Development */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center mr-3">
                  <Server size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-medium text-black">Local Development</p>
                  <p className="text-sm text-gray-500 mt-1">Docker container for local development only</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">For dev</p>
                <p className="text-xs font-medium text-gray-600">$0</p>
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <code className="bg-gray-200 px-2 py-1 rounded">docker run -d -p 5432:5432 postgres:16</code>
            </div>
          </div>
        </div>
      </div>

      {/* AI CPA Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Sparkles className="text-black mr-3" size={20} />
            <h3 className="font-semibold text-black">AI CPA Assistant</h3>
          </div>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <Check size={12} className="mr-1" /> Live ledger
          </span>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-black">OpenAI GPT-4</p>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      <Zap size={10} className="mr-1" /> $5 Free Credit
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Powerful AI for accounting advice and automation</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Free Trial</p>
                <p className="text-xs font-medium text-blue-600">$5 free</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                <span>GPT-4 Turbo</span>
                <span>128K context</span>
                <span>Function calling</span>
              </div>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-black hover:underline"
              >
                Get free $5 <ExternalLink size={12} className="ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mexico CFDI Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FileCheck className="text-black mr-3" size={20} />
            <h3 className="font-semibold text-black">Mexico CFDI</h3>
          </div>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            Optional
          </span>
        </div>

        <div className="space-y-3">
          {/* Solucion Factible - Recommended */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                  <FileCheck size={16} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-black">Solucion Factible</p>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      <Star size={10} className="mr-1" /> Popular
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Mexico's most widely used PAC for CFDI invoicing</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">Production</span>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              API: pac.solucionfactible.com
            </div>
          </div>

          {/* SW Developer */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">SW</span>
                </div>
                <div>
                  <p className="font-medium text-black">SW Developer</p>
                  <p className="text-sm text-gray-500 mt-1">Reliable PAC with excellent documentation</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">Production</span>
            </div>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              API: api.sw.com.mx
            </div>
          </div>

          {/* FISA */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">FI</span>
                </div>
                <div>
                  <p className="font-medium text-black">FISA</p>
                  <p className="text-sm text-gray-500 mt-1">Enterprise-grade PAC for large volumes</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">Enterprise</span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="text-amber-600 mt-0.5 mr-3" size={18} />
              <div>
                <h4 className="font-medium text-amber-800">CFDI Setup Required for Mexico Operations</h4>
                <p className="text-sm text-amber-600 mt-1">
                  To emit CFDI invoices in Mexico, you'll need: SAT certificates (CSD), PAC account, and RFC validation.
                  Contact your administrator to configure these settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Guide */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="font-semibold text-white mb-4">Quick Setup Guide</h3>
        <div className="space-y-3 font-mono text-sm">
          <div className="bg-black/50 rounded p-3">
            <p className="text-gray-400 mb-1">1. Copy environment template:</p>
            <code className="text-green-400">cp .env.example .env</code>
          </div>
          <div className="bg-black/50 rounded p-3">
            <p className="text-gray-400 mb-1">2. Add Supabase connection string:</p>
            <code className="text-green-400">DATABASE_URL=postgresql://postgres:[PASS]@db.xxx.supabase.co:5432/postgres</code>
          </div>
          <div className="bg-black/50 rounded p-3">
            <p className="text-gray-400 mb-1">3. Add OpenAI key:</p>
            <code className="text-green-400">OPENAI_API_KEY=sk-...</code>
          </div>
          <div className="bg-black/50 rounded p-3">
            <p className="text-gray-400 mb-1">4. Run database migrations:</p>
            <code className="text-green-400">npx prisma migrate deploy</code>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDisplayTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-1">Visual ergonomics</h3>
        <p className="text-sm text-gray-500 mb-6">
          Tuned for teams who spend full days in the ledger. Preferences are saved in this browser. Press ⌘K (Ctrl+K) for quick navigation anywhere.
        </p>
        <div className="space-y-4">
          {[
            {
              key: 'comfortMode' as const,
              label: 'Comfort mode',
              desc: 'Warmer paper tones and softer accent blue to reduce eye fatigue.',
              value: comfort.comfortMode,
              set: comfort.setComfortMode,
            },
            {
              key: 'largeText' as const,
              label: 'Larger text',
              desc: 'Increases base font size across workspaces.',
              value: comfort.largeText,
              set: comfort.setLargeText,
            },
            {
              key: 'softGrid' as const,
              label: 'Subtle workspace grid',
              desc: 'Ruled-paper background on module pages — turn off for a cleaner field.',
              value: comfort.softGrid,
              set: comfort.setSoftGrid,
            },
            {
              key: 'reducedMotion' as const,
              label: 'Reduce motion',
              desc: 'Minimizes animations and transitions.',
              value: comfort.reducedMotion,
              set: comfort.setReducedMotion,
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="font-medium text-black">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => item.set(!item.value)}
                className={`h-7 w-12 rounded-full transition-colors ${item.value ? 'bg-black' : 'bg-gray-300'}`}
                aria-pressed={item.value}
              >
                <div
                  className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    item.value ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={comfort.resetComfort}
          className="mt-4 text-sm font-medium text-gray-600 underline hover:text-black"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-black mb-4">Email Notifications</h3>
        <div className="space-y-3">
          {[
            { label: 'Invoice overdue alerts', desc: 'Notify when invoices become overdue', enabled: true },
            { label: 'Payment reminders', desc: 'Send payment reminders to customers', enabled: true },
            { label: 'Low inventory alerts', desc: 'Alert when items reach reorder point', enabled: true },
            { label: 'Weekly summary', desc: 'Send weekly financial summary', enabled: false },
            { label: 'MFA setup reminders', desc: 'Remind users without MFA to set it up', enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-black">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${item.enabled ? 'bg-black' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  item.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-black">Audit Log</h3>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <Download size={16} className="mr-2" />
          Export Log
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auditLog.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{formatTimestamp(entry.timestamp)}</td>
                <td className="px-4 py-3 text-xs text-gray-900">{entry.user}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(entry.action)}`}>
                    {entry.action.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{entry.details}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{entry.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Settings</h1>
          <p className="text-gray-500 mt-1">Configure system settings and preferences</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0 mb-6 lg:mb-0 lg:mr-6">
          <div className="bg-white border border-gray-200 rounded-lg p-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'company' && renderCompanyTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'integrations' && renderIntegrationsTab()}
          {activeTab === 'display' && renderDisplayTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'audit' && renderAuditTab()}
          {activeTab === 'licensing' && canManageLicenses && renderLicensingTab()}
        </div>
      </div>
    </div>
  );
}