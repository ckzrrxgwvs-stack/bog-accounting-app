import { EntryStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLedgerEntriesForJournal } from '../ledgerFromJournal';
import {
  getOrCreateInvestmentCompany,
  INVESTMENT_BOOKS,
  type InvestmentBookId,
} from '../investmentBooks';
import type { RobinhoodEquityOrder, RobinhoodImportResult } from './equityOrderTypes';

type Lot = { qty: number; unitCost: number };

const ACCOUNT_CODES = {
  cash: '1200',
  securities: '1210',
  realizedGain: '4610',
  realizedLoss: '4611',
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function orderDate(order: RobinhoodEquityOrder): Date {
  const raw = order.last_transaction_at || order.created_at;
  return new Date(raw);
}

function sortOrdersChronologically(orders: RobinhoodEquityOrder[]): RobinhoodEquityOrder[] {
  return [...orders].sort(
    (a, b) => orderDate(a).getTime() - orderDate(b).getTime()
  );
}

async function loadAccountIds(companyId: string): Promise<Record<keyof typeof ACCOUNT_CODES, string>> {
  const codes = Object.values(ACCOUNT_CODES);
  const rows = await prisma.account.findMany({
    where: { companyId, code: { in: codes } },
  });
  const byCode = new Map(rows.map((r) => [r.code, r.id]));
  const out = {} as Record<keyof typeof ACCOUNT_CODES, string>;
  for (const [key, code] of Object.entries(ACCOUNT_CODES) as [keyof typeof ACCOUNT_CODES, string][]) {
    const id = byCode.get(code);
    if (!id) throw new Error(`Missing account code ${code} on investment company`);
    out[key] = id;
  }
  return out;
}

type JournalLineDraft = { accountId: string; debit: number; credit: number; note?: string };

async function postJournal(
  companyId: string,
  sourceType: string,
  sourceId: string,
  date: Date,
  description: string,
  lines: JournalLineDraft[]
): Promise<void> {
  const period = date.getMonth() + 1;
  const year = date.getFullYear();

  await prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        companyId,
        date,
        description: description.slice(0, 500),
        reference: sourceId,
        status: EntryStatus.POSTED,
        period,
        year,
        createdBy: 'system:robinhood-import',
        sourceType,
        sourceId,
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit > 0 ? new Prisma.Decimal(l.debit) : null,
            credit: l.credit > 0 ? new Prisma.Decimal(l.credit) : null,
            description: l.note,
          })),
        },
      },
      include: { lines: true },
    });

    await createLedgerEntriesForJournal(tx, {
      companyId,
      journalEntryId: je.id,
      journalDate: date,
      description: je.description,
      lines: je.lines.map((x) => ({
        id: x.id,
        accountId: x.accountId,
        debit: x.debit,
        credit: x.credit,
      })),
    });
  });
}

function consumeFifoLots(lots: Lot[], sellQty: number): { costBasis: number; consumed: number } {
  let remaining = sellQty;
  let costBasis = 0;
  while (remaining > 0.000001 && lots.length > 0) {
    const lot = lots[0];
    const take = Math.min(remaining, lot.qty);
    costBasis += take * lot.unitCost;
    lot.qty -= take;
    remaining -= take;
    if (lot.qty <= 0.000001) lots.shift();
  }
  return { costBasis: round2(costBasis), consumed: round2(sellQty - remaining) };
}

/**
 * Import filled Robinhood equity orders into an investment ledger (FIFO cost basis).
 * Idempotent per order id via journal sourceId.
 */
export async function importRobinhoodEquityOrders(
  bookId: InvestmentBookId,
  orders: RobinhoodEquityOrder[]
): Promise<RobinhoodImportResult> {
  const def = INVESTMENT_BOOKS[bookId];
  const company = await getOrCreateInvestmentCompany(bookId);
  const accounts = await loadAccountIds(company.id);
  const lotsBySymbol = new Map<string, Lot[]>();

  const result: RobinhoodImportResult = {
    bookId,
    companyId: company.id,
    processed: 0,
    skipped: 0,
    posted: 0,
    errors: [],
  };

  for (const order of sortOrdersChronologically(orders)) {
    result.processed += 1;

    if (order.state !== 'filled') {
      result.skipped += 1;
      continue;
    }

    const existing = await prisma.journalEntry.findFirst({
      where: {
        companyId: company.id,
        sourceType: def.journalSourceType,
        sourceId: `rh-equity-${order.id}`,
      },
      select: { id: true },
    });
    if (existing) {
      result.skipped += 1;
      continue;
    }

    const qty = Number(order.cumulative_quantity);
    const price = Number(order.average_price ?? 0);
    const fees = Number(order.fees || 0);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      result.errors.push({
        orderId: order.id,
        symbol: order.symbol,
        message: 'Missing quantity or average_price',
      });
      continue;
    }

    const side = order.side.toLowerCase();
    const symbol = order.symbol.toUpperCase();
    const date = orderDate(order);
    const sourceId = `rh-equity-${order.id}`;

    try {
      if (side === 'buy') {
        const total = round2(qty * price + fees);
        const unitCost = total / qty;
        const lots = lotsBySymbol.get(symbol) ?? [];
        lots.push({ qty, unitCost });
        lotsBySymbol.set(symbol, lots);

        await postJournal(
          company.id,
          def.journalSourceType,
          sourceId,
          date,
          `RH buy ${qty} ${symbol} @ ${price}`,
          [
            { accountId: accounts.securities, debit: total, credit: 0, note: symbol },
            { accountId: accounts.cash, debit: 0, credit: total, note: symbol },
          ]
        );
        result.posted += 1;
        continue;
      }

      if (side === 'sell') {
        const proceeds = round2(qty * price - fees);
        const lots = lotsBySymbol.get(symbol) ?? [];
        const { costBasis } = consumeFifoLots(lots, qty);
        lotsBySymbol.set(symbol, lots);

        const gainOrLoss = round2(proceeds - costBasis);
        const lines: JournalLineDraft[] = [
          { accountId: accounts.cash, debit: proceeds, credit: 0, note: symbol },
          { accountId: accounts.securities, debit: 0, credit: costBasis, note: symbol },
        ];

        if (gainOrLoss > 0.005) {
          lines.push({
            accountId: accounts.realizedGain,
            debit: 0,
            credit: gainOrLoss,
            note: `${symbol} gain`,
          });
        } else if (gainOrLoss < -0.005) {
          lines.push({
            accountId: accounts.realizedLoss,
            debit: Math.abs(gainOrLoss),
            credit: 0,
            note: `${symbol} loss`,
          });
        }

        const debitSum = lines.reduce((s, l) => s + l.debit, 0);
        const creditSum = lines.reduce((s, l) => s + l.credit, 0);
        const diff = round2(debitSum - creditSum);
        if (Math.abs(diff) > 0.02) {
          throw new Error(`Unbalanced entry: ${diff}`);
        }

        await postJournal(
          company.id,
          def.journalSourceType,
          sourceId,
          date,
          `RH sell ${qty} ${symbol} @ ${price}`,
          lines
        );
        result.posted += 1;
        continue;
      }

      result.skipped += 1;
    } catch (e) {
      result.errors.push({
        orderId: order.id,
        symbol: order.symbol,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return result;
}

/** Map Robinhood account mask (last 4) to investment book. */
export function investmentBookForRobinhoodMask(mask: string): InvestmentBookId | null {
  const m = mask.trim();
  if (m === '2686' || m.endsWith('2686')) return 'investment_personal';
  if (m === '2117' || m.endsWith('2117')) return 'investment_sma';
  return null;
}
