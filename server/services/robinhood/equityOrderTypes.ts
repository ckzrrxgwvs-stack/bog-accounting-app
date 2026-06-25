/** Subset of Robinhood get_equity_orders row used for GL import. */
export type RobinhoodEquityOrder = {
  id: string;
  symbol: string;
  side: string;
  state: string;
  cumulative_quantity: string;
  average_price: string | null;
  fees: string;
  created_at: string;
  last_transaction_at: string | null;
};

export type RobinhoodImportResult = {
  bookId: string;
  companyId: string;
  processed: number;
  skipped: number;
  posted: number;
  errors: { orderId: string; symbol: string; message: string }[];
};
