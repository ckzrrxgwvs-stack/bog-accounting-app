import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

let mockCustomers: {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
}[] = [
  { id: 'c1', code: 'C-001', name: 'Acme Corporation', email: 'ap@acme.com', phone: '(555) 111-2222', balance: 5200 },
  { id: 'c2', code: 'C-002', name: 'TechStart Inc', email: 'billing@techstart.io', phone: '(555) 333-4444', balance: 0 },
];

router.get('/', async (_req, res) => {
  if (!useDatabase()) {
    res.json({ customers: mockCustomers });
    return;
  }
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
  if (!useDatabase()) {
    const customer = mockCustomers.find((c) => c.id === req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ customer });
    return;
  }
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
  const name = req.body.name ?? 'New Customer';
  const code = req.body.code ?? `C-${Date.now().toString(36).toUpperCase()}`;
  const email = req.body.email ?? '';
  const phone = req.body.phone ?? '';

  if (!useDatabase()) {
    const customer = {
      id: `c-${Date.now()}`,
      code,
      name,
      email,
      phone,
      balance: 0,
    };
    mockCustomers = [...mockCustomers, customer];
    res.status(201).json({ customer });
    return;
  }

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

  if (!useDatabase()) {
    const idx = mockCustomers.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const prev = mockCustomers[idx];
    const next = {
      ...prev,
      ...(typeof data.name === 'string' ? { name: data.name } : {}),
      ...(typeof data.email === 'string' ? { email: data.email } : {}),
      ...(typeof data.phone === 'string' ? { phone: data.phone } : {}),
      ...(typeof data.code === 'string' ? { code: data.code } : {}),
    };
    mockCustomers = mockCustomers.map((c, i) => (i === idx ? next : c));
    res.json({ customer: next });
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
