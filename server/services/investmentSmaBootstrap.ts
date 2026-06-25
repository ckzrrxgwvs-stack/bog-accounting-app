import {
  getOrCreateInvestmentCompany,
  investmentCoaForBook,
  INVESTMENT_BOOKS,
  seedInvestmentChartTx,
} from './investmentBooks';

/** @deprecated Use INVESTMENT_BOOKS.investment_sma.companyName */
export const INVESTMENT_SMA_COMPANY_NAME = INVESTMENT_BOOKS.investment_sma.companyName;

/** @deprecated Use investmentCoaForBook('investment_sma') */
export const INVESTMENT_SMA_COA = investmentCoaForBook('investment_sma');

export { seedInvestmentChartTx as seedInvestmentSmaChartTx };

export async function getOrCreateInvestmentSmaCompany() {
  return getOrCreateInvestmentCompany('investment_sma');
}
