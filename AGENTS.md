# BOG accounting program — agent instructions

This repository runs as an **automated accounting program** with a small **agent organization**. Read **`docs/AGENT_ORGANIZATION.md`** before large changes.

## Default behavior

1. **Reuse the kernel** — extend `AccountingEvent`, existing AR/AP/GL routes, `CreationDedupKey`; do not fork a second ledger.
2. **Separation of duties** — Connectors ingest; Bookkeeper classifies; Controller approves; Systems Engineer implements; human merges/deploys.
3. **No silent production** — no auto-deploy, no breaking schema without migration note, no posting through closed periods.

## Invoke a role skill

When the user names a role or task type, load the matching project skill under `.cursor/skills/`:

- **PM / priorities / digest** → `bog-pm-orchestrator`
- **Build / implement / code** → `bog-systems-engineer`
- **Events / posting / RTR** → `bog-bookkeeper`
- **Shopify / webhook / integration** → `bog-connector`
- **Review / approve / close** → `bog-controller`

## API entry points

- Agent spine: `/api/agent-org/*`
- Product feedback: `/api/product-intel/feedback`

## Database

Requires `DATABASE_URL`. After schema changes: `pnpm exec prisma db push` (dev) or `migrate deploy` (prod).
