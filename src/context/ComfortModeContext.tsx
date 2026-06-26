import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ComfortSettings = {
  comfortMode: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  softGrid: boolean;
};

const STORAGE_KEY = 'bog-comfort-settings';

const defaults: ComfortSettings = {
  comfortMode: true,
  largeText: false,
  reducedMotion: false,
  softGrid: true,
};

function loadSettings(): ComfortSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

type ComfortContextValue = ComfortSettings & {
  setComfortMode: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setSoftGrid: (v: boolean) => void;
  resetComfort: () => void;
};

const ComfortContext = createContext<ComfortContextValue | null>(null);

function applyDom(settings: ComfortSettings) {
  const root = document.documentElement;
  root.dataset.comfort = settings.comfortMode ? 'true' : 'false';
  root.dataset.textScale = settings.largeText ? 'large' : 'normal';
  root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  root.dataset.softGrid = settings.softGrid ? 'true' : 'false';
}

export function ComfortModeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ComfortSettings>(loadSettings);

  useEffect(() => {
    applyDom(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const patch = useCallback((partial: Partial<ComfortSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  }, []);

  const value = useMemo<ComfortContextValue>(
    () => ({
      ...settings,
      setComfortMode: (v) => patch({ comfortMode: v }),
      setLargeText: (v) => patch({ largeText: v }),
      setReducedMotion: (v) => patch({ reducedMotion: v }),
      setSoftGrid: (v) => patch({ softGrid: v }),
      resetComfort: () => setSettings(defaults),
    }),
    [settings, patch]
  );

  return <ComfortContext.Provider value={value}>{children}</ComfortContext.Provider>;
}

export function useComfortMode() {
  const ctx = useContext(ComfortContext);
  if (!ctx) throw new Error('useComfortMode must be used within ComfortModeProvider');
  return ctx;
}
