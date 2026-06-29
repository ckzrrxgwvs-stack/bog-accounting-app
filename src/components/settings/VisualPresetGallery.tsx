import { Check, LayoutTemplate, Palette, TableProperties } from 'lucide-react';
import { useVisualPresets } from '@/context/VisualPresetContext';
import {
  BOG_GRAPHIC_STYLES,
  BOG_LAYOUT_TEMPLATES,
  BOG_VISUAL_THEMES,
} from '@/lib/visualPresets';

function ThemeCard({
  active,
  name,
  tagline,
  kind,
  preview,
  onSelect,
}: {
  active: boolean;
  name: string;
  tagline: string;
  kind: 'theme' | 'skin';
  preview: { paper: string; ink: string; accent: string; sidebar: string };
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex w-full flex-col overflow-hidden rounded-xl border text-left transition-all ${
        active
          ? 'border-[hsl(var(--bog-accent))] ring-2 ring-[hsl(var(--bog-accent))]/25'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex h-16">
        <span className="w-1/4" style={{ backgroundColor: preview.sidebar }} aria-hidden />
        <span className="flex w-3/4 flex-col">
          <span className="h-1/2" style={{ backgroundColor: preview.paper }} aria-hidden />
          <span className="h-1/2" style={{ backgroundColor: preview.accent }} aria-hidden />
        </span>
      </div>
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-black">{name}</p>
            <p className="mt-0.5 text-xs text-gray-500">{tagline}</p>
          </div>
          {active && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white">
              <Check size={12} />
            </span>
          )}
        </div>
        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          {kind === 'skin' ? 'Skin' : 'Theme'}
        </span>
      </div>
    </button>
  );
}

function OptionChip({
  active,
  label,
  description,
  onSelect,
}: {
  active: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active ? 'border-black bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-black">{label}</p>
        {active && <Check size={14} className="shrink-0 text-black" />}
      </div>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </button>
  );
}

/** Settings gallery: themes, layout templates, and graphic (cell) styles. */
export function VisualPresetGallery() {
  const presets = useVisualPresets();

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Palette size={18} className="text-gray-700" />
          <div>
            <h3 className="font-semibold text-black">Themes &amp; skins</h3>
            <p className="text-sm text-gray-500">
              Like an Office theme — one click swaps colors, accents, and cube neon across the whole program.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOG_VISUAL_THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              active={presets.themeId === theme.id}
              name={theme.name}
              tagline={theme.tagline}
              kind={theme.kind}
              preview={theme.preview}
              onSelect={() => presets.setThemeId(theme.id)}
            />
          ))}
        </div>
        {presets.fixedNeon ? (
          <p className="mt-3 text-xs text-gray-500">
            This theme locks the cube neon to match its palette. Choose <strong>Ledger Classic</strong> to restore
            live color rotation every 30 minutes.
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            Ledger Classic uses the live cube palette — neon colors rotate on a timer and sync to accent lines.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <LayoutTemplate size={18} className="text-gray-700" />
          <div>
            <h3 className="font-semibold text-black">Layout templates</h3>
            <p className="text-sm text-gray-500">
              Ready-made workspace density — like picking a spreadsheet layout preset.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {BOG_LAYOUT_TEMPLATES.map((tpl) => (
            <OptionChip
              key={tpl.id}
              active={presets.layoutId === tpl.id}
              label={tpl.name}
              description={tpl.description}
              onSelect={() => presets.setLayoutId(tpl.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <TableProperties size={18} className="text-gray-700" />
          <div>
            <h3 className="font-semibold text-black">Graphic styles</h3>
            <p className="text-sm text-gray-500">
              Reusable statement-block presets — borders, fills, and keylines on cards and totals.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {BOG_GRAPHIC_STYLES.map((style) => (
            <OptionChip
              key={style.id}
              active={presets.graphicStyleId === style.id}
              label={style.name}
              description={style.description}
              onSelect={() => presets.setGraphicStyleId(style.id)}
            />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={presets.resetVisualPresets}
        className="text-sm font-medium text-gray-600 underline hover:text-black"
      >
        Reset themes &amp; templates to defaults
      </button>
    </div>
  );
}
