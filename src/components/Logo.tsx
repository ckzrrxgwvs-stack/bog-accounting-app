// BOG-Pi — Books On The Go · π precision (Rubik-inspired cube mark, original — not Rubik’s Cube™)

import React from 'react';

/** Isometric 3×3-style cube: black/white faces + one accent “tile” (π / precision) */
export function CubeLogoMark({
  size = 40,
  className = '',
  accent = true,
}: {
  size?: number;
  className?: string;
  /** Highlight one facet with accent blue */
  accent?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <title>BOG-Pi logo mark</title>
      {/* Top face */}
      <path
        d="M40 14 62 27 40 40 18 27Z"
        fill="#fafafa"
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {/* Left face */}
      <path
        d="M18 27 40 40 40 66 18 53Z"
        fill="#e4e4e7"
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {/* Right face */}
      <path
        d="M62 27 40 40 40 66 62 53Z"
        fill="#f4f4f5"
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {/* Top-face crosshair (Rubik-like segmentation, ruled lines) */}
      <path d="M40 14 L40 40" stroke="#0c0c0d" strokeWidth="0.85" strokeOpacity="0.4" strokeLinecap="round" />
      <path d="M18 27 L62 27" stroke="#0c0c0d" strokeWidth="0.85" strokeOpacity="0.4" strokeLinecap="round" />
      {/* Accent tile on top (precision highlight) */}
      {accent && (
        <path
          d="M40 27 51 33 40 39 29 33Z"
          fill="hsl(217 91% 53%)"
          fillOpacity={0.92}
          stroke="#0c0c0d"
          strokeWidth="0.6"
        />
      )}
      {/* Left / right face facet lines */}
      <path d="M22 38 L38 47" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
      <path d="M58 38 L42 47" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
      <path d="M29 45 L29 58" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
      <path d="M51 45 L51 58" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
    </svg>
  );
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  showGlow?: boolean;
}

export function Logo({ size = 'md', variant = 'full', showGlow = false }: LogoProps) {
  const sizes = {
    sm: { px: 32, label: 'text-[10px]', title: 'text-sm' },
    md: { px: 40, label: 'text-xs', title: 'text-base' },
    lg: { px: 48, label: 'text-sm', title: 'text-lg' },
    xl: { px: 56, label: 'text-sm', title: 'text-xl' },
  };

  const glowClass = showGlow ? 'shadow-lg shadow-black/15' : '';
  const s = sizes[size];

  if (variant === 'icon') {
    return (
      <div className={`rounded-xl ${glowClass}`}>
        <CubeLogoMark size={s.px} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`shrink-0 rounded-xl ${glowClass}`}>
        <CubeLogoMark size={s.px} />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className={`font-bold tracking-tight text-bog-ink ${s.title}`}>
          BOG-Pi
          <span className="font-figures font-semibold text-[hsl(var(--bog-accent))]"> π</span>
        </span>
        <span className={`${s.label} text-zinc-500`}>Books On The Go</span>
        <span className={`font-figures ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'} text-zinc-400`}>
          3.1416… · ledger precision
        </span>
      </div>
    </div>
  );
}

interface LogoWithStatusProps {
  status?: 'active' | 'demo' | 'syncing';
}

export function LogoWithStatus({ status = 'active' }: LogoWithStatusProps) {
  const statusConfig = {
    active: { color: 'bg-emerald-500', label: 'Connected', textColor: 'text-emerald-400' },
    demo: { color: 'bg-amber-500', label: 'Demo mode', textColor: 'text-amber-400' },
    syncing: { color: 'bg-[hsl(var(--bog-accent))] animate-pulse', label: 'Syncing', textColor: 'text-blue-300' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative shrink-0">
        <div className="overflow-hidden rounded-xl ring-1 ring-white/15">
          <CubeLogoMark size={40} />
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(var(--bog-sidebar))] ${config.color}`}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="truncate text-sm font-bold tracking-tight text-white">BOG-Pi</span>
          <span className="font-figures text-xs font-semibold text-[hsl(var(--bog-accent))]">π</span>
        </div>
        <span className={`truncate text-[11px] ${config.textColor}`}>{config.label}</span>
      </div>
    </div>
  );
}

export function BOGIcon({ size = 40 }: { size?: number }) {
  return (
    <div className="overflow-hidden rounded-xl shadow-lg shadow-black/15" style={{ width: size, height: size }}>
      <CubeLogoMark size={size} />
    </div>
  );
}
