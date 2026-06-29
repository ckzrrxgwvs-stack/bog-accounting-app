import type { ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Grid3x3,
  Rows3,
  Columns3,
  Underline,
} from 'lucide-react';
import { useVisualPresets } from '@/context/VisualPresetContext';
import { BOG_GRID_SIZES } from '@/lib/visualPresets';

function Toggle({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div>
        <p className="text-sm font-medium text-black">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`h-7 w-12 rounded-full transition-colors ${on ? 'bg-black' : 'bg-gray-300'}`}
        aria-pressed={on}
      >
        <div className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function FormatBtn({
  active,
  label,
  title,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
        active ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

/** Grid lines, column/row rules, and Excel-style align / B / U toolbar. */
export function WorkspaceGridPanel() {
  const { grid, textFormat, setGrid, setTextFormat } = useVisualPresets();

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Grid3x3 size={18} className="text-gray-700" />
          <div>
            <h3 className="font-semibold text-black">Grid lines &amp; columns</h3>
            <p className="text-sm text-gray-500">
              Spreadsheet-style ruled paper — turn row lines, column lines, and cell size on or off independently.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Toggle
            label="Row lines"
            desc="Horizontal rules — like ledger rows."
            on={grid.showRowLines}
            onToggle={() => setGrid({ showRowLines: !grid.showRowLines })}
          />
          <Toggle
            label="Column lines"
            desc="Vertical guides — like spreadsheet columns."
            on={grid.showColumnLines}
            onToggle={() => setGrid({ showColumnLines: !grid.showColumnLines })}
          />
        </div>
        <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Cell size</p>
        <div className="flex flex-wrap gap-2">
          {BOG_GRID_SIZES.map((sz) => (
            <button
              key={sz.id}
              type="button"
              onClick={() => setGrid({ cellSize: sz.id })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                grid.cellSize === sz.id ? 'border-black bg-gray-50 font-medium' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sz.id === 'fine' ? <Rows3 size={14} /> : sz.id === 'wide' ? <Columns3 size={14} /> : <Grid3x3 size={14} />}
              {sz.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Tip: turn off <strong>Subtle workspace grid</strong> above for a completely clean field — or mix row-only /
          column-only rules here.
        </p>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="font-semibold text-black">Default text format</h3>
          <p className="text-sm text-gray-500">
            Workspace alignment and emphasis — like Excel&apos;s align left, center, <strong>B</strong>, and{' '}
            <u>U</u>.
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-2"
          role="toolbar"
          aria-label="Workspace text format"
        >
          <FormatBtn
            active={textFormat.align === 'left'}
            label="Align left"
            title="Align left"
            onClick={() => setTextFormat({ align: 'left' })}
          >
            <AlignLeft size={16} />
          </FormatBtn>
          <FormatBtn
            active={textFormat.align === 'center'}
            label="Align center"
            title="Align center"
            onClick={() => setTextFormat({ align: 'center' })}
          >
            <AlignCenter size={16} />
          </FormatBtn>
          <FormatBtn
            active={textFormat.align === 'right'}
            label="Align right"
            title="Align right"
            onClick={() => setTextFormat({ align: 'right' })}
          >
            <AlignRight size={16} />
          </FormatBtn>
          <span className="mx-1 h-6 w-px bg-gray-300" aria-hidden />
          <FormatBtn
            active={textFormat.bold}
            label="Bold"
            title="Bold"
            onClick={() => setTextFormat({ bold: !textFormat.bold })}
          >
            <Bold size={16} />
          </FormatBtn>
          <FormatBtn
            active={textFormat.underline}
            label="Underline"
            title="Underline"
            onClick={() => setTextFormat({ underline: !textFormat.underline })}
          >
            <Underline size={16} />
          </FormatBtn>
        </div>
      </section>
    </div>
  );
}
