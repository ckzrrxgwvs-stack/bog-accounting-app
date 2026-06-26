import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const isPresident = user?.role === 'PRESIDENT';
  const isCfo = user?.role === 'CFO';
  const active =
    activeId === PORTFOLIO_WORKSPACE_ID
      ? { label: `${portfolioCompanyName} — Portfolio`, kind: 'portfolio' as const }
      : workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const displayName = active?.label ?? portfolioCompanyName;

  const onSelect = (w: Workspace | { id: string; ledgerKey?: Workspace['ledgerKey'] }) => {
    setActiveId(w.id);
    setOpen(false);
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

  return (
    <div className="relative border-b border-white/10 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-left text-sm text-white hover:bg-white/10"
      >
        {activeId === PORTFOLIO_WORKSPACE_ID ? (
          <LayoutGrid size={16} className="shrink-0 text-[hsl(var(--bog-accent))]" />
        ) : (
          <Building2 size={16} className="shrink-0 text-[hsl(var(--bog-accent))]" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{displayName}</span>
        <ChevronDown size={16} className={`shrink-0 opacity-70 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-4 right-4 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-bog-sidebar-elevated py-1 shadow-xl">
          {canViewPortfolio && (
            <button
              type="button"
              onClick={() => onSelect({ id: PORTFOLIO_WORKSPACE_ID })}
              className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-white/10 ${
                activeId === PORTFOLIO_WORKSPACE_ID ? 'bg-white/[0.08] text-white' : 'text-zinc-300'
              }`}
            >
              <span className="truncate font-medium">{portfolioCompanyName} — Portfolio</span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">All authorized books</span>
            </button>
          )}
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w)}
              className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-white/10 ${
                w.id === activeId ? 'bg-white/[0.08] text-white' : 'text-zinc-300'
              }`}
            >
              <span className="truncate font-medium">{w.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {w.kind === 'investment' ? 'Investment book' : w.kind === 'project' ? 'Project book' : 'Operating business'}
              </span>
            </button>
          ))}
          {(isPresident || isCfo) && (
            <div className="border-t border-white/10 px-3 py-2">
              {adding ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white placeholder:text-zinc-500"
                    placeholder="New project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  {addError && <p className="text-xs text-red-300">{addError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={addBusy}
                      onClick={() => void submitNewProject()}
                      className="flex-1 rounded-md bg-white/10 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                    >
                      {addBusy ? 'Creating…' : 'Create book'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setAddError(null);
                      }}
                      className="rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-2 text-left text-sm text-sky-300 hover:text-sky-200"
                >
                  <Plus size={14} />
                  Add project book
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
