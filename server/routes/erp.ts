/**
 * ERP workspace aggregate endpoints — cross-module counts for operational dashboards
 * (conceptually similar to role-based ERP landing pages; implementation is BOG-Pi–specific).
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

const router = Router();

router.get('/summary', async (_req, res) => {
  if (!useDatabase()) {
    res.json({
      purchaseOrders: { draft: 0, open: 0, closed: 0 },
      salesOrders: { draft: 0, open: 0, closed: 0 },
      logistics: { shipmentsOpen: 0, asnInFlight: 0, rmaOpen: 0 },
      hint: 'Connect DATABASE_URL for live ERP order counts.',
    });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const cid = company.id;

    const [
      poDraft,
      poOpen,
      poClosed,
      soDraft,
      soOpen,
      soClosed,
      logisticsShipmentsOpen,
      logisticsAsnOpen,
      logisticsRmaOpen,
    ] = await Promise.all([
      prisma.purchaseOrder.count({ where: { companyId: cid, status: 'DRAFT' } }),
      prisma.purchaseOrder.count({
        where: {
          companyId: cid,
          status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] },
        },
      }),
      prisma.purchaseOrder.count({ where: { companyId: cid, status: 'CLOSED' } }),
      prisma.salesOrder.count({ where: { companyId: cid, status: 'DRAFT' } }),
      prisma.salesOrder.count({
        where: {
          companyId: cid,
          status: { in: ['CONFIRMED', 'PARTIALLY_SHIPPED'] },
        },
      }),
      prisma.salesOrder.count({ where: { companyId: cid, status: 'CLOSED' } }),
      prisma.shipment.count({
        where: {
          companyId: cid,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
      }),
      prisma.inboundAsn.count({
        where: {
          companyId: cid,
          status: { in: ['EXPECTED', 'PARTIALLY_RECEIVED'] },
        },
      }),
      prisma.rmaHeader.count({
        where: {
          companyId: cid,
          status: { notIn: ['CLOSED', 'CANCELLED'] },
        },
      }),
    ]);

    res.json({
      purchaseOrders: { draft: poDraft, open: poOpen, closed: poClosed },
      salesOrders: { draft: soDraft, open: soOpen, closed: soClosed },
      logistics: {
        shipmentsOpen: logisticsShipmentsOpen,
        asnInFlight: logisticsAsnOpen,
        rmaOpen: logisticsRmaOpen,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

export { router as erpRouter };
