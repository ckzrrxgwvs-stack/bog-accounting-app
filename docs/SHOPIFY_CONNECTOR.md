# Shopify connector (BOG)

Ingest **paid Shopify orders** into the agent-org spine: webhook → `AccountingEvent` → Bookkeeper → **DRAFT** AR invoice → Controller review.

## Prerequisites

1. `DATABASE_URL` set and schema applied (`pnpm exec prisma db push`)
2. BOG API reachable from the internet (for Shopify webhooks) — local dev needs ngrok or similar
3. Shopify custom app or legacy private app with **read orders** scope

## Environment (server `.env`)

```env
SHOPIFY_WEBHOOK_SECRET=your_webhook_signing_secret
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
# Optional: set false to only ingest events without running bookkeeper inline
# SHOPIFY_AUTO_RUN_BOOKKEEPER=true
```

**Never commit** real secrets. `SHOPIFY_ACCESS_TOKEN` is for future pull-sync; webhooks do not need it on the server for `orders/paid`.

## Company settings (UI)

**Agent operations** → Shopify section:

- Enable **Use Shopify connector**
- Set **Store domain** (must match `x-shopify-shop-domain` on webhooks)

Or `PATCH /api/company/:id` with `useShopifyConnector`, `shopifyStoreDomain`.

## Shopify Admin setup

1. **Settings → Notifications → Webhooks** (or app webhook subscription)
2. Event: **Order payment** (`orders/paid`)
3. URL: `https://YOUR_API_HOST/api/connectors/shopify/webhook`
4. Format: JSON
5. Copy the **signing secret** → `SHOPIFY_WEBHOOK_SECRET`

## Flow

```
Shopify orders/paid
  → HMAC verify (raw body)
  → ingest AccountingEvent (idempotent on order id)
  → runBookkeeperJob (unless SHOPIFY_AUTO_RUN_BOOKKEEPER=false)
  → DRAFT AR invoice SHOPIFY-{order#}
  → Controller work item + event DRAFT_READY
```

Controller posts invoice to GL from **Accounts receivable** when satisfied.

## Verify

```bash
curl -s "$API_URL/api/connectors/shopify/status"
```

## Manual test (no Shopify)

With JWT:

```bash
POST /api/agent-org/events
{
  "source": "SHOPIFY",
  "eventType": "SALE_ORDER_PAID",
  "externalId": "999001",
  "payload": {
    "orderNumber": "#1001",
    "customerEmail": "buyer@example.com",
    "total": 49.99,
    "subtotal": 45.99,
    "taxAmount": 4.00,
    "currency": "USD"
  }
}
POST /api/agent-org/run-bookkeeper
```

Check **Agent operations** UI for event + draft invoice in AR.

## Related

- `docs/AGENT_ORGANIZATION.md` — full agent org
- `.cursor/skills/bog-connector` — Cursor agent charter
