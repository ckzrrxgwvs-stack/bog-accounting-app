import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_GRAPHIC_STYLE_ID,
  DEFAULT_LAYOUT_ID,
  DEFAULT_TEXT_FORMAT,
  DEFAULT_THEME_ID,
  DEFAULT_WORKSPACE_GRID,
  getThemeById,
  type BogTextFormat,
  type BogWorkspaceGrid,
} from '@/lib/visualPresets';

const STORAGE_KEY = 'bog-visual-presets-v2';

type VisualPresetState = {
  themeId: string;
  layoutId: string;
  graphicStyleId: string;
  grid: BogWorkspaceGrid;
  textFormat: BogTextFormat;
};

const defaults: VisualPresetState = {
  themeId: DEFAULT_THEME_ID,
  layoutId: DEFAULT_LAYOUT_ID,
  graphicStyleId: DEFAULT_GRAPHIC_STYLE_ID,
  grid: DEFAULT_WORKSPACE_GRID,
  textFormat: DEFAULT_TEXT_FORMAT,
};

function loadState(): VisualPresetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('bog-visual-presets-v1');
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<VisualPresetState>;
    return {
      ...defaults,
      ...parsed,
      grid: { ...DEFAULT_WORKSPACE_GRID, ...parsed.grid },
      textFormat: { ...DEFAULT_TEXT_FORMAT, ...parsed.textFormat },
    };
  } catch {
    return defaults;
  }
}

function applyDom(state: VisualPresetState) {
  const root = document.documentElement;
  root.dataset.theme = state.themeId;
  root.dataset.layout = state.layoutId;
  root.dataset.graphicStyle = state.graphicStyleId;
  root.dataset.gridRows = state.grid.showRowLines ? 'true' : 'false';
  root.dataset.gridCols = state.grid.showColumnLines ? 'true' : 'false';
  root.dataset.gridSize = state.grid.cellSize;
  root.dataset.workspaceAlign = state.textFormat.align;
  root.dataset.workspaceBold = state.textFormat.bold ? 'true' : 'false';
  root.dataset.workspaceUnderline = state.textFormat.underline ? 'true' : 'false';
}

type VisualPresetContextValue = VisualPresetState & {
  setThemeId: (id: string) => void;
  setLayoutId: (id: string) => void;
  setGraphicStyleId: (id: string) => void;
  setGrid: (patch: Partial<BogWorkspaceGrid>) => void;
  setTextFormat: (patch: Partial<BogTextFormat>) => void;
  resetVisualPresets: () => void;
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

  const setGrid = useCallback((gridPatch: Partial<BogWorkspaceGrid>) => {
    setState((s) => ({ ...s, grid: { ...s.grid, ...gridPatch } }));
  }, []);

  const setTextFormat = useCallback((fmtPatch: Partial<BogTextFormat>) => {
    setState((s) => ({ ...s, textFormat: { ...s.textFormat, ...fmtPatch } }));
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
      setGrid,
      setTextFormat,
      resetVisualPresets: () => setState(defaults),
      fixedNeon,
    }),
    [state, patch, setGrid, setTextFormat, fixedNeon]
  );

  return <VisualPresetContext.Provider value={value}>{children}</VisualPresetContext.Provider>;
}

export function useVisualPresets() {
  const ctx = useContext(VisualPresetContext);
  if (!ctx) throw new Error('useVisualPresets must be used within VisualPresetProvider');
  return ctx;
}

export function useVisualPresetsOptional() {
  return useContext(VisualPresetContext);
}
