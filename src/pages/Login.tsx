// Login page con personalidad profesional

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight, KeyRound, Copy, Check } from 'lucide-react';
import { CubeLogoMark } from '@/components/Logo';
import { FirstTimeSignInForm, type FirstTimeSignInValues } from '@/components/auth/FirstTimeSignInForm';
import type { UserRoleType } from '@/types';

const isProductionApi = Boolean(import.meta.env.VITE_API_URL);

export function Login() {
  const navigate = useNavigate();
  const { login, loginFromOwnerSetup, verifyMFA, isLoading, mfaRequired } = useAuthStore();
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
  const [needsOwnerSetup, setNeedsOwnerSetup] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await api.getOwnerSetupStatus();
      if (!res.success || !res.data) return;

      const data = res.data as {
        needsOwnerSetup?: boolean;
        signInAvailable?: boolean;
        presidentLoginHint?: string | null;
        bootstrapUsersAvailable?: boolean;
      };

      if (data.needsOwnerSetup != null) {
        setNeedsOwnerSetup(data.needsOwnerSetup);
      }

      // Local dev: skip first-run wizard when a President can already sign in
      if (!isProductionApi && (data.signInAvailable || data.bootstrapUsersAvailable)) {
        setShowSignIn(true);
      }

      if (data.presidentLoginHint) {
        setEmail((prev) => prev || data.presidentLoginHint!);
      }
    })();
  }, []);

  const finishOwnerSetup = (d: { token: string; generatedPassword?: string; user: Record<string, unknown> }) => {
    if (d.generatedPassword) {
      setGeneratedPassword(d.generatedPassword);
    }
    const u = d.user;
    loginFromOwnerSetup(d.token, {
      id: String(u.id),
      email: String(u.email),
      firstName: String(u.firstName),
      lastName: String(u.lastName),
      role: u.role as UserRoleType,
      mfaEnabled: false,
      isActive: true,
      companyId: String(u.companyId),
      companyName: String(u.companyName ?? ''),
      canViewPortfolio: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (!d.generatedPassword) {
      navigate('/', { replace: true });
    }
  };

  const handleFirstTimeSetup = async (form: FirstTimeSignInValues) => {
    setSetupError(null);
    setGeneratedPassword(null);
    setSetupBusy(true);
    const res = await api.completeOwnerSetup({
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName,
      password: form.generatePassword ? undefined : form.password,
      generatePassword: form.generatePassword,
      deactivateBootstrapUsers: true,
    });
    setSetupBusy(false);
    if (!res.success || !res.data) {
      setSetupError(res.error ?? 'Setup failed');
      return;
    }
    finishOwnerSetup(res.data as { token: string; generatedPassword?: string; user: Record<string, unknown> });
  };

  const copyPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-100">
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
                {isLoading ? 'Verifying...' : 'Verify Code'}
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

  if (generatedPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-xl font-bold text-black">Save your password</h1>
          <p className="mb-4 text-sm text-gray-600">
            BOG generated a secure password. Copy it now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 font-mono text-sm">
            <span className="flex-1 break-all">{generatedPassword}</span>
            <button type="button" onClick={() => void copyPassword()} className="shrink-0 rounded-lg p-2 hover:bg-gray-200">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="mt-6 w-full rounded-2xl bg-black py-3 font-semibold text-white"
          >
            Continue to dashboard
          </button>
        </div>
      </div>
    );
  }

  const showFirstTimePrimary = needsOwnerSetup && !showSignIn;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className={`w-full ${showFirstTimePrimary ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-100">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 rounded-2xl p-2 shadow-lg shadow-black/10 ring-1 ring-zinc-200">
              <CubeLogoMark size={56} />
            </div>
            <p className="font-figures text-[11px] tracking-wide text-[hsl(var(--bog-accent))]">π · 3.1416… precision</p>
          </div>

          {showFirstTimePrimary ? (
            <FirstTimeSignInForm
              title="Welcome — set up your business"
              subtitle="Enter your business name, email, and password — or let BOG generate one for you."
              submitLabel="Create account & sign in"
              busy={setupBusy}
              error={setupError}
              onSubmit={(v) => void handleFirstTimeSetup(v)}
              footer={
                <p className="mt-6 text-center text-xs text-gray-500">
                  {!isProductionApi && (
                    <>
                      Local dev?{' '}
                      <button
                        type="button"
                        onClick={() => setShowSignIn(true)}
                        className="font-medium text-black underline"
                      >
                        Sign in with bootstrap user
                      </button>
                    </>
                  )}
                  {isProductionApi && (
                    <>
                      Already have credentials?{' '}
                      <button
                        type="button"
                        onClick={() => setShowSignIn(true)}
                        className="font-medium text-black underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              }
            />
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="mb-1 text-2xl font-bold text-black">
                  Welcome back · <span className="whitespace-nowrap">BOG-Pi</span>
                </h1>
                <p className="text-gray-500">Books On The Go — sign in to your ledger</p>
              </div>

              {needsOwnerSetup && (
                <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-sky-900">First time here?</p>
                  <p className="mt-1 text-xs text-sky-800">
                    <button
                      type="button"
                      onClick={() => setShowSignIn(false)}
                      className="font-medium underline"
                    >
                      Set up your business name and account
                    </button>
                  </p>
                </div>
              )}

              {isProductionApi && !needsOwnerSetup && (
                <div className="mb-6 p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl border border-sky-100">
                  <p className="font-semibold text-sky-900 text-sm">Sign in</p>
                  <p className="text-xs text-sky-700 mt-1">
                    Use credentials provisioned for your organization. Contact your administrator if you need access.
                  </p>
                </div>
              )}

              {!isProductionApi && !needsOwnerSetup && (
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                  <p className="font-semibold text-emerald-900 text-sm">Local program</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Sign in with your President credentials. Run{' '}
                    <code className="font-mono">pnpm run dev:program</code> with Docker Postgres for live books.
                  </p>
                </div>
              )}

              {!isProductionApi && needsOwnerSetup && (
                <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">President sign-in (local)</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Use your existing credentials below. Bootstrap dev login:{' '}
                    <code className="font-mono">admin@company.com</code> /{' '}
                    <code className="font-mono">demo123</code> if you ran{' '}
                    <code className="font-mono">pnpm run db:bootstrap:dev</code>.
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
                  {isLoading ? 'Signing in...' : (
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
                    Redeem the code from your vendor to create your organization and chart of accounts.
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

              <div className="mt-6 flex items-center justify-center">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Shield size={14} className="text-green-500" />
                  <span>MFA required for all accounts</span>
                </div>
              </div>
            </>
          )}
        </div>

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
