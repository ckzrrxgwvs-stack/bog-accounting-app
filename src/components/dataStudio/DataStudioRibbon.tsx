/**
 * Command ribbon — familiar “menu strip” ergonomics without copying any vendor UI.
 * BOG ink / sheet metaphors; not a spreadsheet clone.
 */
import React from 'react';
import {
  Download,
  RotateCcw,
  Grid3x3,
  BarChart3,
  Rows,
  Eye,
  Highlighter,
  TableProperties,
} from 'lucide-react';

export type RibbonTabId = 'start' | 'summarize' | 'visualize' | 'sheet';

type Props = {
  activeTab: RibbonTabId;
  onTabChange: (t: RibbonTabId) => void;
  onExportCsv: () => void;
  onResetLayout: () => void;
  crossTabMode: boolean;
  onToggleCrossTab: () => void;
  showChart: boolean;
  onToggleChart: () => void;
  freezeHeader: boolean;
  onToggleFreeze: () => void;
  highlightExtremes: boolean;
  onToggleHighlight: () => void;
};

const tabs: { id: RibbonTabId; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'visualize', label: 'Visualize' },
  { id: 'sheet', label: 'Sheet view' },
];

export function DataStudioRibbon({
  activeTab,
  onTabChange,
  onExportCsv,
  onResetLayout,
  crossTabMode,
  onToggleCrossTab,
  showChart,
  onToggleChart,
  freezeHeader,
  onToggleFreeze,
  highlightExtremes,
  onToggleHighlight,
}: Props) {
  return (
    <div className="border-b border-bog-rule bg-white shadow-sm">
      <div className="flex items-end gap-1 border-b border-zinc-100 px-2 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-bog-sheet text-bog-ink ring-1 ring-bog-rule'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-bog-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-[52px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        {activeTab === 'start' && (
          <>
            <RibbonGroup label="Arrange">
              <RibbonBtn icon={<Download size={16} />} label="Export CSV" onClick={onExportCsv} />
              <RibbonBtn icon={<RotateCcw size={16} />} label="Reset layout" onClick={onResetLayout} />
            </RibbonGroup>
          </>
        )}

        {activeTab === 'summarize' && (
          <RibbonGroup label="Facts → summary">
              <RibbonBtn
                icon={<Grid3x3 size={16} />}
                label={crossTabMode ? 'Cross-tab on' : 'Cross-tab off'}
                onClick={onToggleCrossTab}
                active={crossTabMode}
              />
              <RibbonBtn
                icon={<TableProperties size={16} />}
                label="Cross-tab is row × column × measure"
                onClick={() => {}}
                disabled
              />
          </RibbonGroup>
        )}

        {activeTab === 'visualize' && (
          <RibbonGroup label="Charts">
            <RibbonBtn
              icon={<BarChart3 size={16} />}
              label={showChart ? 'Hide chart' : 'Show chart'}
              onClick={onToggleChart}
              active={showChart}
            />
          </RibbonGroup>
        )}

        {activeTab === 'sheet' && (
          <RibbonGroup label="Reading layout">
            <RibbonBtn
              icon={<Rows size={16} />}
              label={freezeHeader ? 'Pinned header on' : 'Pin header row'}
              onClick={onToggleFreeze}
              active={freezeHeader}
            />
            <RibbonBtn
              icon={<Highlighter size={16} />}
              label={highlightExtremes ? 'Heat hints on' : 'Highlight extremes'}
              onClick={onToggleHighlight}
              active={highlightExtremes}
            />
            <RibbonBtn icon={<Eye size={16} />} label="Comfort read mode" onClick={() => {}} disabled />
          </RibbonGroup>
        )}
      </div>
    </div>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-r border-bog-rule pr-6 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function RibbonBtn({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`flex max-w-[104px] flex-col items-center rounded-md px-2 py-1.5 text-center transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : active
            ? 'bg-[hsl(var(--bog-accent))]/15 text-bog-ink ring-1 ring-[hsl(var(--bog-accent))]/30'
            : 'hover:bg-bog-sheet text-zinc-700'
      }`}
    >
      <span className="text-bog-ink">{icon}</span>
      <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight">{label}</span>
    </button>
  );
}
