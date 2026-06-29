# Per-table cell styles — follow-on scope

**Status:** Scoped (not built). Owner request — Excel-style **Good / Bad / Neutral** (and related) cell styles applied **per cell, row, or column** inside **Data Studio** and the **General Ledger**, not just workspace-wide theme/format toggles.

**Related (already shipped):** `Settings → Display & themes` — Office themes, layout templates, graphic styles, grid row/column lines, workspace align/B/U, customizable sidebar menu (`cell-01` precursor).

**Log ID:** `cell-01` (2026-06-29)

---

## 1. Problem & intent

Workspace-level controls (themes, graphic styles, align left/center/right) change the **whole program**. Accountants also need **local** formatting on specific figures — variance over budget (Bad), within tolerance (Good), pending review (Neutral), subtotals (Total), manual input rows (Input) — exactly like Excel’s **Cell Styles** gallery.

This follow-on adds a **reusable cell-style system** that:

1. Works on real `<table>` surfaces (Ledger journal list, Data Studio flat grid & cross-tab).
2. Respects active BOG theme / graphic style (tinted fills derive from `--bog-accent`, semantic greens/ambers/reds).
3. Can be applied manually (ribbon picker) and optionally by **rules** later (e.g. negative amount → Bad).

---

## 2. Excel analogy → BOG mapping

| Excel | BOG follow-on |
|-------|----------------|
| Cell Styles gallery (Good, Bad, Neutral, …) | **`BogCellStyle` preset catalog** + ribbon dropdown |
| Apply to selection | Apply to **cell**, **row**, or **column** (phase 1: row + single cell) |
| Style = font + fill + border | CSS class bundle: `bog-cell-good`, `bog-cell-bad`, … |
| Theme-aware tints | Presets use semantic tokens that adapt under `data-theme` / `data-graphic-style` |
| Conditional formatting | **Phase 2** — rule engine on numeric columns |

---

## 3. Preset catalog (v1)

| Id | Label | Visual intent | Typical use |
|----|-------|---------------|-------------|
| `normal` | Normal | Default (no extra class) | Clear formatting |
| `good` | Good | Soft green fill + dark green text | On budget, balanced JE, cleared status |
| `bad` | Bad | Soft red fill + dark red text | Over budget, out of balance, failed validation |
| `neutral` | Neutral | Soft amber/yellow fill | Pending, draft, needs review |
| `input` | Input | White fill + accent left border | Editable / manual entry row |
| `total` | Total | Top double rule + semibold + sheet background | Subtotals, row totals, pivot totals |
| `heading` | Heading | Bold + muted fill spanning semantic “header” rows | Section breaks in Data Studio exports |
| `note` | Note | Italic + subtle gray fill | Footnotes, memo lines |

All presets must pass **WCAG AA** on `--bog-paper` and **Midnight Audit** skin.

---

## 4. Architecture (recommended)

### 4.1 Shared library — `src/lib/cellStyles.ts`

```typescript
export type BogCellStyleId = 'normal' | 'good' | 'bad' | 'neutral' | 'input' | 'total' | 'heading' | 'note';

export type CellStyleTarget = 'cell' | 'row' | 'column';

export type CellStyleRef = {
  tableId: string;       // e.g. 'ledger-entries', 'data-studio-flat', 'data-studio-pivot'
  rowKey: string;        // stable row id or index string
  colKey?: string;       // omit = whole row
  styleId: BogCellStyleId;
};
```

- **`cellStyleClass(styleId)`** → Tailwind/CSS class string.
- **`BOG_CELL_STYLES`** — metadata for ribbon UI (label, swatch color, description).

### 4.2 CSS — `index.css` under `@layer components`

```css
.bog-cell-good { background: hsl(142 40% 92%); color: hsl(142 45% 22%); }
.bog-cell-bad  { background: hsl(0 45% 94%); color: hsl(0 55% 28%); }
/* … theme-aware overrides under html[data-theme='midnight-audit'] … */
```

Graphic style `high-contrast` bumps border weight on `total` / `input`.

### 4.3 Persistence — `CellStyleStore`

| Surface | Persist? | Storage | Notes |
|---------|----------|---------|-------|
| Data Studio (sample datasets) | Yes | `localStorage` `bog-cell-styles-v1` | Per `datasetId` + `tableId` |
| Ledger (live API rows) | Phase 2 | Optional `JournalEntryStyle` Prisma model or JSON metadata on entry | Requires backend + Human approval |
| Cross-tab pivot cells | Yes | Same localStorage | Key = `rowKey|colKey` |

Phase 1: **client-only** overlays (no ledger DB writes) so QA can ship fast.

### 4.4 UI components

| Component | Location | Role |
|-----------|----------|------|
| `CellStyleGallery` | Ribbon strip (dropdown) | Swatch grid like Excel Styles |
| `CellStylePicker` | Context on selected row/cell | Apply / clear |
| `useCellStyles(tableId)` | Hook | Read/write `CellStyleRef[]`, resolve class for `(rowKey, colKey)` |

### 4.5 Table integration points (existing code)

| File | Table | `tableId` |
|------|-------|-----------|
| `src/pages/Ledger.tsx` | Journal entry list | `ledger-entries` |
| `src/pages/DataStudio.tsx` | Flat fact grid | `data-studio-flat` |
| `src/pages/DataStudio.tsx` | Cross-tab matrix | `data-studio-pivot` |

**Hook pattern:**

```tsx
const { classForCell, applyStyle, selection } = useCellStyles('ledger-entries');
// …
<tr className={cn(ledgerRow, classForCell(entry.id))}>
```

Selection: click row to select; Shift+click multi (phase 1.1); column header menu (phase 1.2).

---

## 5. Data Studio — ribbon placement

Extend **`DataStudioRibbon`** tab **`Sheet view`** (already exists):

```
[ Cell styles ▼ ]  Good | Bad | Neutral | …
[ Clear style ]    Apply to: Row | Cell | Column
```

Wire to `highlightExtremes` concept — optional auto-**Bad** on column max, auto-**Good** on min (keep as toggle, rename “Highlight peaks” → “Auto Good/Bad extremes” in phase 1.1).

---

## 6. Ledger — placement

**Phase 1 (read-only overlay):** Styles stored in localStorage keyed by `entry.id` — president/controller can mark rows for review without changing GL data.

**Phase 2 (durable):** Optional `styleTags: string[]` on journal entry API for team-visible markers (draft review, audit flag).

Ledger toolbar (above table): compact **Styles** dropdown matching Data Studio — same component, different `tableId`.

---

## 7. Phased delivery

| Milestone | Scope | Gate |
|-----------|-------|------|
| **M1 — Data Studio** | Preset catalog + CSS + `useCellStyles` + ribbon gallery; apply to flat grid rows/cells; localStorage | `@qa_engineer` |
| **M1.1 — Pivot + extremes** | Cross-tab cells; auto Good/Bad on min/max toggle | QA |
| **M2 — Ledger overlay** | Same picker on `Ledger.tsx`; localStorage by entry id | QA |
| **M3 — Conditional rules** | “If amount &lt; 0 → Bad”, “If status = DRAFT → Neutral” UI in Data Studio | `@technical_lead` sign-off |
| **M4 — Server persistence (optional)** | Prisma/API for ledger style tags; sync across devices | Human approval |

Each milestone: `@technical_lead` architecture check → build → `@qa` → Human deploy approval.

---

## 8. Crew routing

| Phase | Lead | Supporting |
|-------|------|------------|
| Scope (this doc) | GH / `@manager` | `@aesthetics_agent` (swatch design), `@systems_engineering_agent` (persistence) |
| M1 implementation | `@senior_frontend_engineer` [7] | `@aesthetics_agent` (preset visuals) |
| M3 rules engine | `@startup_backend_architect` [6] | `@systems_engineering_agent` |
| M4 API | `@systems_engineering_agent` | `@security_auditor` [9] |
| QA | `@qa_engineer` | all |

---

## 9. Decisions for Human (before M1 code)

1. **Phase 1 localStorage only** for Ledger — acceptable, or wait until server persistence?
2. **Preset set** — approve Good/Bad/Neutral/Input/Total/Heading/Note, or add Mexico-specific (e.g. CFDI pending)?
3. **Apply scope default** — row vs cell when user picks a style?
4. **Priority surface** — Data Studio first (recommended) or Ledger first?
5. **Conditional formatting in M3** — which columns/rules matter most (amount sign, status, due date)?

---

## 10. Out of scope (v1)

- Full spreadsheet cell editor (BOG is not Excel).
- Per-user style sharing across tenants (until M4).
- Pi Academy practice tables (separate `[data-surface="academy"]` tokens — later `cell-02`).

---

## Log

- `cell-01` (2026-06-29) ✅ Follow-on scoped from owner request (Good/Bad/Neutral per-table). Precursor: workspace themes + graphic styles + grid/menu customization shipped.
- `cell-02` (2026-06-29) ✅ **M1 shipped:** Data Studio flat grid — `cellStyles.ts`, `useCellStyles`, `CellStyleGallery` on Sheet view ribbon; Good/Bad/Neutral/Input/Total/Heading/Note; row/cell apply; localStorage per dataset. **Next:** M1.1 pivot cells + M2 Ledger overlay.
