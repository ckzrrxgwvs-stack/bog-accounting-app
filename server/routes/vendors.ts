import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { resolveCompanyFromQuery } from '../lib/resolveCompany';
import { dec } from '../lib/serialize';

const router = Router();

router.get('/', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await resolveCompanyFromQuery(req.query as Record<string, unknown>);
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
      tax1099Category: v.tax1099Category ?? '',
    }));
    res.json({ vendors });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
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
  if (!requireDatabase(res)) return;
  const name = req.body.name ?? 'New Vendor';
  const code = req.body.code ?? `V-${Date.now().toString(36).toUpperCase()}`;
  const email = req.body.email ?? '';
  const phone = req.body.phone ?? '';

  try {
    const company = await resolveCompanyFromQuery(req.query as Record<string, unknown>);
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

router.patch('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as Record<string, unknown>;
  const allowed = [
    'name',
    'email',
    'phone',
    'code',
    'isActive',
    'address',
    'city',
    'state',
    'zipCode',
    'country',
    'paymentTerms',
    'tax1099Category',
  ] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const company = await resolveCompanyFromQuery(req.query as Record<string, unknown>);
    const existing = await prisma.vendor.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        ...(typeof data.name === 'string' ? { name: data.name } : {}),
        ...(typeof data.email === 'string' ? { email: data.email || null } : {}),
        ...(typeof data.phone === 'string' ? { phone: data.phone || null } : {}),
        ...(typeof data.code === 'string' ? { code: data.code } : {}),
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
        ...(typeof data.address === 'string' ? { address: data.address || null } : {}),
        ...(typeof data.city === 'string' ? { city: data.city || null } : {}),
        ...(typeof data.state === 'string' ? { state: data.state || null } : {}),
        ...(typeof data.zipCode === 'string' ? { zipCode: data.zipCode || null } : {}),
        ...(typeof data.country === 'string' ? { country: data.country } : {}),
        ...(data.paymentTerms !== undefined && Number.isFinite(Number(data.paymentTerms))
          ? { paymentTerms: Math.floor(Number(data.paymentTerms)) }
          : {}),
        ...(typeof data.tax1099Category === 'string' || data.tax1099Category === null
          ? {
              tax1099Category:
                data.tax1099Category === null || data.tax1099Category === ''
                  ? null
                  : String(data.tax1099Category),
            }
          : {}),
      },
    });
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
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Vendor code already exists' : 'Could not update vendor' });
  }
});

export { router as vendorsRouter };
