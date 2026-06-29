import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Check, Heart, MessageSquare } from 'lucide-react';
import { CubeLogoMark } from '@/components/Logo';
import { FirstTimeSignInForm, type FirstTimeSignInValues } from '@/components/auth/FirstTimeSignInForm';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { UserRoleType } from '@/types';

type InviteInfo = {
  label: string | null;
  trialDays: number;
  isActive: boolean;
  enrollmentCount: number;
};

export function TryInvite() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loginFromOwnerSetup, isAuthenticated } = useAuthStore();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const res = await api.getTesterInvite(token);
      if (cancelled) return;
      setLoading(false);
      if (!res.success || !res.data) {
        setLoadError(res.error ?? 'This preview link is not valid.');
        return;
      }
      setInvite(res.data as InviteInfo);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const finishClaim = (d: {
    token: string;
    generatedPassword?: string;
    accessExpiresAt: string;
    user: Record<string, unknown>;
  }) => {
    if (d.generatedPassword) {
      setGeneratedPassword(d.generatedPassword);
      setAccessExpiresAt(d.accessExpiresAt);
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
      isTester: true,
      accessExpiresAt: String(u.accessExpiresAt ?? d.accessExpiresAt),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (!d.generatedPassword) {
      navigate('/', { replace: true });
    }
  };

  const handleSubmit = async (form: FirstTimeSignInValues) => {
    setError(null);
    setGeneratedPassword(null);
    setBusy(true);
    const res = await api.claimTesterInvite(token, {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName,
      password: form.generatePassword ? undefined : form.password,
      generatePassword: form.generatePassword,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error ?? 'Could not create your preview account.');
      return;
    }
    finishClaim(res.data as Parameters<typeof finishClaim>[0]);
  };

  const copyPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bog-paper px-4 text-center">
        <CubeLogoMark className="h-12 w-12 animate-pulse" />
        <p className="text-sm font-medium text-bog-ink">Loading your preview invite…</p>
        <p className="max-w-xs text-xs text-gray-500">
          The first visit can take up to a minute while the preview server wakes up. Thanks for your patience.
        </p>
      </div>
    );
  }

  if (loadError || !invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bog-paper px-4">
        <CubeLogoMark className="mb-6 h-14 w-14" />
        <h1 className="text-xl font-semibold text-bog-ink">Preview link not available</h1>
        <p className="mt-2 max-w-md text-center text-sm text-gray-500">{loadError}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-6 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Try again
        </button>
        <Link to="/login" className="mt-3 text-sm font-medium text-bog-ink underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (generatedPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bog-paper px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-black">Your preview account is ready</h1>
          <p className="mt-2 text-sm text-gray-500">
            BOG is still being built — thank you for helping improve it. Save this password now; it will not be shown
            again. Your private preview runs for <strong>{invite.trialDays} days</strong> from today
            {accessExpiresAt ? (
              <>
                {' '}
                (through {new Date(accessExpiresAt).toLocaleDateString()})
              </>
            ) : null}
            .
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 font-mono text-sm">
            <span className="flex-1 break-all">{generatedPassword}</span>
            <button type="button" onClick={() => void copyPassword()} className="text-gray-600 hover:text-black">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Open BOG Accounting
          </button>
          <Link
            to="/product-intelligence"
            className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <MessageSquare size={16} />
            Share what works best in Product intelligence
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bog-paper px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <CubeLogoMark className="mb-4 h-12 w-12" />
          <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900">
            <Heart size={14} />
            Family &amp; friends preview
          </p>
          {invite.label ? (
            <p className="mt-2 text-sm text-gray-500">{invite.label}</p>
          ) : null}
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-gray-500">
            BOG is far from finished. You&apos;re getting early access so we can learn what to build next — not a public
            launch.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <FirstTimeSignInForm
            title="Help shape BOG"
            subtitle={`You'll get your own private sandbox with full access for ${invite.trialDays} days from first sign-in. Use a personal email, explore honestly, and tell us what would make BOG better for you.`}
            submitLabel={busy ? 'Setting up preview…' : 'Start preview'}
            busy={busy}
            error={error}
            onSubmit={(form) => void handleSubmit(form)}
            footer={
              <p className="text-center text-xs text-gray-400">
                After {invite.trialDays} days preview access ends. Please use{' '}
                <strong>Product intelligence</strong> in the app to share what worked, what confused you, and what you
                wish BOG did.
              </p>
            }
          />
        </div>
      </div>
    </div>
  );
}
