// API routes for AP vendors (demo)

import { Router } from 'express';

const router = Router();

const mockVendors = [
  { id: 'v1', name: 'Office Depot', email: 'ap@officedepot.com', phone: '(555) 100-2000', balance: 1250 },
  { id: 'v2', name: 'Tech Solutions', email: 'invoices@techsol.com', phone: '(555) 200-3000', balance: 3500 },
];

router.get('/', (_req, res) => {
  res.json({ vendors: mockVendors });
});

router.get('/:id', (req, res) => {
  const vendor = mockVendors.find(v => v.id === req.params.id);
  if (!vendor) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }
  res.json({ vendor });
});

router.post('/', (req, res) => {
  const vendor = {
    id: `v-${Date.now()}`,
    name: req.body.name ?? 'New Vendor',
    email: req.body.email ?? '',
    phone: req.body.phone ?? '',
    balance: 0,
  };
  res.status(201).json({ vendor });
});

export { router as vendorsRouter };
