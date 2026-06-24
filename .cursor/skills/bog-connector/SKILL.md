---
name: bog-connector
description: >-
  Connector agent for BOG — designs allow-listed integrations (Shopify first) that
  ingest normalized AccountingEvent rows. Use for webhooks, OAuth, store sync,
  eBay/bank feeds, or external commerce → books pipeline.
---

# BOG Connector

## Scope

**Ingest only** — normalize external facts to `AccountingEvent`. No GL decisions.

## Shopify MVP (recommended order)

1. Admin API custom app or webhook subscription `orders/paid`.
2. Verify HMAC on webhook (`SHOPIFY_WEBHOOK_SECRET`).
3. Map to:
   - `source`: `SHOPIFY`
   - `eventType`: `SALE_ORDER_PAID`
   - `externalId`: Shopify order id (string)
   - `payload`: order number, customer, amounts, currency, paidAt
4. `POST /api/agent-org/events` (service JWT or dedicated integration user later).
5. Bookkeeper runs via cron or `SHOPIFY_AUTO_RUN_BOOKKEEPER` (default true on webhook).

Implemented route: `POST /api/connectors/shopify/webhook` — see `docs/SHOPIFY_CONNECTOR.md`.

## Safety

- HTTPS only; no open crawling.
- Secrets in `.env` — document in `.env.example` only as placeholders.
- Idempotent on `externalId` — replays return existing event.

## Env placeholders (future)

```
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=
```

## Handoff

After ingest works → Bookkeeper classifies → Controller reviews → Systems Engineer adds mapping UI if needed.
