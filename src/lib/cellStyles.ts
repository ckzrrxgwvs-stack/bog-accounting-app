/**
 * Excel-style cell style presets — Good, Bad, Neutral, etc.
 * Applied per row/cell in Data Studio and (M2) Ledger tables.
 */

export type BogCellStyleId =
  | 'normal'
  | 'good'
  | 'bad'
  | 'neutral'
  | 'input'
  | 'total'
  | 'heading'
  | 'note';

export type CellStyleApplyTarget = 'row' | 'cell';

export type BogCellStyleDef = {
  id: BogCellStyleId;
  label: string;
  description: string;
  /** Preview swatch for ribbon gallery */
  swatch: { bg: string; text: string; border?: string };
  /** CSS class applied to td/tr */
  className: string;
};

export const BOG_CELL_STYLES: BogCellStyleDef[] = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'Clear custom formatting',
    swatch: { bg: '#ffffff', text: '#18181b', border: '#e4e4e7' },
    className: '',
  },
  {
    id: 'good',
    label: 'Good',
    description: 'On budget, balanced, cleared',
    swatch: { bg: '#dcfce7', text: '#14532d' },
    className: 'bog-cell-good',
  },
  {
    id: 'bad',
    label: 'Bad',
    description: 'Over budget, out of balance, error',
    swatch: { bg: '#fee2e2', text: '#7f1d1d' },
    className: 'bog-cell-bad',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Pending, draft, needs review',
    swatch: { bg: '#fef9c3', text: '#713f12' },
    className: 'bog-cell-neutral',
  },
  {
    id: 'input',
    label: 'Input',
    description: 'Manual entry / editable row',
    swatch: { bg: '#ffffff', text: '#18181b', border: '#2f7bf6' },
    className: 'bog-cell-input',
  },
  {
    id: 'total',
    label: 'Total',
    description: 'Subtotal or summary row',
    swatch: { bg: '#f4f4f5', text: '#18181b' },
    className: 'bog-cell-total',
  },
  {
    id: 'heading',
    label: 'Heading',
    description: 'Section header row',
    swatch: { bg: '#e4e4e7', text: '#18181b' },
    className: 'bog-cell-heading',
  },
  {
    id: 'note',
    label: 'Note',
    description: 'Footnote or memo line',
    swatch: { bg: '#fafafa', text: '#52525b' },
    className: 'bog-cell-note',
  },
];

export function getCellStyleById(id: BogCellStyleId): BogCellStyleDef {
  return BOG_CELL_STYLES.find((s) => s.id === id) ?? BOG_CELL_STYLES[0];
}

export function cellStyleClass(id: BogCellStyleId): string {
  return getCellStyleById(id).className;
}

export function cellStyleKey(rowKey: string, colKey?: string): string {
  return colKey ? `${rowKey}|${colKey}` : rowKey;
}
