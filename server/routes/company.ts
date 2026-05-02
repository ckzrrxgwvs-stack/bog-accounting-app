import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

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

export { router as companyRouter };
