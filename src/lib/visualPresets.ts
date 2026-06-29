/**
 * Visual preset catalog — Office-style themes, layout templates, and graphic
 * (cell) styles. Themes swap colors/fonts/effects app-wide via CSS variables;
 * templates adjust layout density; graphic styles tune statement blocks.
 */

export type ThemeNeonMode = 'live' | 'fixed';

export type BogVisualTheme = {
  id: string;
  name: string;
  tagline: string;
  /** theme = palette swap; skin = full visual personality shift */
  kind: 'theme' | 'skin';
  preview: {
    paper: string;
    ink: string;
    accent: string;
    sidebar: string;
  };
  neonMode: ThemeNeonMode;
  fixedNeon?: { primary: string; secondary: string };
};

export type BogLayoutTemplate = {
  id: string;
  name: string;
  description: string;
};

export type BogGraphicStyle = {
  id: string;
  name: string;
  description: string;
};

export const BOG_VISUAL_THEMES: BogVisualTheme[] = [
  {
    id: 'ledger-classic',
    name: 'Ledger Classic',
    tagline: 'Ink, paper, and precision blue — the BOG default.',
    kind: 'theme',
    preview: { paper: '#fafaf9', ink: '#18181b', accent: '#2f7bf6', sidebar: '#1a1a1e' },
    neonMode: 'live',
  },
  {
    id: 'warm-ledger',
    name: 'Warm Ledger',
    tagline: 'Sepia paper and softer accents for long sessions.',
    kind: 'theme',
    preview: { paper: '#f7f4ed', ink: '#292524', accent: '#3d7a9e', sidebar: '#1e2430' },
    neonMode: 'fixed',
    fixedNeon: { primary: '#5ba3c9', secondary: '#8ecae6' },
  },
  {
    id: 'executive-slate',
    name: 'Executive Slate',
    tagline: 'Neutral grays and restrained contrast — boardroom calm.',
    kind: 'theme',
    preview: { paper: '#f4f4f5', ink: '#18181b', accent: '#52525b', sidebar: '#27272a' },
    neonMode: 'fixed',
    fixedNeon: { primary: '#71717a', secondary: '#a1a1aa' },
  },
  {
    id: 'pi-precision',
    name: 'Pi Precision',
    tagline: 'Cool cyan ledger lines — tighter, sharper, more mono.',
    kind: 'theme',
    preview: { paper: '#f0f9ff', ink: '#0c4a6e', accent: '#0284c7', sidebar: '#0f172a' },
    neonMode: 'fixed',
    fixedNeon: { primary: '#00d4ff', secondary: '#0066ff' },
  },
  {
    id: 'midnight-audit',
    name: 'Midnight Audit',
    tagline: 'Dark workspace skin — low glare for late close.',
    kind: 'skin',
    preview: { paper: '#141416', ink: '#fafafa', accent: '#60a5fa', sidebar: '#09090b' },
    neonMode: 'fixed',
    fixedNeon: { primary: '#7df9ff', secondary: '#6366f1' },
  },
  {
    id: 'academy-amber',
    name: 'Academy Amber',
    tagline: 'Pi Academy learning light inside BOG — amber warmth.',
    kind: 'skin',
    preview: { paper: '#faf8f3', ink: '#1c1917', accent: '#e8990f', sidebar: '#292524' },
    neonMode: 'fixed',
    fixedNeon: { primary: '#e8990f', secondary: '#fbbf24' },
  },
];

export const BOG_LAYOUT_TEMPLATES: BogLayoutTemplate[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced spacing — default dashboard and module layout.',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Tighter rows and smaller base type — more data on screen.',
  },
  {
    id: 'statement',
    name: 'Statement',
    description: 'Wider cards and softer radius — report and close focused.',
  },
];

export const BOG_GRAPHIC_STYLES: BogGraphicStyle[] = [
  {
    id: 'classic-rules',
    name: 'Classic rules',
    description: 'White statement cards with strong rule lines — default ledger look.',
  },
  {
    id: 'soft-fill',
    name: 'Soft fill',
    description: 'Tinted statement blocks — like Excel’s themed table fills.',
  },
  {
    id: 'high-contrast',
    name: 'High contrast',
    description: 'Bold borders and keylines — maximum readability.',
  },
];

export const DEFAULT_THEME_ID = 'ledger-classic';
export const DEFAULT_LAYOUT_ID = 'standard';
export const DEFAULT_GRAPHIC_STYLE_ID = 'classic-rules';

export function getThemeById(id: string): BogVisualTheme {
  return BOG_VISUAL_THEMES.find((t) => t.id === id) ?? BOG_VISUAL_THEMES[0];
}
