import { useEffect, useState } from 'react';
import { useVisualPresetsOptional } from '@/context/VisualPresetContext';

export type NeonAuraPalette = {
  id: string;
  primary: string;
  secondary: string;
};

export const NEON_AURA_PALETTES: NeonAuraPalette[] = [
  { id: 'cyber-cyan', primary: '#00f0ff', secondary: '#0066ff' },
  { id: 'hot-magenta', primary: '#ff00e5', secondary: '#a855f7' },
  { id: 'acid-lime', primary: '#39ff14', secondary: '#00ff99' },
  { id: 'solar-flare', primary: '#ff6600', secondary: '#ffcc00' },
  { id: 'neon-rose', primary: '#ff2a6d', secondary: '#ff8c00' },
  { id: 'violet-pulse', primary: '#bf00ff', secondary: '#00d4ff' },
  { id: 'electric-blue', primary: '#7df9ff', secondary: '#4d4dff' },
  { id: 'plasma-gold', primary: '#ffd700', secondary: '#ff4500' },
];

const STORAGE_KEY = 'bog-neon-aura-v1';
const ROTATE_MS = 30 * 60 * 1000;
const CHECK_MS = 60 * 1000;

function pickRandomPalette(excludeId?: string): NeonAuraPalette {
  const pool = excludeId
    ? NEON_AURA_PALETTES.filter((p) => p.id !== excludeId)
    : NEON_AURA_PALETTES;
  return pool[Math.floor(Math.random() * pool.length)] ?? NEON_AURA_PALETTES[0];
}

function readStored(): { palette: NeonAuraPalette; expiresAt: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { palette?: NeonAuraPalette; expiresAt?: number };
    if (!parsed.palette?.primary || typeof parsed.expiresAt !== 'number') return null;
    return { palette: parsed.palette, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeStored(palette: NeonAuraPalette, expiresAt: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ palette, expiresAt }));
}

function loadInitialPalette(): NeonAuraPalette {
  const stored = readStored();
  if (stored && stored.expiresAt > Date.now()) return stored.palette;
  const next = pickRandomPalette(stored?.palette.id);
  writeStored(next, Date.now() + ROTATE_MS);
  return next;
}

/** Random neon pair; rotates every 30 minutes (persisted across reloads). */
export function useNeonAuraPalette() {
  const [palette, setPalette] = useState<NeonAuraPalette>(loadInitialPalette);

  useEffect(() => {
    const sync = () => {
      const stored = readStored();
      if (stored && stored.expiresAt > Date.now()) {
        setPalette(stored.palette);
        return;
      }
      setPalette((current) => {
        const next = pickRandomPalette(current.id);
        writeStored(next, Date.now() + ROTATE_MS);
        return next;
      });
    };

    sync();
    const id = window.setInterval(sync, CHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  return palette;
}

/** #rrggbb -> "r, g, b" channel string (for rgb()/rgba() with alpha). */
function hexToRgbChannels(hex: string): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Drives the app's structural accent lines from the live cube palette.
 * Writes `--bog-neon` / `--bog-neon-rgb` / `--bog-neon-2` to <html> so the
 * active nav rail, key rules, highlight strips, and header accent recolor in
 * sync with the logo cube. Mount once near the app root.
 */
export function useNeonThemeSync(): NeonAuraPalette {
  const presets = useVisualPresetsOptional();
  const rotating = useNeonAuraPalette();
  const palette: NeonAuraPalette = presets?.fixedNeon
    ? { id: `theme-${presets.themeId}`, primary: presets.fixedNeon.primary, secondary: presets.fixedNeon.secondary }
    : rotating;

  useEffect(() => {
    const root = document.documentElement;
    const rgb = hexToRgbChannels(palette.primary);
    root.style.setProperty('--bog-neon', palette.primary);
    root.style.setProperty('--bog-neon-rgb', rgb);
    root.style.setProperty('--bog-neon-2', palette.secondary);
    root.style.setProperty('--bog-neon-soft', `rgba(${rgb}, 0.14)`);
  }, [palette.primary, palette.secondary]);

  return palette;
}
