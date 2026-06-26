import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

router.get('/', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.customer.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { code: 'asc' },
    });
    const customers = rows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      balance: dec(c.balance),
    }));
    res.json({ customers });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        balance: dec(customer.balance),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  if (!requireDatabase(res)) return;
  const name = req.body.name ?? 'New Customer';
  const code = req.body.code ?? `C-${Date.now().toString(36).toUpperCase()}`;
  const email = req.body.email ?? '';
  const phone = req.body.phone ?? '';

  try {
    const company = await getOrCreateDefaultCompany();
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        code: String(code),
        name: String(name),
        email: email || null,
        phone: phone || null,
      },
    });
    res.status(201).json({
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        balance: dec(customer.balance),
      },
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Customer code already exists' : 'Could not create customer' });
  }
});

router.patch('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as Record<string, unknown>;
  const allowed = ['name', 'email', 'phone', 'code', 'isActive', 'address', 'city', 'state', 'zipCode', 'country'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const customer = await prisma.customer.update({
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
      },
    });
    res.json({
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        balance: dec(customer.balance),
      },
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Customer code already exists' : 'Could not update customer' });
  }
});

export { router as customersRouter };
