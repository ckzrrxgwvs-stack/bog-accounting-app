import { ChevronDown, Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BOG_CELL_STYLES, type BogCellStyleId, type CellStyleApplyTarget } from '@/lib/cellStyles';

type Props = {
  applyTarget: CellStyleApplyTarget;
  onApplyTargetChange: (t: CellStyleApplyTarget) => void;
  onPickStyle: (id: BogCellStyleId) => void;
  onClearAll: () => void;
  hasSelection: boolean;
  disabled?: boolean;
};

/** Ribbon dropdown — Excel-style cell styles gallery. */
export function CellStyleGallery({
  applyTarget,
  onApplyTargetChange,
  onPickStyle,
  onClearAll,
  hasSelection,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Apply to</span>
        <div className="flex rounded-md border border-bog-rule bg-white p-0.5 text-[11px]">
          {(['row', 'cell'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onApplyTargetChange(t)}
              className={`rounded px-2 py-1 capitalize ${
                applyTarget === t ? 'bg-bog-ink text-white' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Cell styles</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md border border-bog-rule bg-white px-2 py-1.5 text-xs font-medium text-bog-ink hover:bg-bog-sheet disabled:opacity-40"
        >
          Styles
          <ChevronDown size={14} />
        </button>
      </div>

      <button
        type="button"
        title="Clear all cell styles in this table"
        onClick={onClearAll}
        className="mb-0.5 flex items-center gap-1 rounded-md border border-bog-rule px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-50"
      >
        <Eraser size={14} />
        Clear all
      </button>

      {!hasSelection && (
        <p className="mb-1 text-[10px] text-amber-700">Click a row or cell in the table first.</p>
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-bog-rule bg-white p-3 shadow-lg">
          <p className="mb-2 text-[11px] text-zinc-500">
            Pick a style — applies to the {applyTarget === 'cell' ? 'selected cell' : 'whole row'}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BOG_CELL_STYLES.filter((s) => s.id !== 'normal').map((style) => (
              <button
                key={style.id}
                type="button"
                disabled={!hasSelection}
                title={style.description}
                onClick={() => {
                  onPickStyle(style.id);
                  setOpen(false);
                }}
                className={`rounded-md border px-2 py-2 text-left text-xs font-semibold transition-opacity ${
                  style.className
                } ${!hasSelection ? 'cursor-not-allowed opacity-40' : 'hover:ring-2 hover:ring-bog-ink/20'}`}
                style={{
                  backgroundColor: style.swatch.bg,
                  color: style.swatch.text,
                  borderColor: style.swatch.border ?? style.swatch.bg,
                }}
              >
                {style.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => {
              onPickStyle('normal');
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border border-bog-rule py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Normal (clear)
          </button>
        </div>
      )}
    </div>
  );
}
