// BOG-Pi — Books On The Go · π precision (Rubik-inspired cube mark, original — not Rubik’s Cube™)

import React from 'react';
import { useNeonThemeSync } from '@/hooks/useNeonAuraPalette';

const SIDEBAR_LOGO_PX = 50;

/** Isometric 3×3-style cube: black/white faces + one accent “tile” (π / precision) */
export function CubeLogoMark({
  size = 40,
  className = '',
  accent = true,
  accentColor,
}: {
  size?: number;
  className?: string;
  /** Highlight one facet with accent blue */
  accent?: boolean;
  accentColor?: string;
}) {
  const tileFill = accentColor ?? 'hsl(217 91% 53%)';

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
      <path
        d="M40 14 62 27 40 40 18 27Z"
        fill="#fafafa"
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M18 27 40 40 40 66 18 53Z"
        fill="#e4e4e7"
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M62 27 40 40 40 66 62 53Z"
        fill="#f4f4f5"
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M40 14 L40 40" stroke="#0c0c0d" strokeWidth="0.85" strokeOpacity="0.4" strokeLinecap="round" />
      <path d="M18 27 L62 27" stroke="#0c0c0d" strokeWidth="0.85" strokeOpacity="0.4" strokeLinecap="round" />
      {accent && (
        <path
          d="M40 27 51 33 40 39 29 33Z"
          fill={tileFill}
          fillOpacity={0.95}
          stroke="#0c0c0d"
          strokeWidth="0.6"
          className="transition-[fill] duration-[2s] ease-in-out"
        />
      )}
      {/* BOG — identifies the cube (sibling of the π on the Pi Academy cube) */}
      <text
        x="40"
        y="55"
        textAnchor="middle"
        fill="#0c0c0d"
        fontSize="10.5"
        fontWeight="800"
        fontFamily="Helvetica, Arial, sans-serif"
        letterSpacing="-0.5"
      >
        BOG
      </text>
    </svg>
  );
}

export function NeonAuraFrame({
  primary,
  secondary,
  size,
  children,
}: {
  primary: string;
  secondary: string;
  size: number;
  children: React.ReactNode;
}) {
  const pad = Math.round(size * 0.35);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size + pad * 2, height: size + pad * 2 }}
    >
      <span
        aria-hidden
        className="bog-neon-rays pointer-events-none absolute rounded-full"
        style={{
          inset: -pad * 0.1,
          background: `repeating-conic-gradient(from 0deg, ${primary}e0 0deg, ${primary}e0 1.4deg, transparent 1.4deg, transparent 9deg)`,
          WebkitMaskImage: 'radial-gradient(circle, transparent 24%, #000 42%, #000 62%, transparent 82%)',
          maskImage: 'radial-gradient(circle, transparent 24%, #000 42%, #000 62%, transparent 82%)',
        }}
      />
      <span
        aria-hidden
        className="bog-neon-rays-rev pointer-events-none absolute rounded-full"
        style={{
          inset: pad * 0.05,
          background: `repeating-conic-gradient(from 4deg, ${secondary}b3 0deg, ${secondary}b3 0.9deg, transparent 0.9deg, transparent 6deg)`,
          WebkitMaskImage: 'radial-gradient(circle, transparent 30%, #000 46%, transparent 80%)',
          maskImage: 'radial-gradient(circle, transparent 30%, #000 46%, transparent 80%)',
        }}
      />
      <span
        aria-hidden
        className="bog-neon-aura-outer pointer-events-none absolute rounded-2xl transition-[box-shadow,opacity,transform] duration-[2s] ease-in-out"
        style={{
          inset: pad * 0.35,
          background: `radial-gradient(circle at 50% 45%, ${primary}55 0%, ${secondary}28 38%, transparent 68%)`,
          boxShadow: `0 0 22px ${primary}66, 0 0 44px ${secondary}44, 0 0 68px ${primary}22`,
        }}
      />
      <span
        aria-hidden
        className="bog-neon-aura-inner pointer-events-none absolute rounded-xl transition-[box-shadow,opacity] duration-[2s] ease-in-out"
        style={{
          inset: pad * 0.65,
          boxShadow: `0 0 12px ${primary}88, 0 0 24px ${secondary}55`,
        }}
      />
      <span
        aria-hidden
        className="bog-neon-spark pointer-events-none absolute rounded-full transition-[background,opacity] duration-[2s] ease-in-out"
        style={{
          width: size * 0.22,
          height: size * 0.22,
          top: '12%',
          right: '18%',
          background: `radial-gradient(circle, ${primary} 0%, transparent 70%)`,
        }}
      />
      <span
        aria-hidden
        className="bog-neon-spark-delay pointer-events-none absolute rounded-full transition-[background,opacity] duration-[2s] ease-in-out"
        style={{
          width: size * 0.16,
          height: size * 0.16,
          bottom: '16%',
          left: '14%',
          background: `radial-gradient(circle, ${secondary} 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 overflow-hidden rounded-xl ring-1 ring-white/20 transition-shadow duration-[2s] ease-in-out">
        {children}
      </div>
    </div>
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
  const aura = useNeonThemeSync();

  const statusConfig = {
    active: { color: 'bg-emerald-500', label: 'Connected', textColor: 'text-emerald-400' },
    demo: { color: 'bg-amber-500', label: 'Demo mode', textColor: 'text-amber-400' },
    syncing: { color: 'bg-[hsl(var(--bog-accent))] animate-pulse', label: 'Syncing', textColor: 'text-blue-300' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative shrink-0">
        <NeonAuraFrame primary={aura.primary} secondary={aura.secondary} size={SIDEBAR_LOGO_PX}>
          <CubeLogoMark size={SIDEBAR_LOGO_PX} accentColor={aura.primary} />
        </NeonAuraFrame>
        <span
          className={`absolute bottom-0 right-0 z-20 h-3 w-3 rounded-full border-2 border-[hsl(var(--bog-sidebar))] ${config.color}`}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="truncate text-sm font-bold tracking-tight text-white">BOG-Pi</span>
          <span
            className="font-figures text-xs font-semibold transition-colors duration-[2s] ease-in-out"
            style={{ color: aura.primary }}
          >
            π
          </span>
          <button
            type="button"
            title="See π go on forever"
            aria-label="Show the infinite digits of pi"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new Event('bog:open-pi'));
            }}
            className="font-figures text-[11px] leading-none text-zinc-500 transition-colors hover:text-white"
            style={{ textShadow: `0 0 6px ${aura.primary}55` }}
          >
            ∞
          </button>
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
