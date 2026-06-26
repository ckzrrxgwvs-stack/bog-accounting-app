import { Router } from 'express';
import type { Request } from 'express';
import { UserRoleType } from '@prisma/client';
import { requireDatabase } from '../lib/requireDatabase';
import { requireAuthRoles, type JwtPayload } from '../middleware/requireAuthRoles';
import {
  canCreatePortfolioBooks,
  DELEGATABLE_MODULES,
  MODULE_LABELS,
  modulesDelegatorMayAssign,
} from '../lib/delegatableModules';
import { getGranterContext, setUserFullAccess } from '../services/accessControl';
import {
  createPortfolioProjectBook,
  ensureDefaultPortfolioBooks,
  listPortfolioBooksForUser,
} from '../services/portfolioBooks';

const router = Router();

const executive = [UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER] as const;

router.get('/books', requireAuthRoles(...executive, UserRoleType.ACCOUNTANT, UserRoleType.AP_CLERK, UserRoleType.AR_CLERK), async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (!jwt?.sub || !jwt.companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const result = await listPortfolioBooksForUser(jwt.sub, jwt.companyId);
    res.json({
      books: result.workspaces.map((w) => ({
        id: w.bookId,
        slug: w.slug,
        label: w.label,
        kind: w.kind,
        glCompanyId: w.glCompanyId,
      })),
      canViewPortfolio: result.canViewPortfolio,
      portfolioCompanyName: result.portfolioCompanyName,
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load portfolio books' });
  }
});

router.get('/delegation-options', requireAuthRoles(...executive, UserRoleType.ACCOUNTANT, UserRoleType.AP_CLERK, UserRoleType.AR_CLERK), async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (!jwt?.sub || !jwt?.role) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const granter = await getGranterContext(jwt.sub);
    const assignableModules = modulesDelegatorMayAssign(granter.role, granter.moduleGrants);
    res.json({
      canAssignBooks: [UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER].includes(granter.role),
      canCreateBooks: canCreatePortfolioBooks(granter.role),
      assignableModules: assignableModules.map((m) => ({
        id: m,
        label: MODULE_LABELS[m],
      })),
      allModules: DELEGATABLE_MODULES.map((m) => ({ id: m, label: MODULE_LABELS[m] })),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load delegation options' });
  }
});

router.post('/books', requireAuthRoles(UserRoleType.PRESIDENT, UserRoleType.CFO), async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as { label?: string };
  if (!body.label?.trim()) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  try {
    const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (!jwt?.companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await ensureDefaultPortfolioBooks(jwt.companyId);
    const workspace = await createPortfolioProjectBook({
      portfolioCompanyId: jwt.companyId,
      label: body.label.trim(),
    });
    res.status(201).json({ book: workspace });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not create project book';
    res.status(400).json({ error: msg });
  }
});

router.put('/users/:userId/access', requireAuthRoles(...executive, UserRoleType.ACCOUNTANT), async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    canViewPortfolio?: boolean;
    bookIds?: string[];
    modules?: Array<{ module: string; canDelegate?: boolean }>;
  };
  try {
    const jwt = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (!jwt?.sub || !jwt.companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hasBooks = typeof body.canViewPortfolio === 'boolean' && Array.isArray(body.bookIds);
    const hasModules = Array.isArray(body.modules);
    if (!hasBooks && !hasModules) {
      res.status(400).json({
        error: 'Provide book access (canViewPortfolio + bookIds) and/or modules array',
      });
      return;
    }

    await setUserFullAccess({
      granterId: jwt.sub,
      userId: req.params.userId,
      portfolioCompanyId: jwt.companyId,
      canViewPortfolio: hasBooks ? body.canViewPortfolio : undefined,
      bookIds: hasBooks ? body.bookIds : undefined,
      modules: hasModules ? body.modules : undefined,
    });
    res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not update access';
    res.status(400).json({ error: msg });
  }
});

export { router as portfolioRouter };
