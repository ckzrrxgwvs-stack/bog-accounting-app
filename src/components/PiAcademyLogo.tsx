// Pi Academy — the learning sibling of the BOG-Pi cube mark.
// Same isometric cube geometry as BOG-Pi (Logo.tsx), but its own identity:
// an amber "crown" top face (the Academy's learning light) with π as the hero glyph.

export const ACADEMY_AMBER = 'hsl(38 90% 48%)';

/** Isometric cube with an amber crown + π hero — Pi Academy's own mark. */
export function PiAcademyMark({
  size = 44,
  className = '',
  amber = ACADEMY_AMBER,
}: {
  size?: number;
  className?: string;
  amber?: string;
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
      <title>Pi Academy logo mark</title>
      {/* Left + right faces — grayscale, same geometry as the BOG-Pi cube */}
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
      {/* Amber crown (top face) — the Academy's learning light */}
      <path
        d="M40 14 62 27 40 40 18 27Z"
        fill={amber}
        stroke="#0c0c0d"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {/* Crown facet edges */}
      <path d="M40 14 L40 40" stroke="#ffffff" strokeWidth="0.85" strokeOpacity="0.55" strokeLinecap="round" />
      <path d="M18 27 L62 27" stroke="#ffffff" strokeWidth="0.85" strokeOpacity="0.55" strokeLinecap="round" />
      {/* π — the hero glyph, sitting on the amber crown */}
      <text
        x="40"
        y="32"
        textAnchor="middle"
        fill="#0c0c0d"
        fontSize="13"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        π
      </text>
      {/* Front-face grid lines — the 3×3 cube echo from BOG-Pi */}
      <path d="M22 38 L38 47" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
      <path d="M58 38 L42 47" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
      <path d="M29 45 L29 58" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
      <path d="M51 45 L51 58" stroke="#0c0c0d" strokeWidth="0.65" strokeOpacity="0.28" />
    </svg>
  );
}

/** Mark wrapped in a soft amber aura — sibling of the BOG neon glow. */
export function PiAcademyMarkGlow({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${ACADEMY_AMBER}22 0%, transparent 70%)`,
        boxShadow: `0 0 22px ${ACADEMY_AMBER}33, 0 0 44px ${ACADEMY_AMBER}1f`,
        padding: Math.round(size * 0.28),
      }}
    >
      <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
        <PiAcademyMark size={size} />
      </div>
    </div>
  );
}

/** Pi Academy wordmark + mark. */
export function PiAcademyLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 36, md: 44, lg: 56 }[size];
  const title = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' }[size];

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-xl">
        <PiAcademyMark size={px} />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className={`font-bold tracking-tight text-bog-ink ${title}`}>
          Pi <span style={{ color: ACADEMY_AMBER }}>Academy</span>
          <span className="font-figures font-semibold" style={{ color: ACADEMY_AMBER }}>
            {' '}
            π
          </span>
        </span>
        <span className="text-[11px] text-zinc-500">Learn the discipline behind the ledger</span>
      </div>
    </div>
  );
}
