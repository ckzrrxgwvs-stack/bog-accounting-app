import React from 'react';

export type BrandKitView = {
  companyName: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  logoUrl: string;
  tagline: string;
  preparerLine?: string;
};

type Props = {
  brand: BrandKitView;
  subtitle?: string;
  className?: string;
};

/** Letterhead block for in-app mail preview and print-ready reports. */
export function BrandLetterhead({ brand, subtitle, className = '' }: Props) {
  const contact = [brand.phone, brand.email].filter(Boolean).join(' · ');

  return (
    <header className={`bog-brand-letterhead ${className}`}>
      <div className="flex items-start gap-4 border-b border-[hsl(var(--bog-accent))]/30 pb-4">
        <img
          src={brand.logoUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl border border-bog-rule bg-white object-contain p-1.5 shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/favicon.svg';
          }}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-bog-ink">{brand.companyName}</h1>
          {brand.legalName !== brand.companyName && (
            <p className="text-sm text-zinc-600">{brand.legalName}</p>
          )}
          <p className="mt-1 text-xs font-medium tracking-wide text-[hsl(var(--bog-accent))]">{brand.tagline}</p>
          {brand.address && <p className="mt-2 text-xs text-zinc-500">{brand.address}</p>}
          {contact && <p className="text-xs text-zinc-500">{contact}</p>}
          {brand.taxId && <p className="text-xs text-zinc-400">Tax ID: {brand.taxId}</p>}
        </div>
      </div>
      {subtitle && <p className="mt-3 text-sm font-medium text-zinc-600">{subtitle}</p>}
    </header>
  );
}
