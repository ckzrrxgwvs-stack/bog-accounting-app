/**
 * ERP Assistant — AI-first experience for customer service clerks (mirrors AI CPA policy).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, RefreshCw, Sparkles, PenLine, PackageSearch } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { api } from '@/services/api';
import { useCompanyPolicy } from '@/hooks/useCompanyPolicy';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; at: Date };

export function ErpAssistant() {
  const { manualOperationsMode, loading: policyLoading } = useCompanyPolicy();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      at: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);
    const res = await api.sendErpAssistantMessage(text);
    setTyping(false);
    if (!res.success || !res.data) {
      const err = (res as { error?: string }).error ?? 'Request failed';
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content:
            err.includes('MANUAL') || err.includes('manual')
              ? 'ERP Assistant is disabled in manual operations mode.'
              : err,
          at: new Date(),
        },
      ]);
      return;
    }
    const payload = res.data as { response?: string };
    setMessages((m) => [
      ...m,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: payload.response ?? 'No response.',
        at: new Date(),
      },
    ]);
  };

  const suggestions = [
    'Customer asks where their order is — what do I check?',
    'Explain our sales order statuses in plain English.',
    'Walk me through recording a shipment and tracking number.',
    'Vendor says they shipped — what PO status should I look for?',
    'Difference between packing slip and commercial invoice for our ERP?',
  ];

  if (policyLoading) {
    return (
      <ModuleWorkspace label="ERP" title="ERP Assistant" description="">
        <p className="text-sm text-zinc-500">Loading company policy…</p>
      </ModuleWorkspace>
    );
  }

  if (manualOperationsMode) {
    return (
      <ModuleWorkspace
        label="ERP"
        title="ERP Assistant"
        description="AI-assisted ERP workflows are disabled when manual operations mode is on."
      >
        <div className="bog-statement-card mx-auto max-w-lg border border-bog-rule p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            <PenLine size={28} />
          </div>
          <h2 className="text-lg font-semibold text-bog-ink">ERP Assistant is disabled</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Your organization uses <strong>manual operations mode</strong>. Clerks should use the standard ERP forms — purchase orders,
            sales orders, logistics — without AI automation, same policy as AI CPA.
          </p>
          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link to="/erp" className="font-medium text-[hsl(var(--bog-accent))] underline-offset-2 hover:underline">
              ERP hub (forms)
            </Link>
            <Link
              to="/settings/manual-operations"
              className="font-medium text-[hsl(var(--bog-accent))] underline-offset-2 hover:underline"
            >
              Manual operations (executives)
            </Link>
          </div>
        </div>
      </ModuleWorkspace>
    );
  }

  return (
    <ModuleWorkspace
      label="ERP · Assistant"
      title="ERP Assistant"
      description="Describe what the customer needs — orders, shipments, returns, or vendor timing. The assistant uses live snapshot data when your database is connected. For detailed grids and documents, use advanced screens from the ERP hub."
      actions={
        <Link
          to="/erp"
          className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          ERP hub
        </Link>
      }
    >
      <div className="flex h-[min(72vh,640px)] flex-col overflow-hidden rounded-xl border border-bog-rule bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-bog-rule bg-bog-sheet px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bog-ink text-white">
              <Sparkles size={22} />
            </span>
            <div>
              <h2 className="font-semibold text-bog-ink">Ask in plain language</h2>
              <p className="text-xs text-zinc-500">Built for customer service — no ERP jargon required</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white hover:text-bog-ink"
            title="Clear chat"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <PackageSearch className="mb-4 h-14 w-14 text-zinc-300" />
              <p className="max-w-md text-sm text-zinc-600">
                Examples: order status, what to tell a customer, where to add tracking, or how PO receipt ties to inventory.
              </p>
              <p className="mt-4 text-xs text-zinc-400">Tap a suggestion below or type your own question.</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-bog-ink text-white'
                        : 'border border-bog-rule bg-zinc-50 text-bog-ink'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="mb-4 flex justify-start">
                  <div className="rounded-lg border border-bog-rule bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>

        {messages.length === 0 && (
          <div className="border-t border-bog-rule bg-zinc-50/80 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-zinc-500">Suggested:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s);
                  }}
                  className="rounded-full border border-bog-rule bg-white px-3 py-1.5 text-left text-xs text-bog-ink hover:bg-bog-sheet"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="border-t border-bog-rule p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="e.g. Customer called about SO-123 — what status means shipped?"
              rows={2}
              className="min-h-[48px] flex-1 resize-none rounded-lg border border-bog-rule px-4 py-3 text-sm focus:border-bog-ink focus:outline-none focus:ring-1 focus:ring-bog-ink"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bog-ink text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Enter to send · Shift+Enter for new line</p>
        </form>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Same policy as accounting: executives can disable all AI assistants under{' '}
        <Link to="/settings/manual-operations" className="font-medium text-[hsl(var(--bog-accent))] underline-offset-2 hover:underline">
          Manual operations
        </Link>
        .
      </p>
    </ModuleWorkspace>
  );
}
