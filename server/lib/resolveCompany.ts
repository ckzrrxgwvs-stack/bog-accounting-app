import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import {
  getOrCreateInvestmentCompany,
  resolveInvestmentBookFromQuery,
  type InvestmentBookId,
} from '../services/investmentBooks';
import { useDatabase } from './dbMode';

export function investmentBookIdFromQuery(query: Record<string, unknown>): InvestmentBookId | null {
  return resolveInvestmentBookFromQuery(query.book);
}

/** Resolve company from `?book=` (investment) or default commerce company. */
export async function resolveCompanyFromRequest(req: { query: Record<string, unknown> }) {
  const book = investmentBookIdFromQuery(req.query);
  if (book) {
    if (!useDatabase()) return null;
    return getOrCreateInvestmentCompany(book);
  }
  return getOrCreateDefaultCompany();
}

/** Alias for routes that pass `req.query` directly. */
export async function resolveCompanyFromQuery(query: Record<string, unknown>) {
  return resolveCompanyFromRequest({ query });
}
