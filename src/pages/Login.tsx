// Login page con personalidad profesional

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { Mail, Lock, Eye, EyeOff, Shield, Sparkles, ArrowRight, Check, KeyRound } from 'lucide-react';
import { CubeLogoMark } from '@/components/Logo';

const isProductionApi = Boolean(import.meta.env.VITE_API_URL);

export function Login() {
  const navigate = useNavigate();
  const { login, verifyMFA, isLoading, mfaRequired } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    }
  };

  const handleActivateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegMessage(null);
    if (!regCode.trim()) {
      setRegError('Enter your registration code.');
      return;
    }
    setRegBusy(true);
    const res = await api.activateRegistration({
      code: regCode.trim(),
      organizationName: regOrgName.trim() || undefined,
    });
    setRegBusy(false);
    if (!res.success) {
      setRegError(res.error ?? 'Activation failed');
      return;
    }
    const d = res.data as { companyName?: string; message?: string; alreadyActivated?: boolean };
    setRegMessage(
      d.message ??
        (d.companyName
          ? `Organization "${d.companyName}" is ready. Sign in with a user account created for that company.`
          : 'Code redeemed.')
    );
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await verifyMFA(mfaCode);
      navigate('/');
    } catch (err) {
      setError('Invalid MFA code');
    }
  };

  const demoAccounts = [
    { email: 'admin@company.com', role: 'President', badge: 'Full Access' },
    { email: 'cfo@company.com', role: 'CFO', badge: 'Finance' },
    { email: 'accountant@company.com', role: 'Accountant', badge: 'Standard' },
  ];

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-100">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl p-2 shadow-lg shadow-black/10 ring-1 ring-zinc-200/80">
                <CubeLogoMark size={56} />
              </div>
            </div>

            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-black">Two-Factor Authentication</h1>
              <p className="text-gray-500">Enter the code from your authenticator app</p>
            </div>

            <form onSubmit={handleMFAVerify} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="• • • • • •"
                    className="w-full border border-gray-200 rounded-2xl px-6 py-5 text-center text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/20"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : 'Verify Code'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-400 hover:text-black transition-colors"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-100">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 rounded-2xl p-2 shadow-lg shadow-black/10 ring-1 ring-zinc-200">
              <CubeLogoMark size={56} />
            </div>
            <p className="font-figures text-[11px] tracking-wide text-[hsl(var(--bog-accent))]">π · 3.1416… precision</p>
          </div>

          <div className="mb-8 text-center">
            <h1 className="mb-1 text-2xl font-bold text-black">
              Welcome back · <span className="whitespace-nowrap">BOG-Pi</span>
            </h1>
            <p className="text-gray-500">Books On The Go — sign in to your ledger</p>
          </div>

          {/* Demo Mode Banner — local dev only */}
          {!isProductionApi && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-xl mr-3">
                <Sparkles size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Demo Mode Active</p>
                <p className="text-xs text-amber-600">Use any demo account below</p>
              </div>
            </div>
          </div>
          )}
          {isProductionApi && (
          <div className="mb-6 p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl border border-sky-100">
            <p className="font-semibold text-sky-900 text-sm">Production sign-in</p>
            <p className="text-xs text-sky-700 mt-1">
              Use <strong>admin@company.com</strong> / <strong>demo123</strong> after the API database is configured on Render.
            </p>
          </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-2xl pl-11 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 py-3 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/20 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center">
                  Sign In <ArrowRight size={18} className="ml-2" />
                </span>
              )}
            </button>
          </form>

          <details className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/90">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-800 flex items-center gap-2 list-none">
              <KeyRound size={16} className="text-gray-500" />
              Have a registration code? (signed customer)
            </summary>
            <div className="px-4 pb-4 pt-0 border-t border-gray-100">
              <p className="text-xs text-gray-500 mt-3 mb-3">
                Redeem the code from your vendor to create your organization and chart of accounts. Does not create login
                users — your administrator still invites users or uses existing credentials for this organization.
              </p>
              <form onSubmit={handleActivateRegistration} className="space-y-3">
                <input
                  type="text"
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  type="text"
                  value={regOrgName}
                  onChange={(e) => setRegOrgName(e.target.value)}
                  placeholder="Organization name (optional override)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                {regError && <p className="text-red-600 text-xs bg-red-50 py-2 px-3 rounded-lg">{regError}</p>}
                {regMessage && <p className="text-emerald-800 text-xs bg-emerald-50 py-2 px-3 rounded-lg">{regMessage}</p>}
                <button
                  type="submit"
                  disabled={regBusy}
                  className="w-full border border-black text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  {regBusy ? 'Activating…' : 'Activate registration'}
                </button>
              </form>
            </div>
          </details>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Shield size={14} className="text-green-500" />
              <span>MFA required for all accounts</span>
            </div>
          </div>

          {/* Demo Accounts Quick Access */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Quick demo access</p>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('demo123');
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {account.email.split('@')[0][0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-black">{account.role}</p>
                      <p className="text-xs text-gray-400">{account.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">{account.badge}</span>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-black transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-gray-100 pt-6 text-center">
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-black">BOG-Pi</span>{' '}
            <span className="font-figures text-[hsl(var(--bog-accent))]">π</span>{' '}
            <span className="font-semibold text-zinc-600">v1.0</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">Books On The Go · USA & Mexico</p>
        </div>
      </div>
    </div>
  );
}