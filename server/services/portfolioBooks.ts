import { PortfolioBookKind, UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany, seedChartOfAccounts } from './companyBootstrap';
import { ensureAllInvestmentBooks, getOrCreateInvestmentCompany, INVESTMENT_BOOKS } from './investmentBooks';

export type PortfolioWorkspace = {
  id: string;
  bookId: string;
  slug: string;
  label: string;
  companyId: string;
  glCompanyId: string;
  kind: 'commerce' | 'investment' | 'project';
  apiBook?: string;
  ledgerKey?: 'commerce' | 'personal' | 'agentic';
};

function kindToWorkspaceKind(kind: PortfolioBookKind): PortfolioWorkspace['kind'] {
  if (kind === PortfolioBookKind.COMMERCE) return 'commerce';
  if (kind === PortfolioBookKind.INVESTMENT) return 'investment';
  return 'project';
}

function ledgerKeyForSlug(slug: string): PortfolioWorkspace['ledgerKey'] | undefined {
  if (slug === 'commerce') return 'commerce';
  if (slug === 'investment_sma') return 'agentic';
  if (slug === 'investment_personal') return 'personal';
  return undefined;
}

async function upsertBook(input: {
  portfolioCompanyId: string;
  glCompanyId: string;
  slug: string;
  label: string;
  kind: PortfolioBookKind;
  sortOrder: number;
}) {
  const existing = await prisma.portfolioBook.findUnique({
    where: { portfolioCompanyId_slug: { portfolioCompanyId: input.portfolioCompanyId, slug: input.slug } },
  });
  if (existing) {
    return prisma.portfolioBook.update({
      where: { id: existing.id },
      data: { label: input.label, kind: input.kind, sortOrder: input.sortOrder, isActive: true },
    });
  }
  return prisma.portfolioBook.create({ data: input });
}

/** Seed default commerce + investment books under the portfolio company. */
export async function ensureDefaultPortfolioBooks(portfolioCompanyId?: string): Promise<void> {
  const portfolio = portfolioCompanyId
    ? await prisma.company.findUniqueOrThrow({ where: { id: portfolioCompanyId } })
    : await getOrCreateDefaultCompany();

  await ensureAllInvestmentBooks();

  await upsertBook({
    portfolioCompanyId: portfolio.id,
    glCompanyId: portfolio.id,
    slug: 'commerce',
    label: portfolio.name,
    kind: PortfolioBookKind.COMMERCE,
    sortOrder: 0,
  });

  let order = 1;
  for (const bookId of ['investment_sma', 'investment_personal'] as const) {
    const def = INVESTMENT_BOOKS[bookId];
    const glCo = await getOrCreateInvestmentCompany(bookId);
    await upsertBook({
      portfolioCompanyId: portfolio.id,
      glCompanyId: glCo.id,
      slug: bookId,
      label: def.companyName,
      kind: PortfolioBookKind.INVESTMENT,
      sortOrder: order++,
    });
  }
}

export async function createPortfolioProjectBook(input: {
  portfolioCompanyId: string;
  label: string;
}): Promise<PortfolioWorkspace> {
  const label = input.label.trim();
  if (!label) throw new Error('Project name is required');

  const glCompany = await prisma.company.create({
    data: {
      name: label,
      legalName: label,
      country: 'US',
      currency: 'USD',
      fiscalYearStart: 1,
    },
  });
  await seedChartOfAccounts(glCompany.id);

  const slug = `project-${glCompany.id.slice(-8)}`;
  const book = await prisma.portfolioBook.create({
    data: {
      portfolioCompanyId: input.portfolioCompanyId,
      glCompanyId: glCompany.id,
      slug,
      label,
      kind: PortfolioBookKind.PROJECT,
      sortOrder: 100,
    },
  });

  return mapBookToWorkspace(book);
}

function mapBookToWorkspace(book: {
  id: string;
  slug: string;
  label: string;
  glCompanyId: string;
  kind: PortfolioBookKind;
}): PortfolioWorkspace {
  const kind = kindToWorkspaceKind(book.kind);
  return {
    id: book.slug,
    bookId: book.id,
    slug: book.slug,
    label: book.label,
    companyId: book.glCompanyId,
    glCompanyId: book.glCompanyId,
    kind,
    apiBook: book.kind === PortfolioBookKind.INVESTMENT ? book.slug : undefined,
    ledgerKey: ledgerKeyForSlug(book.slug),
  };
}

export async function listPortfolioBooksForUser(userId: string, companyId: string): Promise<{
  workspaces: PortfolioWorkspace[];
  canViewPortfolio: boolean;
  portfolioCompanyName: string;
}> {
  await ensureDefaultPortfolioBooks(companyId);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      bookAccess: { include: { book: true } },
      company: { select: { name: true } },
    },
  });

  const allBooks = await prisma.portfolioBook.findMany({
    where: { portfolioCompanyId: companyId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const isExecutive = [UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER].includes(user.role);
  const allowed = isExecutive
    ? allBooks
    : allBooks.filter((b) => user.bookAccess.some((a) => a.bookId === b.id));

  const commerce = allBooks.find((b) => b.slug === 'commerce');

  return {
    workspaces: allowed.map(mapBookToWorkspace),
    canViewPortfolio:
      user.role === UserRoleType.PRESIDENT || user.canViewPortfolio,
    portfolioCompanyName: commerce?.label ?? user.company.name,
  };
}

export async function setUserBookAccess(input: {
  userId: string;
  portfolioCompanyId: string;
  canViewPortfolio: boolean;
  bookIds: string[];
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.companyId !== input.portfolioCompanyId) {
    throw new Error('User not found in this portfolio');
  }
  if (user.role === UserRoleType.PRESIDENT) {
    throw new Error('President always has full access — edit another user');
  }

  const validBooks = await prisma.portfolioBook.findMany({
    where: { portfolioCompanyId: input.portfolioCompanyId, id: { in: input.bookIds } },
    select: { id: true },
  });
  const validIds = new Set(validBooks.map((b) => b.id));

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { canViewPortfolio: input.canViewPortfolio },
    });
    await tx.userBookAccess.deleteMany({ where: { userId: input.userId } });
    if (validIds.size > 0) {
      await tx.userBookAccess.createMany({
        data: [...validIds].map((bookId) => ({ userId: input.userId, bookId })),
      });
    }
  });
}
