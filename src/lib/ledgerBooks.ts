/** Ledger books exposed in Chart of accounts switcher. */
export type LedgerSwitcherKey = 'commerce' | 'personal' | 'agentic';

export type LedgerBookOption = {
  key: LedgerSwitcherKey;
  label: string;
  subtitle: string;
  /** API `?book=` value; omitted for default commerce company. */
  apiBook?: string;
  isInvestment: boolean;
};

export const LEDGER_BOOK_OPTIONS: LedgerBookOption[] = [
  {
    key: 'commerce',
    label: 'Commerce',
    subtitle: 'Store & business operations',
    isInvestment: false,
  },
  {
    key: 'personal',
    label: 'Personal',
    subtitle: 'Robinhood ••••2686',
    apiBook: 'investment_personal',
    isInvestment: true,
  },
  {
    key: 'agentic',
    label: 'Agentic',
    subtitle: 'Robinhood ••••2117',
    apiBook: 'investment_sma',
    isInvestment: true,
  },
];

export function ledgerFromSearchParam(raw: string | null): LedgerSwitcherKey {
  if (raw === 'personal' || raw === 'agentic') return raw;
  return 'commerce';
}

export function apiBookForLedger(ledger: LedgerSwitcherKey): string | undefined {
  return LEDGER_BOOK_OPTIONS.find((b) => b.key === ledger)?.apiBook;
}

export function ledgerBookMeta(ledger: LedgerSwitcherKey): LedgerBookOption {
  return LEDGER_BOOK_OPTIONS.find((b) => b.key === ledger) ?? LEDGER_BOOK_OPTIONS[0];
}
