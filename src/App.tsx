// Main App with routing

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Ledger } from './pages/Ledger';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { AccountsPayable } from './pages/AccountsPayable';
import { AccountsReceivable } from './pages/AccountsReceivable';
import { Reports } from './pages/Reports';
import { AICPA } from './pages/AICPA';
import { Inventory } from './pages/Inventory';
import { Payroll } from './pages/Payroll';
import { CFDI } from './pages/CFDI';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
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
          <Route path="ledger" element={<Ledger />} />
          <Route path="ledger/new" element={<Ledger />} />
          <Route path="ap" element={<AccountsPayable />} />
          <Route path="ap/new" element={<AccountsPayable />} />
          <Route path="ar" element={<AccountsReceivable />} />
          <Route path="ar/new" element={<AccountsReceivable />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ai-cpa" element={<AICPA />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="cfdi" element={<CFDI />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;