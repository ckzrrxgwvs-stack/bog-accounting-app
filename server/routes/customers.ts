// API routes for AR customers (demo)

import { Router } from 'express';

const router = Router();

const mockCustomers = [
  { id: 'c1', name: 'Acme Corporation', email: 'ap@acme.com', phone: '(555) 111-2222', balance: 5200 },
  { id: 'c2', name: 'TechStart Inc', email: 'billing@techstart.io', phone: '(555) 333-4444', balance: 0 },
];

router.get('/', (_req, res) => {
  res.json({ customers: mockCustomers });
});

router.get('/:id', (req, res) => {
  const customer = mockCustomers.find(c => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json({ customer });
});

router.post('/', (req, res) => {
  const customer = {
    id: `c-${Date.now()}`,
    name: req.body.name ?? 'New Customer',
    email: req.body.email ?? '',
    phone: req.body.phone ?? '',
    balance: 0,
  };
  res.status(201).json({ customer });
});

export { router as customersRouter };
