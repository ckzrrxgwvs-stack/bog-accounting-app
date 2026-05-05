/**
 * Frankfurter — free JSON API (ECB reference rates), no API key.
 * https://www.frankfurter.app/docs/
 */

export type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

function buildUrl(base: string, symbols: string[], date?: string): string {
  const q = new URLSearchParams();
  q.set('from', base.toUpperCase());
  const filtered = symbols.map((s) => s.toUpperCase()).filter((s) => s && s !== base.toUpperCase());
  if (filtered.length) q.set('to', filtered.join(','));
  const path = date ? `/${date}` : '/latest';
  return `https://api.frankfurter.app${path}?${q.toString()}`;
}

/** Latest or historical (YYYY-MM-DD) spot rates: 1 base = rates[X] X */
export async function fetchFrankfurterRates(params: {
  base: string;
  symbols: string[];
  date?: string;
}): Promise<FrankfurterResponse> {
  const base = params.base.trim().toUpperCase();
  const symbols = params.symbols.filter((s) => s.toUpperCase() !== base);
  const url = buildUrl(base, symbols, params.date);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frankfurter HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as FrankfurterResponse;
  if (!data.rates || typeof data.rates !== 'object') {
    throw new Error('Invalid Frankfurter response');
  }
  return data;
}
