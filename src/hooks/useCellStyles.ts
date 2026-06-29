import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cellStyleClass,
  cellStyleKey,
  type BogCellStyleId,
  type CellStyleApplyTarget,
} from '@/lib/cellStyles';

const STORAGE_PREFIX = 'bog-cell-styles-v1';

type StyleMap = Record<string, BogCellStyleId>;

function loadMap(scopeKey: string): StyleMap {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${scopeKey}`);
    if (!raw) return {};
    return JSON.parse(raw) as StyleMap;
  } catch {
    return {};
  }
}

function saveMap(scopeKey: string, map: StyleMap) {
  localStorage.setItem(`${STORAGE_PREFIX}:${scopeKey}`, JSON.stringify(map));
}

export type CellSelection = {
  rowKey: string;
  colKey?: string;
};

/**
 * Per-table cell style overlay (localStorage). Row keys win unless a cell key exists.
 */
export function useCellStyles(scopeKey: string) {
  const [styles, setStyles] = useState<StyleMap>(() => loadMap(scopeKey));
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [applyTarget, setApplyTarget] = useState<CellStyleApplyTarget>('row');

  useEffect(() => {
    setStyles(loadMap(scopeKey));
    setSelection(null);
  }, [scopeKey]);

  useEffect(() => {
    saveMap(scopeKey, styles);
  }, [scopeKey, styles]);

  const resolveStyleId = useCallback(
    (rowKey: string, colKey?: string): BogCellStyleId | null => {
      if (colKey) {
        const cellId = styles[cellStyleKey(rowKey, colKey)];
        if (cellId && cellId !== 'normal') return cellId;
      }
      const rowId = styles[rowKey];
      if (rowId && rowId !== 'normal') return rowId;
      return null;
    },
    [styles]
  );

  const classForCell = useCallback(
    (rowKey: string, colKey?: string): string => {
      const id = resolveStyleId(rowKey, colKey);
      return id ? cellStyleClass(id) : '';
    },
    [resolveStyleId]
  );

  const applyStyle = useCallback(
    (styleId: BogCellStyleId, rowKey: string, colKey?: string) => {
      setStyles((prev) => {
        const next = { ...prev };
        const target = applyTarget === 'cell' && colKey ? cellStyleKey(rowKey, colKey) : rowKey;
        if (styleId === 'normal') delete next[target];
        else next[target] = styleId;
        return next;
      });
    },
    [applyTarget]
  );

  const applyToSelection = useCallback(
    (styleId: BogCellStyleId) => {
      if (!selection) return;
      applyStyle(styleId, selection.rowKey, selection.colKey);
    },
    [selection, applyStyle]
  );

  const clearAll = useCallback(() => {
    setStyles({});
  }, []);

  const isSelected = useCallback(
    (rowKey: string, colKey?: string) =>
      selection?.rowKey === rowKey && (colKey === undefined || selection.colKey === colKey),
    [selection]
  );

  return useMemo(
    () => ({
      selection,
      setSelection,
      applyTarget,
      setApplyTarget,
      classForCell,
      applyStyle,
      applyToSelection,
      clearAll,
      isSelected,
      hasSelection: selection != null,
    }),
    [
      selection,
      applyTarget,
      classForCell,
      applyStyle,
      applyToSelection,
      clearAll,
      isSelected,
    ]
  );
}

export type UseCellStylesReturn = ReturnType<typeof useCellStyles>;
