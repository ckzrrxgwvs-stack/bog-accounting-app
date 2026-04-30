import React from 'react';

type ModuleWorkspaceProps = {
  label: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Shared shell for GL / AP / AR / Reports — matches Dashboard “ledger workspace” rhythm */
export function ModuleWorkspace({ label, title, description, actions, children }: ModuleWorkspaceProps) {
  return (
    <div className="bog-workspace border-b border-bog-rule">
      <div className="border-b border-bog-rule bg-white/85 px-6 py-6 backdrop-blur-sm lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="bog-section-label mb-2">{label}</p>
            <h1 className="text-2xl font-bold tracking-tight text-bog-ink lg:text-3xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-zinc-600">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
      <div className="p-6 lg:p-8">{children}</div>
    </div>
  );
}

export const ledgerTableShell = 'bog-statement-card overflow-hidden';
export const ledgerHeadRow = 'border-b border-bog-rule bg-bog-sheet';
export const ledgerThL =
  'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500';
export const ledgerThR =
  'px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500';
export const ledgerThC =
  'px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500';
export const ledgerTdNum = 'font-figures tabular-nums text-sm text-bog-ink';
export const ledgerRow = 'border-b border-bog-rule/80 transition-colors hover:bg-bog-sheet/60';
export const ledgerBodyDivide = 'divide-y divide-bog-rule';
