// API routes for payments (demo)

import { Router } from 'express';

const router = Router();

const mockPayments = [
  { id: 'p1', date: '2026-04-20', amount: 5200, method: 'ACH', reference: 'PMT-001', type: 'AR' },
  { id: 'p2', date: '2026-04-18', amount: 2200, method: 'Wire', reference: 'PMT-002', type: 'AP' },
];

router.get('/', (_req, res) => {
  res.json({ payments: mockPayments });
});

router.post('/', (req, res) => {
  const payment = {
    id: `p-${Date.now()}`,
    date: req.body.date ?? new Date().toISOString().slice(0, 10),
    amount: Number(req.body.amount) || 0,
    method: req.body.method ?? 'CHECK',
    reference: req.body.reference ?? '',
    type: req.body.type ?? 'AR',
  };
  res.status(201).json({ payment });
});

export { router as paymentsRouter };
