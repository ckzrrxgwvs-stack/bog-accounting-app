import { listPortfolioBooksForUser } from './portfolioBooks';

export type BusinessWorkspace = {
  id: string;
  bookId: string;
  label: string;
  companyId: string;
  kind: 'commerce' | 'investment' | 'project';
  apiBook?: string;
  ledgerKey?: 'commerce' | 'personal' | 'agentic';
};

/** Authorized portfolio books for the top-menu switcher. */
export async function listBusinessWorkspaces(userId: string, portfolioCompanyId: string) {
  const result = await listPortfolioBooksForUser(userId, portfolioCompanyId);
  return {
    workspaces: result.workspaces.map((w) => ({
      id: w.id,
      bookId: w.bookId,
      label: w.label,
      companyId: w.glCompanyId,
      kind: w.kind,
      apiBook: w.apiBook,
      ledgerKey: w.ledgerKey,
    })),
    canViewPortfolio: result.canViewPortfolio,
    portfolioCompanyName: result.portfolioCompanyName,
  };
}
