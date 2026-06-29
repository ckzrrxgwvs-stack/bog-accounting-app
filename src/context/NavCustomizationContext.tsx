import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_NAV_ORDER, NAV_CATALOG } from '@/lib/navCatalog';

const STORAGE_KEY = 'bog-nav-customization-v1';

type NavCustomizationState = {
  /** Item ids the user chose to hide from the sidebar. */
  hiddenIds: string[];
  /** Custom order — ids not listed fall back to catalog order. */
  order: string[];
};

const defaults: NavCustomizationState = {
  hiddenIds: [],
  order: DEFAULT_NAV_ORDER,
};

function loadState(): NavCustomizationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NavCustomizationState>;
    const order = Array.isArray(parsed.order) ? parsed.order : defaults.order;
    const known = new Set(NAV_CATALOG.map((i) => i.id));
    const mergedOrder = [
      ...order.filter((id) => known.has(id)),
      ...DEFAULT_NAV_ORDER.filter((id) => !order.includes(id)),
    ];
    return {
      hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds.filter((id) => known.has(id)) : [],
      order: mergedOrder,
    };
  } catch {
    return defaults;
  }
}

type NavCustomizationContextValue = NavCustomizationState & {
  isVisible: (id: string) => boolean;
  setVisible: (id: string, visible: boolean) => void;
  moveItem: (id: string, direction: 'up' | 'down') => void;
  resetNavCustomization: () => void;
  sortedCatalog: typeof NAV_CATALOG;
};

const NavCustomizationContext = createContext<NavCustomizationContextValue | null>(null);

export function NavCustomizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NavCustomizationState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const isVisible = useCallback((id: string) => !state.hiddenIds.includes(id), [state.hiddenIds]);

  const setVisible = useCallback((id: string, visible: boolean) => {
    setState((s) => {
      const hidden = new Set(s.hiddenIds);
      if (visible) hidden.delete(id);
      else hidden.add(id);
      return { ...s, hiddenIds: [...hidden] };
    });
  }, []);

  const moveItem = useCallback((id: string, direction: 'up' | 'down') => {
    setState((s) => {
      const order = [...s.order];
      const idx = order.indexOf(id);
      if (idx < 0) return s;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= order.length) return s;
      [order[idx], order[swap]] = [order[swap], order[idx]];
      return { ...s, order };
    });
  }, []);

  const sortedCatalog = useMemo(() => {
    const rank = new Map(state.order.map((id, i) => [id, i]));
    return [...NAV_CATALOG].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }, [state.order]);

  const value = useMemo<NavCustomizationContextValue>(
    () => ({
      ...state,
      isVisible,
      setVisible,
      moveItem,
      resetNavCustomization: () => setState(defaults),
      sortedCatalog,
    }),
    [state, isVisible, setVisible, moveItem, sortedCatalog]
  );

  return <NavCustomizationContext.Provider value={value}>{children}</NavCustomizationContext.Provider>;
}

export function useNavCustomization() {
  const ctx = useContext(NavCustomizationContext);
  if (!ctx) throw new Error('useNavCustomization must be used within NavCustomizationProvider');
  return ctx;
}
