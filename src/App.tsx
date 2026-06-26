// Main App with routing

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Ledger } from './pages/Ledger';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { OpeningBalances } from './pages/OpeningBalances';
import { PeriodClose } from './pages/PeriodClose';
import { Customers } from './pages/Customers';
import { Vendors } from './pages/Vendors';
import { AccountsPayable } from './pages/AccountsPayable';
import { AccountsReceivable } from './pages/AccountsReceivable';
import { Payments } from './pages/Payments';
import { Reports } from './pages/Reports';
import { AICPA } from './pages/AICPA';
import { Inventory } from './pages/Inventory';
import { Payroll } from './pages/Payroll';
import { CFDI } from './pages/CFDI';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { ManualOperations } from './pages/ManualOperations';
import { ProductIntelligence } from './pages/ProductIntelligence';
import { AgentOperations } from './pages/AgentOperations';
import { ErpHub } from './pages/ErpHub';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { SalesOrders } from './pages/SalesOrders';
import { Manufacturing } from './pages/Manufacturing';
import { ErpLogistics } from './pages/ErpLogistics';
import { ErpAssistant } from './pages/ErpAssistant';
import { DataStudio } from './pages/DataStudio';
import { FinancialConnections } from './pages/FinancialConnections';
import { MicrosoftOfficeHub } from './pages/MicrosoftOfficeHub';
import { Login } from './pages/Login';
import { OwnerSetup } from './pages/OwnerSetup';
import { useAuthStore } from './stores/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mfaVerified } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Require MFA verification
  if (!mfaVerified) {
    // Show login page which handles MFA
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/setup-owner" element={<OwnerSetup />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ledger/coa" element={<ChartOfAccounts />} />
          <Route path="ledger/opening-balances" element={<OpeningBalances />} />
          <Route path="ledger/period-close" element={<PeriodClose />} />
          <Route path="master/customers" element={<Customers />} />
          <Route path="master/vendors" element={<Vendors />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="ledger/new" element={<Ledger />} />
          <Route path="ap" element={<AccountsPayable />} />
          <Route path="ap/new" element={<AccountsPayable />} />
          <Route path="ar" element={<AccountsReceivable />} />
          <Route path="ar/new" element={<AccountsReceivable />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="data-studio" element={<DataStudio />} />
          <Route path="integrations/financial" element={<FinancialConnections />} />
          <Route path="office" element={<MicrosoftOfficeHub />} />
          <Route path="ai-cpa" element={<AICPA />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="cfdi" element={<CFDI />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/manual-operations" element={<ManualOperations />} />
          <Route path="product-intelligence" element={<ProductIntelligence />} />
          <Route path="agent-operations" element={<AgentOperations />} />
          <Route path="erp" element={<ErpHub />} />
          <Route path="erp/assistant" element={<ErpAssistant />} />
          <Route path="erp/purchase-orders" element={<PurchaseOrders />} />
          <Route path="erp/sales-orders" element={<SalesOrders />} />
          <Route path="erp/manufacturing" element={<Manufacturing />} />
          <Route path="erp/logistics" element={<ErpLogistics />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;