import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import {
  getOrCreateInvestmentCompany,
  resolveInvestmentBookFromQuery,
} from '../services/investmentBooks';
import { useDatabase } from './dbMode';

/** Resolve company from `?book=` (investment) or default commerce company. */
export async function resolveCompanyFromRequest(req: { query: Record<string, unknown> }) {
  const book = resolveInvestmentBookFromQuery(req.query.book);
  if (book) {
    if (!useDatabase()) return null;
    return getOrCreateInvestmentCompany(book);
  }
  return getOrCreateDefaultCompany();
}
