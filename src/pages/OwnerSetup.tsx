import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { CubeLogoMark } from '@/components/Logo';
import { Copy, Check } from 'lucide-react';
import { FirstTimeSignInForm, type FirstTimeSignInValues } from '@/components/auth/FirstTimeSignInForm';
import type { UserRoleType } from '@/types';

export function OwnerSetup() {
  const navigate = useNavigate();
  const loginFromOwnerSetup = useAuthStore((s) => s.loginFromOwnerSetup);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
        navigate('/login', { replace: true });
        return;
      }
      setNeedsSetup(true);
    })();
  }, [navigate]);

  const finishLogin = (d: { token: string; generatedPassword?: string; user: Record<string, unknown> }) => {
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

  const submit = async (form: FirstTimeSignInValues) => {
    setError(null);
    setGeneratedPassword(null);
    setBusy(true);
    const res = await api.completeOwnerSetup({
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName,
      password: form.generatePassword ? undefined : form.password,
      generatePassword: form.generatePassword,
      deactivateBootstrapUsers: true,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error ?? 'Setup failed');
      return;
    }
    finishLogin(res.data as { token: string; generatedPassword?: string; user: Record<string, unknown> });
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
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-4 flex justify-center">
          <CubeLogoMark size={56} />
        </div>
        <FirstTimeSignInForm
          title="Welcome — set up your portfolio"
          subtitle="Your company name is your portfolio entity. You’ll add project books and invite members after sign-in."
          submitLabel="Create President account & sign in"
          busy={busy}
          error={error}
          onSubmit={(v) => void submit(v)}
          footer={
            <p className="mt-6 text-center text-xs text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-black underline">
                Sign in
              </Link>
            </p>
          }
        />
      </div>
    </div>
  );
}
