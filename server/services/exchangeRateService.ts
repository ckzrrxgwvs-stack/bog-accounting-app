import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { fetchFrankfurterRates } from './frankfurterClient';

/** Normalize calendar day in UTC for stored rate rows */
export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseFrankfurterDay(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return utcDay(new Date());
  return new Date(Date.UTC(y, m - 1, day));
}

const DEFAULT_QUOTES = ['USD', 'EUR', 'MXN', 'GBP', 'CAD'];

export function defaultQuoteCurrencies(functionalCurrency: string): string[] {
  const fc = functionalCurrency.toUpperCase();
  const env = process.env.FX_DEFAULT_QUOTES?.split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const pool = env?.length ? env : DEFAULT_QUOTES;
  return pool.filter((c) => c !== fc);
}

/**
 * Pull market rates from Frankfurter and upsert rows (functional currency = base).
 */
export async function refreshMarketRatesForCompany(
  companyId: string,
  options?: {
    /** Override company functional currency as FX base */
    baseCurrency?: string;
    quoteCurrencies?: string[];
    /** YYYY-MM-DD for historical day; omit for latest */
    date?: string;
  }
): Promise<{ date: string; base: string; quotesWritten: number }> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { currency: true },
  });

  const base = (options?.baseCurrency ?? company.currency ?? 'USD').toUpperCase();
  const quotes =
    options?.quoteCurrencies?.length ?
      options.quoteCurrencies.map((c) => c.toUpperCase()).filter((c) => c !== base)
    : defaultQuoteCurrencies(base);

  if (quotes.length === 0) {
    throw new Error('No quote currencies — add FX_DEFAULT_QUOTES or pass quoteCurrencies');
  }

  const data = await fetchFrankfurterRates({
    base,
    symbols: quotes,
    date: options?.date,
  });

  const rateDate = parseFrankfurterDay(data.date);
  let written = 0;

  await prisma.$transaction(async (tx) => {
    for (const [toCurrency, rateVal] of Object.entries(data.rates)) {
      const toU = toCurrency.toUpperCase();
      const rate = new Prisma.Decimal(String(rateVal));
      const existing = await tx.exchangeRate.findFirst({
        where: {
          companyId,
          fromCurrency: base,
          toCurrency: toU,
          date: rateDate,
        },
      });
      if (existing) {
        await tx.exchangeRate.update({
          where: { id: existing.id },
          data: { rate, source: 'FRANKFURTER', isActive: true },
        });
      } else {
        await tx.exchangeRate.create({
          data: {
            companyId,
            fromCurrency: base,
            toCurrency: toU,
            rate,
            date: rateDate,
            source: 'FRANKFURTER',
            isActive: true,
          },
        });
      }
      written += 1;
    }
  });

  return { date: data.date, base: data.base, quotesWritten: written };
}

/** Effective multiplier: amount in `from` × returned value = amount in `to` */
export async function getConversionMultiplier(
  companyId: string,
  from: string,
  to: string,
  asOf: Date
): Promise<number | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;

  const day = utcDay(asOf);

  const direct = await prisma.exchangeRate.findFirst({
    where: {
      companyId,
      fromCurrency: f,
      toCurrency: t,
      date: day,
      isActive: true,
    },
  });
  if (direct) return Number(direct.rate);

  const inverse = await prisma.exchangeRate.findFirst({
    where: {
      companyId,
      fromCurrency: t,
      toCurrency: f,
      date: day,
      isActive: true,
    },
  });
  if (inverse && Number(inverse.rate) !== 0) return 1 / Number(inverse.rate);

  // Latest stored rate on or before `day` for direct pair
  const directBefore = await prisma.exchangeRate.findFirst({
    where: {
      companyId,
      fromCurrency: f,
      toCurrency: t,
      isActive: true,
      date: { lte: day },
    },
    orderBy: { date: 'desc' },
  });
  if (directBefore) return Number(directBefore.rate);

  const invBefore = await prisma.exchangeRate.findFirst({
    where: {
      companyId,
      fromCurrency: t,
      toCurrency: f,
      isActive: true,
      date: { lte: day },
    },
    orderBy: { date: 'desc' },
  });
  if (invBefore && Number(invBefore.rate) !== 0) return 1 / Number(invBefore.rate);

  return null;
}

export async function convertCurrencyAmount(
  companyId: string,
  amount: number,
  from: string,
  to: string,
  asOf: Date
): Promise<number | null> {
  const mult = await getConversionMultiplier(companyId, from, to, asOf);
  if (mult === null) return null;
  return amount * mult;
}

/** Same as convertCurrencyAmount but throws when no stored rate exists (GL-safe). */
export async function requireConvertedAmount(
  companyId: string,
  amount: number,
  from: string,
  to: string,
  asOf: Date
): Promise<number> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  const out = await convertCurrencyAmount(companyId, amount, f, t, asOf);
  if (out === null) {
    const day = asOf.toISOString().slice(0, 10);
    throw new Error(
      `No exchange rate from ${f} to ${t} for ${day}. Refresh daily rates in Settings → Integrations (or load historical rates for that date).`
    );
  }
  return out;
}
