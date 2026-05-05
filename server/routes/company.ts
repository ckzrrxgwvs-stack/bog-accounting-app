import { Router } from 'express';
import type { Request } from 'express';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { requireAuthRoles, type JwtPayload } from '../middleware/requireAuthRoles';

const router = Router();

// GET /api/company — default (first) company; creates + seeds COA if empty
router.get('/', async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      error: 'Database not configured',
      hint: 'Set DATABASE_URL for company and chart of accounts persistence.',
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    res.json({ company });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load company' });
  }
});

// PATCH /api/company/:id
router.patch('/:id', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const { id } = req.params;
    const allowed = [
      'name',
      'legalName',
      'country',
      'currency',
      'fiscalYearStart',
      'taxId',
      'address',
      'phone',
      'email',
      'useInventory',
      'usePayroll',
      'useMultiCurrency',
      'useCostCenters',
      'glCashAccountCode',
      'glArAccountCode',
      'glApAccountCode',
      'glRevenueAccountCode',
      'glExpenseAccountCode',
      'glSalesTaxPayableAccountCode',
      'glPurchasesExpenseAccountCode',
      'useBankFeeds',
      'useBankOutboundPayments',
      'bankIntegrationNotes',
      'useUsPayrollTaxReporting',
      'useUsInformationReturns',
      'usTaxIntegrationNotes',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const company = await prisma.company.update({
      where: { id },
      data,
    });
    res.json({ company });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not update company' });
  }
});

/**
 * Executive-only: enables or disables company-wide manual operations mode (turns off AI CPA and automated AI review).
 * POST /api/company is unauthenticated in some dev setups; this route always requires a valid JWT and an executive role.
 */
router.patch(
  '/:id/executive-settings',
  requireAuthRoles(UserRoleType.PRESIDENT, UserRoleType.CFO, UserRoleType.CONTROLLER),
  async (req, res) => {
    if (!process.env.DATABASE_URL) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }

    const { manualOperationsMode } = req.body as { manualOperationsMode?: unknown };
    if (typeof manualOperationsMode !== 'boolean') {
      res.status(400).json({ error: 'manualOperationsMode (boolean) is required' });
      return;
    }

    const { id } = req.params;
    const auth = (req as Request & { authJwt?: JwtPayload }).authJwt;
    if (auth?.companyId && auth.companyId !== id) {
      res.status(403).json({ error: 'You can only change settings for your own company' });
      return;
    }

    try {
      const company = await prisma.company.update({
        where: { id },
        data: { manualOperationsMode },
      });
      res.json({ company });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Could not update executive settings' });
    }
  }
);

export { router as companyRouter };
