import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

const mockCustomers = [
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

export { router as customersRouter };
