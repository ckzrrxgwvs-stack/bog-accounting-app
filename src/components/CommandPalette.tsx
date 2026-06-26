import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Settings,
  Landmark,
  Table2,
  FileSpreadsheet,
  Link2,
  Search,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, keywords: 'home kpi' },
  { label: 'General Ledger', href: '/ledger', icon: BookOpen, keywords: 'journal entries' },
  { label: 'Reports', href: '/reports', icon: BarChart3, keywords: 'financial statements' },
  { label: 'Data Studio', href: '/data-studio', icon: Table2, keywords: 'pivot analysis' },
  { label: 'Financial connections', href: '/integrations/financial', icon: Link2, keywords: 'bank plaid paypal' },
  { label: 'Microsoft Office hub', href: '/office', icon: FileSpreadsheet, keywords: 'excel word export import' },
  { label: 'Period close', href: '/ledger/period-close', icon: Landmark, keywords: 'close lock' },
  { label: 'Settings', href: '/settings', icon: Settings, keywords: 'company display comfort' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-bog-ink/30 p-4 pt-[12vh] backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <Command
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-bog-rule bg-white shadow-2xl"
        label="Quick navigation"
      >
        <div className="flex items-center gap-2 border-b border-bog-rule px-4">
          <Search size={18} className="text-zinc-400" />
          <Command.Input
            placeholder="Jump to module… (⌘K)"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-zinc-500">No matches.</Command.Empty>
          {NAV_ITEMS.map((item) => (
            <Command.Item
              key={item.href}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => {
                navigate(item.href);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-bog-ink aria-selected:bg-sky-50 aria-selected:text-sky-900"
            >
              <item.icon size={18} className="shrink-0 text-zinc-500" />
              {item.label}
            </Command.Item>
          ))}
        </Command.List>
        <div className="border-t border-bog-rule px-4 py-2 text-[11px] text-zinc-400">
          Tip: enable Comfort mode in Settings → Display for long accounting sessions.
        </div>
      </Command>
    </div>
  );
}
