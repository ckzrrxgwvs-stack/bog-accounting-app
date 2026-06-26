import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Building2, ChevronDown, LayoutGrid, Plus } from 'lucide-react';

export const PORTFOLIO_WORKSPACE_ID = '__portfolio__';

export type Workspace = {
  id: string;
  bookId?: string;
  label: string;
  companyId: string;
  kind: 'commerce' | 'investment' | 'project' | 'portfolio';
  apiBook?: string;
  ledgerKey?: 'commerce' | 'personal' | 'agentic';
};

type Ctx = {
  workspaces: Workspace[];
  activeId: string;
  canViewPortfolio: boolean;
  portfolioCompanyName: string;
  setActiveId: (id: string) => void;
  reload: () => Promise<void>;
};

const STORAGE_KEY = 'bog-active-workspace';
const BusinessWorkspaceContext = createContext<Ctx | null>(null);

const KIND_LABEL: Record<Workspace['kind'], string> = {
  commerce: 'Operating',
  investment: 'Investment',
  project: 'Project',
  portfolio: 'Rollup',
};

export function BusinessWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [canViewPortfolio, setCanViewPortfolio] = useState(false);
  const [portfolioCompanyName, setPortfolioCompanyName] = useState('Portfolio');
  const [activeId, setActiveIdState] = useState(() => localStorage.getItem(STORAGE_KEY) ?? 'commerce');

  const reload = useCallback(async () => {
    const res = await api.getBusinessWorkspaces();
    if (!res.success || !res.data) return;
    const d = res.data;
    const bookWorkspaces: Workspace[] = d.workspaces.map((w) => ({
      ...w,
      kind: w.kind,
    }));
    setWorkspaces(bookWorkspaces);
    setCanViewPortfolio(Boolean(d.canViewPortfolio));
    setPortfolioCompanyName(d.commerceCompanyName);
    if (!bookWorkspaces.some((w) => w.id === activeId) && activeId !== PORTFOLIO_WORKSPACE_ID) {
      setActiveIdState(bookWorkspaces[0]?.id ?? 'commerce');
    }
  }, [activeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo(
    () => ({ workspaces, activeId, canViewPortfolio, portfolioCompanyName, setActiveId, reload }),
    [workspaces, activeId, canViewPortfolio, portfolioCompanyName, setActiveId, reload]
  );

  return <BusinessWorkspaceContext.Provider value={value}>{children}</BusinessWorkspaceContext.Provider>;
}

export function useBusinessWorkspace() {
  const ctx = useContext(BusinessWorkspaceContext);
  if (!ctx) throw new Error('useBusinessWorkspace requires provider');
  return ctx;
}

function BookPill({
  active,
  label,
  kind,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  kind: Workspace['kind'];
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-[10.5rem] max-w-[15.5rem] flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-center transition-all ${
        active
          ? 'border-[hsl(var(--bog-accent))] bg-[hsl(var(--bog-accent-muted))] shadow-sm ring-1 ring-[hsl(var(--bog-accent))]/25'
          : 'border-bog-rule bg-white text-bog-ink hover:border-[hsl(var(--bog-line-key))] hover:bg-bog-sheet hover:shadow-sm'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          active ? 'bg-white text-[hsl(var(--bog-accent))]' : 'bg-bog-sheet text-zinc-500 group-hover:text-zinc-700'
        }`}
      >
        {icon}
      </span>
      <span className={`w-full truncate text-sm font-semibold leading-tight ${active ? 'text-bog-ink' : 'text-zinc-800'}`}>
        {label}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{KIND_LABEL[kind]}</span>
    </button>
  );
}

export function BusinessWorkspaceSwitcher() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { workspaces, activeId, canViewPortfolio, portfolioCompanyName, setActiveId, reload } =
    useBusinessWorkspace();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const isPresident = user?.role === 'PRESIDENT';
  const isCfo = user?.role === 'CFO';
  const active =
    activeId === PORTFOLIO_WORKSPACE_ID
      ? { label: 'Portfolio overview', kind: 'portfolio' as const }
      : workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const activeBookLabel = active?.label ?? 'Book';
  const activeKind = active?.kind ?? 'commerce';

  const onSelect = (w: Workspace | { id: string; ledgerKey?: Workspace['ledgerKey'] }) => {
    setActiveId(w.id);
    setOpen(false);
    setAdding(false);
    if (w.id === PORTFOLIO_WORKSPACE_ID) {
      navigate('/');
      return;
    }
    const book = workspaces.find((x) => x.id === w.id);
    if (book?.ledgerKey && book.ledgerKey !== 'commerce') {
      navigate(`/ledger/coa?ledger=${book.ledgerKey}`);
    } else {
      navigate('/');
    }
  };

  const submitNewProject = async () => {
    if (!newProjectName.trim()) return;
    setAddBusy(true);
    setAddError(null);
    const res = await api.createPortfolioProjectBook(newProjectName.trim());
    setAddBusy(false);
    if (!res.success) {
      setAddError(res.error ?? 'Could not create project');
      return;
    }
    setNewProjectName('');
    setAdding(false);
    await reload();
    const book = res.data?.book;
    if (book?.slug) onSelect({ id: book.slug });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setAdding(false);
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex w-full max-w-3xl flex-col items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`flex flex-col items-center rounded-xl px-4 py-1.5 text-center transition-colors ${
          open ? 'bg-bog-sheet' : 'hover:bg-bog-sheet/80'
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {portfolioCompanyName}
        </span>
        <span className="mt-0.5 flex max-w-[min(100vw-6rem,20rem)] items-center gap-1.5">
          {activeId === PORTFOLIO_WORKSPACE_ID ? (
            <LayoutGrid size={15} className="shrink-0 text-[hsl(var(--bog-accent))]" />
          ) : (
            <Building2 size={15} className="shrink-0 text-[hsl(var(--bog-accent))]" />
          )}
          <span className="truncate text-sm font-semibold text-bog-ink">{activeBookLabel}</span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-zinc-400 sm:inline">
            · {KIND_LABEL[activeKind]}
          </span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-[min(calc(100vw-1.5rem),52rem)] -translate-x-1/2 rounded-2xl border border-bog-rule bg-white p-5 shadow-lg shadow-bog-ink/10 ring-1 ring-black/[0.04]"
        >
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Switch portfolio book
          </p>

          <div className="flex flex-wrap items-stretch justify-center gap-3">
            {canViewPortfolio && (
              <BookPill
                active={activeId === PORTFOLIO_WORKSPACE_ID}
                label="Portfolio overview"
                kind="portfolio"
                icon={<LayoutGrid size={18} />}
                onClick={() => onSelect({ id: PORTFOLIO_WORKSPACE_ID })}
              />
            )}
            {workspaces.map((w) => (
              <BookPill
                key={w.id}
                active={w.id === activeId}
                label={w.label}
                kind={w.kind}
                icon={<Building2 size={18} />}
                onClick={() => onSelect(w)}
              />
            ))}
            {(isPresident || isCfo) && !adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex min-w-[10.5rem] max-w-[15.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-bog-sheet/50 px-4 py-3 text-center text-zinc-500 transition-colors hover:border-[hsl(var(--bog-accent))] hover:bg-[hsl(var(--bog-accent-muted))]/40 hover:text-[hsl(var(--bog-accent))]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                  <Plus size={18} />
                </span>
                <span className="text-sm font-semibold">Add project</span>
              </button>
            )}
          </div>

          {(isPresident || isCfo) && adding && (
            <div className="mt-4 rounded-xl border border-bog-rule bg-bog-sheet/60 p-3">
              <p className="mb-2 text-center text-xs font-medium text-zinc-600">New project book</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink placeholder:text-zinc-400 focus:border-[hsl(var(--bog-accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/20"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitNewProject();
                  }}
                  autoFocus
                />
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={addBusy}
                    onClick={() => void submitNewProject()}
                    className="rounded-lg bg-bog-ink px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {addBusy ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setAddError(null);
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-white hover:text-bog-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {addError ? <p className="mt-2 text-center text-xs text-red-600">{addError}</p> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
