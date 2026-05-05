/**
 * BOG-Pi cross-tab engine — aggregates rectangular facts into row × column summaries.
 * Independent implementation (standard grouping math; not derived from any spreadsheet product).
 */

export type AggregationKind = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type PivotSpec = {
  rowField: string;
  columnField: string;
  valueField: string;
  aggregation: AggregationKind;
};

export type PivotTableResult = {
  rowKeys: string[];
  columnKeys: string[];
  /** matrix[row][col] — numeric cell */
  cells: number[][];
  rowTotals: number[];
  columnTotals: number[];
  grandTotal: number;
};

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function key(v: unknown): string {
  if (v == null || v === '') return '(blank)';
  return String(v);
}

/** Groups records into a two-dimensional summary + margins (pivot-style output). */
export function computePivot(rows: Record<string, unknown>[], spec: PivotSpec): PivotTableResult {
  const { rowField, columnField, valueField, aggregation } = spec;

  type Bucket = {
    /** Rows falling in this row × column intersection (for Count aggregation). */
    rowCount: number;
    sum: number;
    /** Numeric observations for avg / min / max / sum */
    numericCount: number;
    min: number;
    max: number;
  };
  const map = new Map<string, Bucket>();

  const rowSet = new Set<string>();
  const colSet = new Set<string>();

  for (const r of rows) {
    const rk = key(r[rowField]);
    const ck = key(r[columnField]);
    rowSet.add(rk);
    colSet.add(ck);
    const cellKey = `${rk}\u0000${ck}`;
    const n = num(r[valueField]);
    let b = map.get(cellKey);
    if (!b) {
      b = { rowCount: 0, sum: 0, numericCount: 0, min: Infinity, max: -Infinity };
      map.set(cellKey, b);
    }
    b.rowCount += 1;
    if (n != null) {
      b.sum += n;
      b.numericCount += 1;
      b.min = Math.min(b.min, n);
      b.max = Math.max(b.max, n);
    }
  }

  const rowKeys = [...rowSet].sort((a, b) => a.localeCompare(b));
  const columnKeys = [...colSet].sort((a, b) => a.localeCompare(b));

  const cellVal = (b: Bucket | undefined): number => {
    if (!b) return 0;
    switch (aggregation) {
      case 'sum':
        return Math.round(b.sum * 100) / 100;
      case 'count':
        return b.rowCount;
      case 'avg':
        return b.numericCount === 0 ? 0 : Math.round((b.sum / b.numericCount) * 100) / 100;
      case 'min':
        return b.numericCount === 0 || b.min === Infinity ? 0 : Math.round(b.min * 100) / 100;
      case 'max':
        return b.numericCount === 0 || b.max === -Infinity ? 0 : Math.round(b.max * 100) / 100;
      default:
        return 0;
    }
  };

  const cells: number[][] = rowKeys.map((rk) =>
    columnKeys.map((ck) => {
      const b = map.get(`${rk}\u0000${ck}`);
      return cellVal(b);
    })
  );

  const rowTotals = cells.map((row) => Math.round(row.reduce((a, x) => a + x, 0) * 100) / 100);
  const columnTotals = columnKeys.map((_, ci) =>
    Math.round(
      cells.reduce((acc, row) => acc + row[ci], 0) * 100
    ) / 100
  );
  const grandTotal = Math.round(rowTotals.reduce((a, x) => a + x, 0) * 100) / 100;

  return { rowKeys, columnKeys, cells, rowTotals, columnTotals, grandTotal };
}

/** Sort rows by a single column name (spreadsheet-style column sort). */
export function sortRowsByColumn(
  rows: Record<string, unknown>[],
  column: string,
  direction: 'asc' | 'desc'
): Record<string, unknown>[] {
  const mul = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[column];
    const vb = b[column];
    const na = num(va);
    const nb = num(vb);
    if (na != null && nb != null) return (na - nb) * mul;
    return String(va ?? '').localeCompare(String(vb ?? '')) * mul;
  });
}

/** Unique values for filter dropdowns. */
export function distinctValues(rows: Record<string, unknown>[], field: string): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    s.add(key(r[field]));
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

/** Apply simple include-filters (AND). */
export function applyFilters(
  rows: Record<string, unknown>[],
  filters: Record<string, string[] | undefined>
): Record<string, unknown>[] {
  return rows.filter((r) => {
    for (const [field, allowed] of Object.entries(filters)) {
      if (!allowed || allowed.length === 0) continue;
      if (!allowed.includes(key(r[field]))) return false;
    }
    return true;
  });
}

export function rowsToCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map(esc).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}
