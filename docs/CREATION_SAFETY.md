# Creation safety (duplicate prevention & numbering)

Server-enforced rules for **sales orders** and **purchase orders** when `DATABASE_URL` is set.

## Layers

1. **Idempotency-Key** — HTTP header or body `idempotencyKey`. Same key → same **replay** response (`200` + `idempotentReplay: true`). Stored in `CreationDedupKey` (hashed). Prevents double-submit from retries, double clicks, or multiple clerks repeating the same timed request with the same key *only when they share the key* — UI generates a **new UUID per submit**.

2. **Line fingerprint** — SHA-256 of normalized customer/vendor + currency + sorted lines (SKU/id, description, qty, price/cost). Blocks a **second** order in **DRAFT/CONFIRMED** (SO) or **DRAFT/APPROVED** (PO) within **`ORDER_DEDUP_WINDOW_MINUTES`** (default **30**). Returns **409** with `DUPLICATE_ORDER_FINGERPRINT` / `DUPLICATE_PO_FINGERPRINT`.

3. **Business reference** — Optional **`customerPurchaseOrderRef`** (SO) or **`supplierReference`** (PO). When set, rejects if an **non-cancelled** order already uses that ref for the same customer/vendor. Returns **409** with `DUPLICATE_CUSTOMER_PO_REF` / `DUPLICATE_SUPPLIER_REF`.

4. **Document numbers** — `SO-0000001` / `PO-0000001` style counters in **`DocumentCounter`**, allocated inside the same **Serializable** transaction as the insert (no nested standalone counter txn).

## Ops

After schema changes: `pnpm exec prisma migrate deploy` (or `db push` in dev).

Tune window: set **`ORDER_DEDUP_WINDOW_MINUTES`** in server `.env`.

## Future

Extend the same pattern to AR/AP invoices, shipments, and customer/vendor **code** generation (deterministic rules + DB uniqueness).
