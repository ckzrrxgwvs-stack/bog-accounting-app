import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { CubeLogoMark } from '@/components/Logo';
import { Mail, Lock, User, Building2, KeyRound, Copy, Check } from 'lucide-react';
import type { UserRoleType } from '@/types';

export function OwnerSetup() {
  const navigate = useNavigate();
  const loginFromOwnerSetup = useAuthStore((s) => s.loginFromOwnerSetup);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    password: '',
    generatePassword: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await api.getOwnerSetupStatus();
      setLoading(false);
      if (!res.success) {
        setError(res.error ?? 'Could not reach API');
        return;
      }
      const data = res.data as { needsOwnerSetup?: boolean };
      if (!data?.needsOwnerSetup) {
        setNeedsSetup(false);
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedPassword(null);
    setBusy(true);
    const res = await api.completeOwnerSetup({
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName || undefined,
      password: form.generatePassword ? undefined : form.password,
      generatePassword: form.generatePassword,
      deactivateBootstrapUsers: true,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error ?? 'Setup failed');
      return;
    }
    const d = res.data as {
      token: string;
      generatedPassword?: string;
      user: Record<string, unknown>;
    };
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (!d.generatedPassword) {
      navigate('/', { replace: true });
    }
  };

  const copyPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bog-paper text-sm text-zinc-500">
        Checking setup status…
      </div>
    );
  }

  if (!needsSetup) {
    return null;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center">
            <CubeLogoMark size={56} />
            <h1 className="mt-4 text-2xl font-bold text-black">Create your President account</h1>
            <p className="mt-1 text-center text-sm text-gray-500">
              One-time setup — your email and password for BOG. Bootstrap dev users will be deactivated.
            </p>
          </div>

          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 flex items-center gap-1 font-medium text-gray-700">
                <Building2 size={16} /> Company name
              </span>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Your company LLC"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 flex items-center gap-1 font-medium text-gray-700">
                  <User size={16} /> First name
                </span>
                <input
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 font-medium text-gray-700">Last name</span>
                <input
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 flex items-center gap-1 font-medium text-gray-700">
                <Mail size={16} /> Your email (President login)
              </span>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@yourcompany.com"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.generatePassword}
                onChange={(e) => setForm((f) => ({ ...f, generatePassword: e.target.checked }))}
              />
              <KeyRound size={16} className="text-gray-500" />
              Generate a secure password for me
            </label>

            {!form.generatePassword && (
              <label className="block text-sm">
                <span className="mb-1 flex items-center gap-1 font-medium text-gray-700">
                  <Lock size={16} /> Password (8+ characters)
                </span>
                <input
                  type="password"
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </label>
            )}

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-black py-3.5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Creating account…' : 'Create President account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-black underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
