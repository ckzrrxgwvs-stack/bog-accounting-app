import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export type ServerMode = 'loading' | 'database' | 'demo' | 'offline';

/** Reflects whether /api/health reports a real database (vs mock / unreachable API). */
export function useServerMode(): ServerMode {
  const [mode, setMode] = useState<ServerMode>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getHealth();
      if (cancelled) return;
      if (!res.success || !res.data) {
        setMode('offline');
        return;
      }
      const d = res.data as { database?: boolean; mock?: boolean };
      if (d.database && !d.mock) setMode('database');
      else setMode('demo');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return mode;
}
