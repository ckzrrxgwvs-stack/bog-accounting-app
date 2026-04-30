// Settings Page - Company, Security, and System Configuration

import React, { useState } from 'react';
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
  Star
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { id: 'company', label: 'Company', icon: <Building size={18} /> },
  { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  { id: 'integrations', label: 'Integrations', icon: <Globe size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { id: 'audit', label: 'Audit Log', icon: <FileText size={18} /> },
];

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
}

export function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
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
  });

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

  const handleSaveCompany = () => {
    alert('Company settings saved! (Demo mode)');
  };

  const renderCompanyTab = () => (
    <div className="space-y-6">
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
      {/* Database Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="text-black mr-3" size={20} />
            <h3 className="font-semibold text-black">Database</h3>
          </div>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <Check size={12} className="mr-1" /> Demo Mode
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
            <Check size={12} className="mr-1" /> Demo Mode
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
            {tabs.map((tab) => (
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
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'audit' && renderAuditTab()}
        </div>
      </div>
    </div>
  );
}