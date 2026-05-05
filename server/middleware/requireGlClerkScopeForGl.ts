import type { Request, RequestHandler } from 'express';
import { InvoiceType, UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import type { GlAuthPayload } from './requireJwtForGl';
import { inferArApFromApplications } from '../services/paymentGlPost';

/** Roles that may post any AR/AP document to GL (clerks are scoped separately). */
const UNRESTRICTED_GL_ROLES = new Set<UserRoleType>([
  UserRoleType.PRESIDENT,
  UserRoleType.CFO,
  UserRoleType.CONTROLLER,
  UserRoleType.ACCOUNTANT,
]);

function invoiceIsAr(type: InvoiceType): boolean {
  return type === InvoiceType.AR_INVOICE || type === InvoiceType.AR_CREDIT_MEMO;
}

function invoiceIsAp(type: InvoiceType): boolean {
  return type === InvoiceType.AP_INVOICE || type === InvoiceType.AP_CREDIT_MEMO;
}

/**
 * AR clerks: only AR invoices/credit memos. AP clerks: only AP invoices/credit memos.
 * Other posting roles skip this check.
 */
export const requireInvoiceGlClerkScope: RequestHandler = async (req, res, next) => {
  if (!databaseConfigured() || process.env.SKIP_GL_AUTH === 'true') {
    next();
    return;
  }

  const auth = req as Request & { glAuth?: GlAuthPayload };
  const role = auth.glAuth?.role as UserRoleType | undefined;
  const companyId = auth.glAuth?.companyId;

  if (!role || UNRESTRICTED_GL_ROLES.has(role)) {
    next();
    return;
  }

  if (!companyId) {
    res.status(403).json({ error: 'Company scope required for posting rules' });
    return;
  }

  const invoiceId = req.params.id;
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { type: true },
  });

  if (!inv) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (role === UserRoleType.AR_CLERK && !invoiceIsAr(inv.type)) {
    res.status(403).json({ error: 'AR clerks may only post AR invoices to the general ledger' });
    return;
  }
  if (role === UserRoleType.AP_CLERK && !invoiceIsAp(inv.type)) {
    res.status(403).json({ error: 'AP clerks may only post AP invoices to the general ledger' });
    return;
  }

  next();
};

/**
 * AR clerks: only payments applied to AR invoices. AP clerks: only payments applied to AP invoices.
 */
export const requirePaymentGlClerkScope: RequestHandler = async (req, res, next) => {
  if (!databaseConfigured() || process.env.SKIP_GL_AUTH === 'true') {
    next();
    return;
  }

  const auth = req as Request & { glAuth?: GlAuthPayload };
  const role = auth.glAuth?.role as UserRoleType | undefined;
  const companyId = auth.glAuth?.companyId;

  if (!role || UNRESTRICTED_GL_ROLES.has(role)) {
    next();
    return;
  }

  if (!companyId) {
    res.status(403).json({ error: 'Company scope required for posting rules' });
    return;
  }

  const pay = await prisma.payment.findFirst({
    where: { id: req.params.id, companyId },
    include: {
      invoices: { include: { invoice: { select: { type: true } } } },
    },
  });

  if (!pay) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  const mode = inferArApFromApplications(
    pay.invoices.map((x) => ({ invoice: { type: x.invoice.type } }))
  );

  if (!mode) {
    res.status(400).json({
      error: 'Payment has no invoice applications — assign invoices before posting or scope checks',
    });
    return;
  }

  if (role === UserRoleType.AR_CLERK && mode !== 'AR') {
    res.status(403).json({ error: 'AR clerks may only post AR payments to the general ledger' });
    return;
  }
  if (role === UserRoleType.AP_CLERK && mode !== 'AP') {
    res.status(403).json({ error: 'AP clerks may only post AP payments to the general ledger' });
    return;
  }

  next();
};
