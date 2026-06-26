import React, { useState } from 'react';
import { Mail, Lock, User, Building2, KeyRound } from 'lucide-react';

export type FirstTimeSignInValues = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  generatePassword: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (values: FirstTimeSignInValues) => void;
  footer?: React.ReactNode;
};

export function FirstTimeSignInForm({ title, subtitle, submitLabel, busy, error, onSubmit, footer }: Props) {
  const [form, setForm] = useState<FirstTimeSignInValues>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    generatePassword: false,
  });

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-black">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="space-y-4"
      >
        <label className="block text-sm">
          <span className="mb-1 flex items-center gap-1 font-medium text-gray-700">
            <Building2 size={16} /> Business name <span className="text-red-500">*</span>
          </span>
          <input
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            placeholder="Your company or portfolio name"
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
            <Mail size={16} /> Email (your sign-in)
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

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={form.generatePassword}
            onChange={(e) => setForm((f) => ({ ...f, generatePassword: e.target.checked }))}
          />
          <KeyRound size={16} className="shrink-0 text-sky-700" />
          <span className="text-sky-900">Let BOG generate a secure password for me</span>
        </label>

        {!form.generatePassword && (
          <label className="block text-sm">
            <span className="mb-1 flex items-center gap-1 font-medium text-gray-700">
              <Lock size={16} /> Password (8+ characters)
            </span>
            <input
              type="password"
              minLength={8}
              required={!form.generatePassword}
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
          {busy ? 'Working…' : submitLabel}
        </button>
      </form>

      {footer}
    </div>
  );
}
