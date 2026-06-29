import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_GRAPHIC_STYLE_ID,
  DEFAULT_LAYOUT_ID,
  DEFAULT_THEME_ID,
  getThemeById,
} from '@/lib/visualPresets';

const STORAGE_KEY = 'bog-visual-presets-v1';

type VisualPresetState = {
  themeId: string;
  layoutId: string;
  graphicStyleId: string;
};

const defaults: VisualPresetState = {
  themeId: DEFAULT_THEME_ID,
  layoutId: DEFAULT_LAYOUT_ID,
  graphicStyleId: DEFAULT_GRAPHIC_STYLE_ID,
};

function loadState(): VisualPresetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function applyDom(state: VisualPresetState) {
  const root = document.documentElement;
  root.dataset.theme = state.themeId;
  root.dataset.layout = state.layoutId;
  root.dataset.graphicStyle = state.graphicStyleId;
}

type VisualPresetContextValue = VisualPresetState & {
  setThemeId: (id: string) => void;
  setLayoutId: (id: string) => void;
  setGraphicStyleId: (id: string) => void;
  resetVisualPresets: () => void;
  /** When the active theme locks neon colors, use this instead of the rotating cube palette. */
  fixedNeon: { primary: string; secondary: string } | null;
};

const VisualPresetContext = createContext<VisualPresetContextValue | null>(null);

export function VisualPresetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VisualPresetState>(() => {
    const loaded = loadState();
    applyDom(loaded);
    return loaded;
  });

  useEffect(() => {
    applyDom(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const patch = useCallback((partial: Partial<VisualPresetState>) => {
    setState((s) => ({ ...s, ...partial }));
  }, []);

  const fixedNeon = useMemo(() => {
    const theme = getThemeById(state.themeId);
    if (theme.neonMode === 'fixed' && theme.fixedNeon) return theme.fixedNeon;
    return null;
  }, [state.themeId]);

  const value = useMemo<VisualPresetContextValue>(
    () => ({
      ...state,
      setThemeId: (id) => patch({ themeId: id }),
      setLayoutId: (id) => patch({ layoutId: id }),
      setGraphicStyleId: (id) => patch({ graphicStyleId: id }),
      resetVisualPresets: () => setState(defaults),
      fixedNeon,
    }),
    [state, patch, fixedNeon]
  );

  return <VisualPresetContext.Provider value={value}>{children}</VisualPresetContext.Provider>;
}

export function useVisualPresets() {
  const ctx = useContext(VisualPresetContext);
  if (!ctx) throw new Error('useVisualPresets must be used within VisualPresetProvider');
  return ctx;
}

/** Safe for hooks that may run before the provider is mounted (returns null). */
export function useVisualPresetsOptional() {
  return useContext(VisualPresetContext);
}
