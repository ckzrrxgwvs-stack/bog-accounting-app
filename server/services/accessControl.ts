import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  canAssignAccessToTarget,
  isExecutiveRole,
  type ModuleGrantInput,
  validateModuleAssignment,
} from '../lib/delegatableModules';
import { setUserBookAccess as applyBookAccess } from './portfolioBooks';

export async function getGranterContext(granterId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: granterId },
    include: {
      moduleGrants: { select: { module: true, canDelegate: true } },
      bookAccess: { select: { bookId: true } },
    },
  });
}

export async function setUserPortfolioAccess(input: {
  granterId: string;
  userId: string;
  portfolioCompanyId: string;
  canViewPortfolio: boolean;
  bookIds: string[];
}): Promise<void> {
  const granter = await getGranterContext(input.granterId);
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target || target.companyId !== input.portfolioCompanyId) {
    throw new Error('User not found in this portfolio');
  }
  if (!isExecutiveRole(granter.role)) {
    throw new Error('Only President, CFO, or Controller may assign book access');
  }
  if (!canAssignAccessToTarget(granter.role, target.role)) {
    throw new Error('You cannot change book access for this user');
  }

  await applyBookAccess({
    userId: input.userId,
    portfolioCompanyId: input.portfolioCompanyId,
    canViewPortfolio: input.canViewPortfolio,
    bookIds: input.bookIds,
  });
}

export async function setUserDepartmentGrants(input: {
  granterId: string;
  userId: string;
  portfolioCompanyId: string;
  modules: ModuleGrantInput[];
}): Promise<void> {
  const granter = await getGranterContext(input.granterId);
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target || target.companyId !== input.portfolioCompanyId) {
    throw new Error('User not found in this portfolio');
  }

  const validation = validateModuleAssignment({
    granterRole: granter.role,
    granterGrants: granter.moduleGrants,
    targetRole: target.role,
    modules: input.modules,
  });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  await prisma.$transaction(async (tx) => {
    await tx.userModuleGrant.deleteMany({ where: { userId: input.userId } });
    if (input.modules.length > 0) {
      await tx.userModuleGrant.createMany({
        data: input.modules.map((m) => ({
          userId: input.userId,
          module: m.module,
          canDelegate: Boolean(m.canDelegate),
          grantedById: input.granterId,
        })),
      });
    }
  });
}

export async function setUserFullAccess(input: {
  granterId: string;
  userId: string;
  portfolioCompanyId: string;
  canViewPortfolio?: boolean;
  bookIds?: string[];
  modules?: ModuleGrantInput[];
}): Promise<void> {
  if (input.canViewPortfolio !== undefined && input.bookIds !== undefined) {
    await setUserPortfolioAccess({
      granterId: input.granterId,
      userId: input.userId,
      portfolioCompanyId: input.portfolioCompanyId,
      canViewPortfolio: input.canViewPortfolio,
      bookIds: input.bookIds,
    });
  }

  if (input.modules !== undefined) {
    await setUserDepartmentGrants({
      granterId: input.granterId,
      userId: input.userId,
      portfolioCompanyId: input.portfolioCompanyId,
      modules: input.modules,
    });
  }
}
