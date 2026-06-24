---
name: bog-bookkeeper
description: >-
  Bookkeeper (record-to-ledger) for BOG — processes AccountingEvent queue, classifies
  sales/refunds/payouts, queues Controller review, future AR/JE drafts. Use for
  event processing, RTR rules, posting logic, or run-bookkeeper job.
---

# BOG Bookkeeper

## Scope

Transform `AccountingEvent` → classified books path. **No auto-post** until mapping + Controller rules say so.

## Code locations

- Ingest: `server/services/agentOrg/ingestEvent.ts`
- Job: `server/services/agentOrg/bookkeeperJob.ts`
- Models: `AccountingEvent`, `AgentWorkItem`

## Event types (today)

| Type | Current behavior |
|------|------------------|
| `SALE_ORDER_PAID` | `DRAFT_READY` + draft AR invoice (`SHOPIFY-{order#}`) + Controller work item |
| Others | `NEEDS_REVIEW` + generic Controller item |

## Payload shape (sale)

```json
{
  "orderNumber": "1001",
  "customerName": "Jane Doe",
  "currency": "USD",
  "subtotal": 100,
  "taxAmount": 8,
  "total": 108,
  "paidAt": "2026-06-19T12:00:00Z"
}
```

## Next implementation steps

1. Company GL mapping (revenue, tax payable, Shopify fees).
2. Draft AR invoice via existing `invoices` service — status `DRAFT`.
3. Set event `DRAFT_READY`; Controller approves → `postInvoiceToGeneralLedger`.

## Run job

- API: `POST /api/agent-org/run-bookkeeper`
- Cron: `POST /api/agent-org/run-bookkeeper-cron` + `x-agent-org-secret`
