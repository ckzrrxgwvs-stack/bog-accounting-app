/**
 * ERP logistics — carriers, locations, shipments & docs, ASN, RMA, lot/serial, freight audit, barcodes.
 */
import { Router } from 'express';
import {
  BarcodeSymbology,
  FreightChargeCategory,
  FreightTerms,
  InboundAsnStatus,
  LotStatus,
  Prisma,
  RmaStatus,
  SerialStatus,
  ShipmentDocumentType,
  ShipmentEventType,
  ShipmentStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { dec } from '../lib/serialize';
import { buildBarcodeSvg } from '../lib/barcodeSvg';

const router = Router();

function docNum(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

router.get('/carriers', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.carrier.findMany({
      where: { companyId: company.id },
      orderBy: { name: 'asc' },
    });
    res.json({ carriers: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/carriers', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    name?: string;
    scacCode?: string;
    accountNumber?: string;
    mcNumber?: string;
    dotNumber?: string;
    website?: string;
    apiNotes?: string;
  };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.carrier.create({
      data: {
        companyId: company.id,
        name: body.name.trim(),
        scacCode: body.scacCode ?? null,
        accountNumber: body.accountNumber ?? null,
        mcNumber: body.mcNumber ?? null,
        dotNumber: body.dotNumber ?? null,
        website: body.website ?? null,
        apiNotes: body.apiNotes ?? null,
      },
    });
    res.status(201).json({ carrier: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create carrier' });
  }
});

router.get('/warehouse-locations', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.warehouseLocation.findMany({
      where: { companyId: company.id },
      orderBy: { code: 'asc' },
    });
    res.json({ locations: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/warehouse-locations', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as { code?: string; name?: string; zone?: string; aisle?: string; bin?: string };
  if (!body.code?.trim() || !body.name?.trim()) {
    res.status(400).json({ error: 'code and name required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.warehouseLocation.create({
      data: {
        companyId: company.id,
        code: body.code.trim(),
        name: body.name.trim(),
        zone: body.zone ?? null,
        aisle: body.aisle ?? null,
        bin: body.bin ?? null,
      },
    });
    res.status(201).json({ location: row });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Location code already exists' : 'Could not create location' });
  }
});

router.get('/customer-shipping/:customerId', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const profile = await prisma.customerShippingProfile.findFirst({
      where: { companyId: company.id, customerId: req.params.customerId },
      include: { defaultCarrier: true, defaultShipFromLocation: true },
    });
    res.json({ profile });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.put('/customer-shipping/:customerId', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    defaultCarrierId?: string | null;
    defaultShipFromLocationId?: string | null;
    shippingInstructions?: string | null;
    labelFormat?: string | null;
    commercialInvoiceNotes?: string | null;
    hazmatNotes?: string | null;
  };
  try {
    const company = await getOrCreateDefaultCompany();
    const cust = await prisma.customer.findFirst({
      where: { id: req.params.customerId, companyId: company.id },
    });
    if (!cust) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const profile = await prisma.customerShippingProfile.upsert({
      where: { customerId: req.params.customerId },
      create: {
        companyId: company.id,
        customerId: req.params.customerId,
        defaultCarrierId: body.defaultCarrierId ?? null,
        defaultShipFromLocationId: body.defaultShipFromLocationId ?? null,
        shippingInstructions: body.shippingInstructions ?? null,
        labelFormat: body.labelFormat ?? null,
        commercialInvoiceNotes: body.commercialInvoiceNotes ?? null,
        hazmatNotes: body.hazmatNotes ?? null,
      },
      update: {
        defaultCarrierId: body.defaultCarrierId ?? undefined,
        defaultShipFromLocationId: body.defaultShipFromLocationId ?? undefined,
        shippingInstructions: body.shippingInstructions ?? undefined,
        labelFormat: body.labelFormat ?? undefined,
        commercialInvoiceNotes: body.commercialInvoiceNotes ?? undefined,
        hazmatNotes: body.hazmatNotes ?? undefined,
      },
      include: { defaultCarrier: true, defaultShipFromLocation: true },
    });
    res.json({ profile });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not save shipping profile' });
  }
});

router.get('/lots', async (req, res) => {
  if (!requireDatabase(res)) return;
  const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined;
  try {
    const company = await getOrCreateDefaultCompany();
    const lots = await prisma.inventoryLot.findMany({
      where: { companyId: company.id, ...(itemId ? { inventoryItemId: itemId } : {}) },
      include: { item: { select: { sku: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({
      lots: lots.map((l) => ({
        ...l,
        quantityOnHand: dec(l.quantityOnHand as never),
        unitCost: l.unitCost ? dec(l.unitCost as never) : null,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/lots', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    inventoryItemId?: string;
    lotNumber?: string;
    manufactureDate?: string;
    expiryDate?: string;
    supplierLot?: string;
    quantityOnHand?: number;
    unitCost?: number;
    notes?: string;
  };
  if (!body.inventoryItemId || !body.lotNumber?.trim()) {
    res.status(400).json({ error: 'inventoryItemId and lotNumber required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const item = await prisma.inventoryItem.findFirst({
      where: { id: body.inventoryItemId, companyId: company.id },
    });
    if (!item) {
      res.status(400).json({ error: 'Item not found' });
      return;
    }
    const qty = Number(body.quantityOnHand ?? 0);
    const row = await prisma.inventoryLot.create({
      data: {
        companyId: company.id,
        inventoryItemId: item.id,
        lotNumber: body.lotNumber.trim(),
        manufactureDate: body.manufactureDate ? new Date(body.manufactureDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        supplierLot: body.supplierLot ?? null,
        quantityOnHand: new Prisma.Decimal(String(Number.isFinite(qty) ? qty : 0)),
        unitCost:
          body.unitCost != null && Number.isFinite(Number(body.unitCost))
            ? new Prisma.Decimal(String(body.unitCost))
            : null,
        notes: body.notes ?? null,
      },
    });
    res.status(201).json({ lot: row });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Lot number exists for this item' : 'Could not create lot' });
  }
});

router.patch('/lots/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const existing = await prisma.inventoryLot.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const body = req.body as {
      status?: string;
      quantityOnHand?: number;
      notes?: string;
    };
    const row = await prisma.inventoryLot.update({
      where: { id: existing.id },
      data: {
        ...(body.status && Object.values(LotStatus).includes(body.status as LotStatus)
          ? { status: body.status as LotStatus }
          : {}),
        ...(body.quantityOnHand != null && Number.isFinite(body.quantityOnHand)
          ? { quantityOnHand: new Prisma.Decimal(String(body.quantityOnHand)) }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    res.json({ lot: row });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

router.get('/serials', async (req, res) => {
  if (!requireDatabase(res)) return;
  const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.inventorySerial.findMany({
      where: { companyId: company.id, ...(itemId ? { inventoryItemId: itemId } : {}) },
      include: { item: { select: { sku: true } }, lot: true, warehouseLocation: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ serials: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/serials', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    inventoryItemId?: string;
    inventoryLotId?: string | null;
    warehouseLocationId?: string | null;
    serialNumber?: string;
    status?: SerialStatus;
    notes?: string;
  };
  if (!body.inventoryItemId || !body.serialNumber?.trim()) {
    res.status(400).json({ error: 'inventoryItemId and serialNumber required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.inventorySerial.create({
      data: {
        companyId: company.id,
        inventoryItemId: body.inventoryItemId,
        inventoryLotId: body.inventoryLotId ?? null,
        warehouseLocationId: body.warehouseLocationId ?? null,
        serialNumber: body.serialNumber.trim(),
        status: body.status ?? SerialStatus.AVAILABLE,
        notes: body.notes ?? null,
      },
    });
    res.status(201).json({ serial: row });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'Serial number already exists' : 'Could not create serial' });
  }
});

router.get('/shipments', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.shipment.findMany({
      where: { companyId: company.id },
      include: { carrier: true, customer: { select: { name: true, code: true } }, salesOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ shipments: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/shipments', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    customerId?: string;
    salesOrderId?: string | null;
    carrierId?: string | null;
    freightTerms?: FreightTerms;
    masterBolNumber?: string | null;
    trackingNumber?: string | null;
    shipDate?: string;
    packageCount?: number;
    lines?: {
      description: string;
      quantity: number;
      salesOrderLineId?: string | null;
      inventoryItemId?: string | null;
      packageNumber?: number;
      inventoryLotId?: string | null;
      warehouseLocationId?: string | null;
      serialNumbersSnapshot?: unknown;
    }[];
  };
  if (!body.customerId) {
    res.status(400).json({ error: 'customerId required' });
    return;
  }
  const linesIn = Array.isArray(body.lines) ? body.lines : [];
  if (linesIn.length === 0) {
    res.status(400).json({ error: 'At least one shipment line required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const cust = await prisma.customer.findFirst({
      where: { id: body.customerId, companyId: company.id },
    });
    if (!cust) {
      res.status(400).json({ error: 'Customer not found' });
      return;
    }
    const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}`;
    const created = await prisma.shipment.create({
      data: {
        companyId: company.id,
        shipmentNumber,
        customerId: cust.id,
        salesOrderId: body.salesOrderId ?? null,
        carrierId: body.carrierId ?? null,
        freightTerms: body.freightTerms ?? FreightTerms.PREPAID,
        masterBolNumber: body.masterBolNumber ?? null,
        trackingNumber: body.trackingNumber ?? null,
        shipDate: body.shipDate ? new Date(body.shipDate) : null,
        packageCount: body.packageCount ?? 1,
        lines: {
          create: linesIn.map((ln) => ({
            description: ln.description,
            quantity: new Prisma.Decimal(String(ln.quantity)),
            salesOrderLineId: ln.salesOrderLineId ?? null,
            inventoryItemId: ln.inventoryItemId ?? null,
            packageNumber: ln.packageNumber ?? 1,
            inventoryLotId: ln.inventoryLotId ?? null,
            warehouseLocationId: ln.warehouseLocationId ?? null,
            serialNumbersSnapshot: ln.serialNumbersSnapshot ?? undefined,
          })),
        },
        events: {
          create: {
            eventType: ShipmentEventType.CREATED,
            source: 'USER',
            reference: shipmentNumber,
          },
        },
      },
      include: { lines: true, events: true },
    });
    res.status(201).json({ shipment: created });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create shipment' });
  }
});

router.get('/shipments/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: company.id },
      include: {
        lines: true,
        documents: true,
        events: { orderBy: { occurredAt: 'asc' } },
        freightCharges: true,
        carrier: true,
        customer: true,
        salesOrder: true,
      },
    });
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ shipment: row });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.patch('/shipments/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const existing = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const body = req.body as {
      status?: ShipmentStatus;
      carrierId?: string | null;
      trackingNumber?: string | null;
      masterBolNumber?: string | null;
      deliveredAt?: string | null;
      confirmationNotes?: string | null;
      confirmationReceivedAt?: string | null;
    };
    const row = await prisma.shipment.update({
      where: { id: existing.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.carrierId !== undefined ? { carrierId: body.carrierId } : {}),
        ...(body.trackingNumber !== undefined ? { trackingNumber: body.trackingNumber } : {}),
        ...(body.masterBolNumber !== undefined ? { masterBolNumber: body.masterBolNumber } : {}),
        ...(body.deliveredAt !== undefined
          ? { deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : null }
          : {}),
        ...(body.confirmationNotes !== undefined ? { confirmationNotes: body.confirmationNotes } : {}),
        ...(body.confirmationReceivedAt !== undefined
          ? {
              confirmationReceivedAt: body.confirmationReceivedAt
                ? new Date(body.confirmationReceivedAt)
                : null,
            }
          : {}),
      },
    });
    res.json({ shipment: row });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

router.post('/shipments/:id/events', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    eventType?: ShipmentEventType;
    source?: string;
    reference?: string;
    metadata?: unknown;
  };
  if (!body.eventType || !Object.values(ShipmentEventType).includes(body.eventType)) {
    res.status(400).json({ error: 'Valid eventType required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const sh = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!sh) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }
    const ev = await prisma.shipmentEvent.create({
      data: {
        shipmentId: sh.id,
        eventType: body.eventType,
        source: body.source ?? 'USER',
        reference: body.reference ?? null,
        metadata: body.metadata === undefined ? undefined : (body.metadata as object),
      },
    });
    res.status(201).json({ event: ev });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not record event' });
  }
});

router.post('/shipments/:id/documents', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    documentType?: ShipmentDocumentType;
    documentNumber?: string;
    templateKey?: string | null;
    payload?: unknown;
    notes?: string | null;
  };
  if (!body.documentType || !Object.values(ShipmentDocumentType).includes(body.documentType)) {
    res.status(400).json({ error: 'documentType required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const sh = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!sh) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }
    const doc = await prisma.shipmentDocument.create({
      data: {
        companyId: company.id,
        shipmentId: sh.id,
        documentType: body.documentType,
        documentNumber: body.documentNumber?.trim() || docNum('DOC'),
        templateKey: body.templateKey ?? null,
        payload: body.payload === undefined ? undefined : (body.payload as object),
        notes: body.notes ?? null,
      },
    });
    res.status(201).json({ document: doc });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create document' });
  }
});

/** Creates common compliance document placeholders (BOL, packing slip/list, commercial invoice, ASN, label record). */
router.post('/shipments/:id/issue-standard-docs', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const sh = await prisma.shipment.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!sh) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }
    const types: ShipmentDocumentType[] = [
      ShipmentDocumentType.BOL,
      ShipmentDocumentType.PACKING_SLIP,
      ShipmentDocumentType.PACKING_LIST,
      ShipmentDocumentType.COMMERCIAL_INVOICE,
      ShipmentDocumentType.ADVANCED_SHIPPING_NOTICE,
      ShipmentDocumentType.SHIPPING_LABEL,
      ShipmentDocumentType.SHIPMENT_CONFIRMATION,
    ];
    const docs = await prisma.$transaction(
      types.map((documentType) =>
        prisma.shipmentDocument.create({
          data: {
            companyId: company.id,
            shipmentId: sh.id,
            documentType,
            documentNumber: docNum(documentType),
          },
        })
      )
    );
    res.status(201).json({ documents: docs });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not issue documents' });
  }
});

router.get('/asn', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.inboundAsn.findMany({
      where: { companyId: company.id },
      include: { vendor: { select: { name: true, code: true } }, purchaseOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ asns: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/asn', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    vendorId?: string;
    purchaseOrderId?: string | null;
    asnNumber?: string;
    expectedDate?: string;
    payload?: unknown;
    notes?: string;
  };
  if (!body.vendorId || !body.asnNumber?.trim()) {
    res.status(400).json({ error: 'vendorId and asnNumber required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const vend = await prisma.vendor.findFirst({
      where: { id: body.vendorId, companyId: company.id },
    });
    if (!vend) {
      res.status(400).json({ error: 'Vendor not found' });
      return;
    }
    const row = await prisma.inboundAsn.create({
      data: {
        companyId: company.id,
        vendorId: vend.id,
        purchaseOrderId: body.purchaseOrderId ?? null,
        asnNumber: body.asnNumber.trim(),
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        payload: body.payload === undefined ? undefined : (body.payload as object),
        notes: body.notes ?? null,
      },
    });
    res.status(201).json({ asn: row });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'ASN number exists' : 'Could not create ASN' });
  }
});

router.patch('/asn/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as { status?: InboundAsnStatus; receivedJson?: unknown };
  try {
    const company = await getOrCreateDefaultCompany();
    const existing = await prisma.inboundAsn.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const row = await prisma.inboundAsn.update({
      where: { id: existing.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.receivedJson !== undefined ? { receivedJson: body.receivedJson as object } : {}),
      },
    });
    res.json({ asn: row });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

router.get('/rma', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.rmaHeader.findMany({
      where: { companyId: company.id },
      include: { customer: { select: { name: true } }, lines: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ rmas: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/rma', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    customerId?: string;
    salesOrderId?: string | null;
    rmaNumber?: string;
    reason?: string;
    lines?: { inventoryItemId: string; quantityAuth: number; inventoryLotId?: string | null; reason?: string }[];
  };
  if (!body.customerId || !Array.isArray(body.lines) || body.lines.length === 0) {
    res.status(400).json({ error: 'customerId and lines[] required' });
    return;
  }
  const rmaNumber = body.rmaNumber?.trim() || `RMA-${Date.now().toString(36).toUpperCase()}`;
  try {
    const company = await getOrCreateDefaultCompany();
    const cust = await prisma.customer.findFirst({
      where: { id: body.customerId, companyId: company.id },
    });
    if (!cust) {
      res.status(400).json({ error: 'Customer not found' });
      return;
    }
    const created = await prisma.rmaHeader.create({
      data: {
        companyId: company.id,
        customerId: cust.id,
        salesOrderId: body.salesOrderId ?? null,
        rmaNumber,
        reason: body.reason ?? null,
        lines: {
          create: body.lines.map((ln) => ({
            inventoryItemId: ln.inventoryItemId,
            quantityAuth: new Prisma.Decimal(String(ln.quantityAuth)),
            inventoryLotId: ln.inventoryLotId ?? null,
            reason: ln.reason ?? null,
          })),
        },
      },
      include: { lines: true },
    });
    res.status(201).json({ rma: created });
  } catch (e: unknown) {
    console.error(e);
    const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
    res.status(400).json({ error: dup ? 'RMA number exists' : 'Could not create RMA' });
  }
});

router.patch('/rma/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    status?: RmaStatus;
    authorizedAt?: string | null;
    receivedAt?: string | null;
    notes?: string | null;
  };
  try {
    const company = await getOrCreateDefaultCompany();
    const existing = await prisma.rmaHeader.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const row = await prisma.rmaHeader.update({
      where: { id: existing.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.authorizedAt !== undefined
          ? { authorizedAt: body.authorizedAt ? new Date(body.authorizedAt) : null }
          : {}),
        ...(body.receivedAt !== undefined
          ? { receivedAt: body.receivedAt ? new Date(body.receivedAt) : null }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    res.json({ rma: row });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

router.get('/freight-charges', async (req, res) => {
  if (!requireDatabase(res)) return;
  const shipmentId = typeof req.query.shipmentId === 'string' ? req.query.shipmentId : undefined;
  try {
    const company = await getOrCreateDefaultCompany();
    const rows = await prisma.freightCharge.findMany({
      where: { companyId: company.id, ...(shipmentId ? { shipmentId } : {}) },
      include: { carrier: true, shipment: { select: { shipmentNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ freightCharges: rows });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/freight-charges', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    shipmentId?: string | null;
    carrierId?: string | null;
    carrierInvoiceRef?: string | null;
    category?: string;
    description?: string | null;
    bookedAmount?: number | null;
    invoicedAmount?: number | null;
    auditedAmount?: number | null;
    currency?: string;
    varianceNotes?: string | null;
  };
  try {
    const company = await getOrCreateDefaultCompany();
    const cat =
      body.category && Object.values(FreightChargeCategory).includes(body.category as FreightChargeCategory)
        ? (body.category as FreightChargeCategory)
        : FreightChargeCategory.FREIGHT;
    const row = await prisma.freightCharge.create({
      data: {
        companyId: company.id,
        shipmentId: body.shipmentId ?? null,
        carrierId: body.carrierId ?? null,
        carrierInvoiceRef: body.carrierInvoiceRef ?? null,
        category: cat,
        description: body.description ?? null,
        bookedAmount:
          body.bookedAmount != null ? new Prisma.Decimal(String(body.bookedAmount)) : null,
        invoicedAmount:
          body.invoicedAmount != null ? new Prisma.Decimal(String(body.invoicedAmount)) : null,
        auditedAmount:
          body.auditedAmount != null ? new Prisma.Decimal(String(body.auditedAmount)) : null,
        currency: body.currency ?? 'USD',
        varianceNotes: body.varianceNotes ?? null,
      },
    });
    res.status(201).json({ freightCharge: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not create freight charge' });
  }
});

router.post('/barcodes', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    symbology?: BarcodeSymbology;
    payload?: string;
    humanReadable?: string | null;
    linkType?: string;
    linkId?: string | null;
    issuedBy?: string | null;
  };
  if (!body.payload?.trim()) {
    res.status(400).json({ error: 'payload required' });
    return;
  }
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.logisticsBarcode.create({
      data: {
        companyId: company.id,
        symbology: body.symbology ?? BarcodeSymbology.CODE128,
        payload: body.payload.trim(),
        humanReadable: body.humanReadable ?? null,
        linkType: body.linkType ?? 'CUSTOM',
        linkId: body.linkId ?? null,
        issuedBy: body.issuedBy ?? null,
      },
    });
    res.status(201).json({
      barcode: row,
      svgUrl: `/api/logistics/barcodes/${row.id}/svg`,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not issue barcode' });
  }
});

router.get('/barcodes/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.logisticsBarcode.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ barcode: row });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/barcodes/:id/svg', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const row = await prisma.logisticsBarcode.findFirst({
      where: { id: req.params.id, companyId: company.id },
    });
    if (!row) {
      res.status(404).send('Not found');
      return;
    }
    const svg = buildBarcodeSvg(row.payload, row.humanReadable);
    res.type('image/svg+xml').send(svg);
  } catch (e) {
    console.error(e);
    res.status(503).send('Error');
  }
});

export { router as logisticsRouter };
