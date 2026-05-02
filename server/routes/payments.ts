import { Router } from 'express';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';

const router = Router();

const mockPayments = [
  { id: 'p1', date: '2026-04-20', amount: 5200, method: 'ACH', reference: 'PMT-001', type: 'AR' as const },
  { id: 'p2', date: '2026-04-18', amount: 2200, method: 'WIRE_TRANSFER', reference: 'PMT-002', type: 'AP' as const },
];

function parsePaymentMethod(raw: string | undefined): PaymentMethod {
  if (!raw) return 'CHECK';
  const s = String(raw).toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, PaymentMethod> = {
    CHECK: 'CHECK',
    CASH: 'CASH',
    ACH: 'ACH',
    WIRE: 'WIRE_TRANSFER',
    WIRE_TRANSFER: 'WIRE_TRANSFER',
    CREDIT_CARD: 'CREDIT_CARD',
    CARD: 'CREDIT_CARD',
    OTHER: 'OTHER',
  };
  return map[s] ?? 'OTHER';
}

function inferPaymentType(
  apps: { invoice: { type: string } }[] | undefined
): 'AR' | 'AP' {
  if (!apps?.length) return 'AR';
  const ap = apps.some((a) => a.invoice.type.startsWith('AP'));
  return ap ? 'AP' : 'AR';
}

function mapPaymentRow(p: {
  id: string;
  paymentNumber: string;
  date: Date;
  amount: unknown;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  appliedAmount: unknown;
  invoices?: { invoice: { type: string } }[];
}) {
  return {
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    amount: dec(p.amount as never),
    method: p.method,
    reference: p.reference ?? p.paymentNumber,
    type: inferPaymentType(p.invoices),
    status: p.status,
    appliedAmount: dec(p.appliedAmount as never),
  };
}

router.get('/', async (req, res) => {
  const { type } = req.query;

  if (!useDatabase()) {
    let list = [...mockPayments];
    if (type === 'AR' || type === 'AP') list = list.filter((p) => p.type === type);
    res.json({ payments: list });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.payment.findMany({
      where: { companyId: company.id },
      include: {
        invoices: { include: { invoice: { select: { type: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    let mapped = rows.map(mapPaymentRow);
    if (type === 'AR' || type === 'AP') {
      mapped = mapped.filter((p) => p.type === type);
    }
    res.json({ payments: mapped });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body as {
    date?: string;
    amount?: number;
    method?: string;
    reference?: string;
    type?: 'AR' | 'AP';
    invoiceId?: string;
    applyAmount?: number;
  };

  if (!useDatabase()) {
    const payment = {
      id: `p-${Date.now()}`,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      amount: Number(body.amount) || 0,
      method: parsePaymentMethod(body.method),
      reference: body.reference ?? '',
      type: body.type ?? 'AR',
    };
    res.status(201).json({ payment });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const amt = Number(body.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'Valid amount required' });
      return;
    }

    const paymentNumber = body.reference?.startsWith('PMT-')
      ? body.reference
      : `PMT-${Date.now()}`;
    const d = body.date ? new Date(body.date) : new Date();
    const method = parsePaymentMethod(body.method);

    let apply = 0;
    let invoiceConnect:
      | { create: { amount: number; invoiceId: string } }
      | undefined;

    if (body.invoiceId) {
      const applyAmt = Number(body.applyAmount ?? amt);
      const inv = await prisma.invoice.findFirst({
        where: { id: body.invoiceId, companyId: company.id },
      });
      if (!inv) {
        res.status(400).json({ error: 'Invoice not found' });
        return;
      }
      apply = Math.min(applyAmt, dec(inv.balance), amt);
      invoiceConnect = {
        create: { amount: apply, invoiceId: inv.id },
      };
    }

    const created = await prisma.payment.create({
      data: {
        companyId: company.id,
        paymentNumber,
        date: d,
        amount: amt,
        method,
        reference: body.reference ?? null,
        status: 'PROCESSED' as PaymentStatus,
        appliedAmount: apply,
        ...(invoiceConnect ? { invoices: invoiceConnect } : {}),
      },
      include: {
        invoices: { include: { invoice: { select: { type: true } } } },
      },
    });

    if (body.invoiceId && created.invoices.length > 0) {
      const invId = body.invoiceId;
      const inv = await prisma.invoice.findFirst({ where: { id: invId } });
      if (inv) {
        const paid = dec(inv.paidAmount) + dec(created.appliedAmount);
        const bal = Math.max(0, dec(inv.total) - paid);
        await prisma.invoice.update({
          where: { id: invId },
          data: {
            paidAmount: paid,
            balance: bal,
            status: bal <= 0.005 ? 'PAID' : paid > 0 ? 'PARTIAL' : inv.status,
          },
        });
      }
    }

    res.status(201).json({
      payment: mapPaymentRow({
        ...created,
        invoices: created.invoices.map((x) => ({
          invoice: x.invoice,
        })),
      }),
    });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Payment reference already exists' : 'Could not create payment' });
  }
});

router.get('/:id', async (req, res) => {
  if (!useDatabase()) {
    const p = mockPayments.find((x) => x.id === req.params.id);
    if (!p) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({ payment: p });
    return;
  }

  try {
    const row = await prisma.payment.findFirst({
      where: { id: req.params.id },
      include: {
        invoices: {
          include: {
            invoice: { include: { customer: true, vendor: true } },
          },
        },
      },
    });
    if (!row) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({
      payment: {
        ...mapPaymentRow({
          ...row,
          invoices: row.invoices.map((app) => ({
            invoice: { type: app.invoice.type },
          })),
        }),
        applications: row.invoices.map((app) => ({
          invoiceId: app.invoiceId,
          amount: dec(app.amount),
          invoice: app.invoice,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as paymentsRouter };
