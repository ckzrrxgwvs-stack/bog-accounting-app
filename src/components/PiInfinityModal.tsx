import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Infinity as InfinityIcon } from 'lucide-react';
import { PiStream } from '@/lib/piDigits';

const FIRST_BATCH = 1000;
const MORE_BATCH = 1000;

/** Group a long digit string into space-separated blocks of 10 for readability. */
function groupDigits(digits: string): string {
  return digits.replace(/(.{10})/g, '$1 ').trimEnd();
}

/**
 * "Infinite pie" easter-egg: streams the never-ending decimal digits of pi.
 * Opened by dispatching `window.dispatchEvent(new Event('bog:open-pi'))`.
 */
export function PiInfinityModal() {
  const [open, setOpen] = useState(false);
  const [tail, setTail] = useState(''); // digits after the leading 3
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const streamRef = useRef<PiStream | null>(null);

  const reveal = useCallback((n: number) => {
    if (!streamRef.current) streamRef.current = new PiStream();
    const chunk = streamRef.current.next(n);
    setTail((prev) => prev + chunk);
    setCount(streamRef.current.count);
  }, []);

  useEffect(() => {
    const onOpen = () => {
      streamRef.current = new PiStream();
      const first = streamRef.current.next(FIRST_BATCH); // includes leading 3
      setTail(first.slice(1));
      setCount(streamRef.current.count);
      setOpen(true);
    };
    window.addEventListener('bog:open-pi', onOpen);
    return () => window.removeEventListener('bog:open-pi', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const copy = async () => {
    await navigator.clipboard.writeText(`3.${tail}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bog-ink/50 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--bog-neon-soft)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-figures text-xl font-bold" style={{ color: 'var(--bog-neon)' }}>
              π
            </span>
            <div>
              <h2 className="text-sm font-semibold text-bog-ink">The infinite pie</h2>
              <p className="font-figures text-[11px] text-zinc-500">
                {count.toLocaleString()} digits revealed · ledger precision never ends
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-bog-sheet hover:text-bog-ink"
              title="Copy digits"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-bog-sheet hover:text-bog-ink"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="break-all font-figures text-[13px] leading-relaxed text-bog-ink">
            <span className="font-bold" style={{ color: 'var(--bog-neon)' }}>
              3.
            </span>
            {groupDigits(tail)}
            <span className="ml-1 inline-block animate-pulse" style={{ color: 'var(--bog-neon)' }}>
              …
            </span>
          </p>
        </div>

        <div
          className="flex items-center justify-between gap-3 px-5 py-3"
          style={{ borderTop: '1px solid var(--bog-neon-soft)' }}
        >
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <InfinityIcon size={14} style={{ color: 'var(--bog-neon)' }} />
            It keeps going forever — just like the books should balance.
          </span>
          <button
            type="button"
            onClick={() => reveal(MORE_BATCH)}
            className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--bog-neon)' }}
          >
            Reveal 1,000 more
          </button>
        </div>
      </div>
    </div>
  );
}
