/**
 * Shopify connector — orders/paid webhook → AccountingEvent → bookkeeper.
 */
import { Router } from 'express';
import type { Request } from 'express';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import { verifyShopifyWebhookHmac } from '../services/connectors/shopifyVerify';
import {
  mapShopifyOrderToSalePayload,
  shopifyOrderExternalId,
  type ShopifyOrderBody,
} from '../services/connectors/shopifyOrderMapper';
import { ingestAccountingEvent } from '../services/agentOrg/ingestEvent';
import { runBookkeeperJob } from '../services/agentOrg/bookkeeperJob';

const router = Router();

type ReqWithRaw = Request & { rawBody?: Buffer };

router.use((_req, res, next) => {
  if (!databaseConfigured()) {
    res.status(503).json({ error: 'Database required for Shopify connector' });
    return;
  }
  next();
});

/** POST /api/connectors/shopify/webhook — Shopify orders/paid (HMAC verified). */
router.post('/webhook', async (req, res) => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: 'SHOPIFY_WEBHOOK_SECRET not configured' });
    return;
  }

  const raw = (req as ReqWithRaw).rawBody;
  if (!raw || !Buffer.isBuffer(raw)) {
    res.status(400).json({ error: 'Raw body required for webhook verification' });
    return;
  }

  const hmac = req.get('x-shopify-hmac-sha256') ?? undefined;
  if (!verifyShopifyWebhookHmac(raw, hmac, secret)) {
    res.status(401).json({ error: 'Invalid Shopify HMAC' });
    return;
  }

  const topic = req.get('x-shopify-topic') ?? '';
  if (topic && topic !== 'orders/paid') {
    res.status(200).json({ ok: true, ignored: true, topic });
    return;
  }

  const shopDomain = (req.get('x-shopify-shop-domain') ?? '').toLowerCase();
  let company = await getOrCreateDefaultCompany();

  if (shopDomain) {
    const matched = await prisma.company.findFirst({
      where: {
        useShopifyConnector: true,
        shopifyStoreDomain: { equals: shopDomain, mode: 'insensitive' },
      },
    });
    if (matched) company = matched;
    else if (process.env.SHOPIFY_STORE_DOMAIN?.toLowerCase() !== shopDomain) {
      res.status(403).json({ error: 'Shop domain not registered for this tenant' });
      return;
    }
  }

  let order: ShopifyOrderBody;
  try {
    order = JSON.parse(raw.toString('utf8')) as ShopifyOrderBody;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const externalId = shopifyOrderExternalId(order);
  if (!externalId) {
    res.status(400).json({ error: 'Order id missing' });
    return;
  }

  try {
    const payload = mapShopifyOrderToSalePayload(order);
    const ingested = await ingestAccountingEvent({
      companyId: company.id,
      source: 'SHOPIFY',
      eventType: 'SALE_ORDER_PAID',
      externalId,
      idempotencyKey: `shopify:order:${externalId}`,
      payload: payload as unknown as Record<string, unknown>,
    });

    let bookkeeper = null;
    if (!ingested.replay && process.env.SHOPIFY_AUTO_RUN_BOOKKEEPER !== 'false') {
      bookkeeper = await runBookkeeperJob(company.id);
    }

    res.status(ingested.replay ? 200 : 201).json({
      ok: true,
      idempotentReplay: ingested.replay,
      eventId: ingested.event.id,
      bookkeeper,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/** GET /api/connectors/shopify/status — setup checklist (no secrets). */
router.get('/status', async (_req, res) => {
  const company = databaseConfigured() ? await getOrCreateDefaultCompany() : null;
  res.json({
    webhookPath: '/api/connectors/shopify/webhook',
    hmacSecretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET?.trim(),
    storeDomainEnv: process.env.SHOPIFY_STORE_DOMAIN?.trim() || null,
    companyShopifyEnabled: company?.useShopifyConnector ?? false,
    companyStoreDomain: company?.shopifyStoreDomain ?? null,
    autoBookkeeper: process.env.SHOPIFY_AUTO_RUN_BOOKKEEPER !== 'false',
  });
});

export { router as shopifyConnectorRouter };
