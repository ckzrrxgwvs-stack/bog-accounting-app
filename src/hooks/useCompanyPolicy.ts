import { useEffect, useState } from 'react';
import { api } from '@/services/api';

/** Company-wide policy flags from `/api/company` (e.g. manual operations vs AI). */
export function useCompanyPolicy() {
  const [manualOperationsMode, setManualOperationsMode] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getCompany();
      if (cancelled) return;
      if (!res.success || !res.data) {
        setLoading(false);
        return;
      }
      const payload = res.data as { company?: Record<string, unknown> };
      const co = payload.company;
      if (co?.id != null) setCompanyId(String(co.id));
      setManualOperationsMode(Boolean(co?.manualOperationsMode));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { manualOperationsMode, companyId, loading };
}
