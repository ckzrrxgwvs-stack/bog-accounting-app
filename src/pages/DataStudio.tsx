/**
 * Data Studio — analysis workspace with ribbon ergonomics and BOG-owned tools
 * (cross-tab summaries, filters, sorting, charts — not a spreadsheet UI clone).
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ModuleWorkspace,
  ledgerTableShell,
  ledgerHeadRow,
  ledgerThL,
  ledgerThR,
  ledgerRow,
  ledgerTdNum,
} from '@/components/layout/ModuleWorkspace';
import { DataStudioRibbon, type RibbonTabId } from '@/components/dataStudio/DataStudioRibbon';
import { CellStyleGallery } from '@/components/dataStudio/CellStyleGallery';
import { useCellStyles } from '@/hooks/useCellStyles';
import { cn } from '@/lib/utils';
import {
  SAMPLE_DATASETS,
  type DatasetDef,
} from '@/lib/dataStudio/sampleDatasets';
import {
  applyFilters,
  computePivot,
  distinctValues,
  rowsToCsv,
  sortRowsByColumn,
  type AggregationKind,
} from '@/lib/dataStudio/pivotEngine';

export function DataStudio() {
  const [dataset, setDataset] = useState<DatasetDef>(SAMPLE_DATASETS[0]);
  const [ribbonTab, setRibbonTab] = useState<RibbonTabId>('start');
  const [crossTabMode, setCrossTabMode] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [freezeHeader, setFreezeHeader] = useState(true);
  const [highlightExtremes, setHighlightExtremes] = useState(false);

  const textCols = useMemo(
    () => dataset.columns.filter((c) => c.type === 'text' || c.type === 'date'),
    [dataset]
  );
  const numberCols = useMemo(() => dataset.columns.filter((c) => c.type === 'number'), [dataset]);

  const [rowDim, setRowDim] = useState<string>(textCols[0]?.key ?? 'region');
  const [colDim, setColDim] = useState<string>(textCols[1]?.key ?? 'quarter');
  const [valueDim, setValueDim] = useState<string>(numberCols[0]?.key ?? 'amount');
  const [agg, setAgg] = useState<AggregationKind>('sum');

  const [sortCol, setSortCol] = useState<string>(() => dataset.columns[0]?.key ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const flatTableScope = `${dataset.id}:data-studio-flat`;
  const cellStyles = useCellStyles(flatTableScope);

  React.useEffect(() => {
    const tc = textCols.map((c) => c.key);
    setRowDim(tc[0] ?? '');
    setColDim(tc[1] ?? tc[0] ?? '');
    setValueDim(numberCols[0]?.key ?? '');
    setSortCol(dataset.columns[0]?.key ?? '');
    setFilters({});
  }, [dataset, textCols, numberCols]);

  React.useEffect(() => {
    if (rowDim === colDim && textCols.length > 1) {
      const other = textCols.find((c) => c.key !== rowDim);
      if (other) setColDim(other.key);
    }
  }, [rowDim, colDim, textCols]);

  const filteredRows = useMemo(
    () => applyFilters(dataset.rows, filters),
    [dataset.rows, filters]
  );

  const sortedFlat = useMemo(
    () => sortRowsByColumn(filteredRows, sortCol, sortDir),
    [filteredRows, sortCol, sortDir]
  );

  const pivot = useMemo(() => {
    try {
      return computePivot(filteredRows, {
        rowField: rowDim,
        columnField: colDim,
        valueField: valueDim,
        aggregation: agg,
      });
    } catch {
      return null;
    }
  }, [filteredRows, rowDim, colDim, valueDim, agg]);

  const exportCsv = useCallback(() => {
    const cols = dataset.columns.map((c) => c.key);
    const csv = rowsToCsv(sortedFlat, cols);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bog-data-studio-${dataset.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedFlat, dataset]);

  const resetLayout = useCallback(() => {
    setCrossTabMode(true);
    setShowChart(false);
    setFreezeHeader(true);
    setHighlightExtremes(false);
    setFilters({});
    setRibbonTab('start');
    cellStyles.clearAll();
    cellStyles.setSelection(null);
  }, [cellStyles.clearAll, cellStyles.setSelection]);

  const maxPerCol = useMemo(() => {
    if (!pivot) return [];
    return pivot.columnKeys.map((_, ci) =>
      Math.max(...pivot.cells.map((row) => row[ci] ?? 0), 0)
    );
  }, [pivot]);

  const toggleFilterValue = (field: string, value: string) => {
    setFilters((prev) => {
      const cur = prev[field] ?? [];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      const copy = { ...prev };
      if (next.length === 0) delete copy[field];
      else copy[field] = next;
      return copy;
    });
  };

  const chartPoints = useMemo(() => {
    if (!pivot) return [];
    return pivot.rowKeys.map((name, i) => ({
      label: name.length > 14 ? `${name.slice(0, 12)}…` : name,
      full: name,
      total: pivot.rowTotals[i],
    }));
  }, [pivot]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bog-paper">
      <ModuleWorkspace
        label="Analysis"
        title="Data Studio"
        description="Ribbon-style commands and cross-tab summaries built for finance & operations — familiar power without mimicking any spreadsheet product’s look or code."
        actions={null}
      >
        <div className="-mx-4 -mt-2 border-t border-bog-rule lg:-mx-8">
          <DataStudioRibbon
            activeTab={ribbonTab}
            onTabChange={setRibbonTab}
            onExportCsv={exportCsv}
            onResetLayout={resetLayout}
            crossTabMode={crossTabMode}
            onToggleCrossTab={() => setCrossTabMode((x) => !x)}
            showChart={showChart}
            onToggleChart={() => setShowChart((x) => !x)}
            freezeHeader={freezeHeader}
            onToggleFreeze={() => setFreezeHeader((x) => !x)}
            highlightExtremes={highlightExtremes}
            onToggleHighlight={() => setHighlightExtremes((x) => !x)}
            cellStyleGallery={
              <CellStyleGallery
                applyTarget={cellStyles.applyTarget}
                onApplyTargetChange={cellStyles.setApplyTarget}
                onPickStyle={cellStyles.applyToSelection}
                onClearAll={cellStyles.clearAll}
                hasSelection={cellStyles.hasSelection}
                disabled={crossTabMode}
              />
            }
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-4">
          <div className="space-y-4 xl:col-span-1">
            <label className="block text-xs font-medium text-zinc-500">
              Dataset
              <select
                value={dataset.id}
                onChange={(e) => {
                  const d = SAMPLE_DATASETS.find((x) => x.id === e.target.value);
                  if (d) setDataset(d);
                }}
                className="mt-1 w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink"
              >
                {SAMPLE_DATASETS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-relaxed text-zinc-500">{dataset.description}</p>

            <div className="rounded-lg border border-bog-rule bg-bog-sheet/50 p-3 text-xs text-zinc-600">
              <strong className="text-bog-ink">Included tools (BOG implementations):</strong>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Cross-tab summaries (pivot-class)</li>
                <li>Column filters (multi-select)</li>
                <li>Sort facts by column</li>
                <li>Column/bar chart from row totals</li>
                <li>CSV export for sharing</li>
                <li>Pin header row · highlight column peaks</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 xl:col-span-3">
            <section className="bog-statement-card p-4">
              <h3 className="text-sm font-semibold text-bog-ink">Slice facts</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Narrow rows before summarizing — same idea as filter controls in desktop worksheets.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {textCols.slice(0, 4).map((col) => (
                  <div key={col.key}>
                    <p className="text-[10px] font-semibold uppercase text-zinc-400">{col.label}</p>
                    <div className="mt-1 flex max-h-28 flex-wrap gap-1 overflow-y-auto rounded-md border border-bog-rule bg-white p-2">
                      {distinctValues(dataset.rows, col.key).map((v) => {
                        const on = (filters[col.key] ?? []).includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleFilterValue(col.key, v)}
                            className={`rounded-full px-2 py-0.5 text-[11px] ${
                              on
                                ? 'bg-bog-ink text-white'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {!crossTabMode && (
              <section className="bog-statement-card p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs text-zinc-500">
                    Sort by
                    <select
                      value={sortCol}
                      onChange={(e) => setSortCol(e.target.value)}
                      className="mt-1 block rounded-lg border border-bog-rule px-3 py-2 text-sm"
                    >
                      {dataset.columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-500">
                    Direction
                    <select
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                      className="mt-1 block rounded-lg border border-bog-rule px-3 py-2 text-sm"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  <strong>Cell styles:</strong> open the <strong>Sheet view</strong> ribbon tab → pick Good, Bad,
                  Neutral, etc. Click a row or cell first, then apply.
                </p>
                <div className={`mt-4 overflow-auto ${ledgerTableShell}`}>
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className={freezeHeader ? 'sticky top-0 z-10 bg-white shadow-sm' : ''}>
                      <tr className={ledgerHeadRow}>
                        {dataset.columns.map((c) => (
                          <th key={c.key} className={c.type === 'number' ? ledgerThR : ledgerThL}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFlat.map((r, i) => {
                        const rowKey = `${i}`;
                        return (
                          <tr
                            key={i}
                            className={cn(
                              ledgerRow,
                              cellStyles.classForCell(rowKey),
                              cellStyles.isSelected(rowKey) && !cellStyles.selection?.colKey && 'ring-1 ring-inset ring-[hsl(var(--bog-accent))]/40'
                            )}
                            onClick={() => cellStyles.setSelection({ rowKey })}
                          >
                            {dataset.columns.map((c) => (
                              <td
                                key={c.key}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cellStyles.setSelection({ rowKey, colKey: c.key });
                                }}
                                className={cn(
                                  'px-4 py-2 cursor-cell',
                                  c.type === 'number' ? `text-right ${ledgerTdNum}` : '',
                                  cellStyles.classForCell(rowKey, c.key),
                                  cellStyles.isSelected(rowKey, c.key) && 'bog-cell-selected'
                                )}
                              >
                                {String(r[c.key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {crossTabMode && (
              <p className="rounded-lg border border-bog-rule bg-bog-sheet/50 px-4 py-2 text-xs text-zinc-600">
                Turn off <strong>Cross-tab</strong> (Summarize tab) to format individual fact rows with cell styles.
              </p>
            )}

            {crossTabMode && pivot && filteredRows.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No rows match the current filters. Clear chip selections or pick another dataset.
              </p>
            )}

            {crossTabMode && pivot && filteredRows.length > 0 && (
              <>
                <section className="bog-statement-card p-4">
                  <h3 className="text-sm font-semibold text-bog-ink">Cross-tab summary</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs text-zinc-500">
                      Rows
                      <select
                        value={rowDim}
                        onChange={(e) => setRowDim(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                      >
                        {textCols.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-zinc-500">
                      Columns
                      <select
                        value={colDim}
                        onChange={(e) => setColDim(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                      >
                        {textCols.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-zinc-500">
                      Values
                      <select
                        value={valueDim}
                        onChange={(e) => setValueDim(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                      >
                        {numberCols.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-zinc-500">
                      Aggregation
                      <select
                        value={agg}
                        onChange={(e) => setAgg(e.target.value as AggregationKind)}
                        className="mt-1 block w-full rounded-lg border border-bog-rule px-3 py-2 text-sm"
                      >
                        <option value="sum">Sum</option>
                        <option value="count">Count</option>
                        <option value="avg">Average</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 overflow-auto">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                      <thead className={freezeHeader ? 'sticky top-0 z-10 bg-white' : ''}>
                        <tr className={ledgerHeadRow}>
                          <th className={`${ledgerThL} bg-zinc-50`}>{textCols.find((c) => c.key === rowDim)?.label}</th>
                          {pivot.columnKeys.map((ck) => (
                            <th key={ck} className={`${ledgerThR} min-w-[88px] bg-zinc-50 font-figures`}>
                              {ck}
                            </th>
                          ))}
                          <th className={`${ledgerThR} bg-bog-sheet font-figures`}>Row total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pivot.rowKeys.map((rk, ri) => (
                          <tr key={rk} className={ledgerRow}>
                            <td className="border-b border-bog-rule px-3 py-2 font-medium text-bog-ink">{rk}</td>
                            {pivot.columnKeys.map((_, ci) => {
                              const v = pivot.cells[ri][ci];
                              const isMax = highlightExtremes && maxPerCol[ci] > 0 && v === maxPerCol[ci];
                              return (
                                <td
                                  key={ci}
                                  className={`border-b border-bog-rule px-3 py-2 text-right font-figures ${ledgerTdNum} ${
                                    isMax ? 'bg-emerald-50 font-semibold text-emerald-900' : ''
                                  }`}
                                >
                                  {v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                              );
                            })}
                            <td className="border-b border-bog-rule bg-bog-sheet/60 px-3 py-2 text-right font-figures font-semibold">
                              {pivot.rowTotals[ri].toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-zinc-100 font-semibold">
                          <td className="border-t-2 border-bog-rule px-3 py-2 text-bog-ink">Column totals</td>
                          {pivot.columnTotals.map((ct, ci) => (
                            <td key={ci} className={`border-t-2 border-bog-rule px-3 py-2 text-right font-figures ${ledgerTdNum}`}>
                              {ct.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                          ))}
                          <td className="border-t-2 border-bog-rule px-3 py-2 text-right font-figures text-[hsl(var(--bog-accent))]">
                            {pivot.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {showChart && chartPoints.length > 0 && (
                  <section className="bog-statement-card p-4">
                    <h3 className="text-sm font-semibold text-bog-ink">Chart · row totals</h3>
                    <div className="mt-4 h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartPoints} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => value.toLocaleString()}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.full ?? ''
                            }
                          />
                          <Bar dataKey="total" fill="#27272a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </ModuleWorkspace>
    </div>
  );
}
