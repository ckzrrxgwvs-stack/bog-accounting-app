import { useEffect, useState } from 'react';
import { api } from '@/services/api';

/** Company functional currency + multi-currency module (for display and FX hints). */
export function useCompanyFx() {
  const [functionalCurrency, setFunctionalCurrency] = useState('USD');
  const [useMultiCurrency, setUseMultiCurrency] = useState(false);
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
      const payload = res.data as { company?: { currency?: string; useMultiCurrency?: boolean } };
      const co = payload.company;
      if (co?.currency) setFunctionalCurrency(co.currency);
      setUseMultiCurrency(Boolean(co?.useMultiCurrency));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { functionalCurrency, useMultiCurrency, loading };
}

export function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
