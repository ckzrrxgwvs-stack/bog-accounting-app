import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

const mockVendors = [
  { id: 'v1', code: 'V-001', name: 'Office Depot', email: 'ap@officedepot.com', phone: '(555) 100-2000', balance: 1250 },
  { id: 'v2', code: 'V-002', name: 'Tech Solutions', email: 'invoices@techsol.com', phone: '(555) 200-3000', balance: 3500 },
];

router.get('/', async (_req, res) => {
  if (!useDatabase()) {
    res.json({ vendors: mockVendors });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.vendor.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { code: 'asc' },
    });
    const vendors = rows.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      email: v.email ?? '',
      phone: v.phone ?? '',
      balance: dec(v.balance),
    }));
    res.json({ vendors });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const vendor = mockVendors.find((v) => v.id === req.params.id);
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    res.json({ vendor });
    return;
  }
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    res.json({
      vendor: {
        id: vendor.id,
        code: vendor.code,
        name: vendor.name,
        email: vendor.email ?? '',
        phone: vendor.phone ?? '',
        balance: dec(vendor.balance),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const name = req.body.name ?? 'New Vendor';
  const code = req.body.code ?? `V-${Date.now().toString(36).toUpperCase()}`;
  const email = req.body.email ?? '';
  const phone = req.body.phone ?? '';

  if (!useDatabase()) {
    const vendor = {
      id: `v-${Date.now()}`,
      code,
      name,
      email,
      phone,
      balance: 0,
    };
    res.status(201).json({ vendor });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const vendor = await prisma.vendor.create({
      data: {
        companyId: company.id,
        code: String(code),
        name: String(name),
        email: email || null,
        phone: phone || null,
      },
    });
    res.status(201).json({
      vendor: {
        id: vendor.id,
        code: vendor.code,
        name: vendor.name,
        email: vendor.email ?? '',
        phone: vendor.phone ?? '',
        balance: dec(vendor.balance),
      },
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Vendor code already exists' : 'Could not create vendor' });
  }
});

export { router as vendorsRouter };
