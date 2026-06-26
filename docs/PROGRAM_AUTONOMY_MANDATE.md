# BOG Program Autonomy Mandate

**Effective:** 2026-06-25  
**Owner:** Human + `@bog-pm-orchestrator`  
**Implementer:** `@bog-systems-engineer` (via `.cursor/skills/bog-systems-engineer/`)

## Mission

BOG is a **real accounting program** on PostgreSQL. It must evolve toward an **autonomous finance department**: AI-assisted bookkeeper, controller, connector, and PM agents performing the work a human accounting team does — with Human approval on material posts, period close, and production deploys.

## Data policy (no demo ledger)

- **Only live financial data** from connected crews and connectors (dropship-crew, investment-fund-crew, Shopify, Robinhood, manual journals).
- No in-memory mock companies, fake Acme figures, browser `localStorage` ledgers, or `BOG_MOCK` API mode.
- Without `DATABASE_URL`, API routes return **503 Database required** — not sample balances.

## Agent feedback loop

| Agent | Role | Feeds systems engineering |
|-------|------|---------------------------|
| `@bog-bookkeeper` | Day-to-day entries, reconciliations | UI gaps, posting workflows, import formats |
| `@bog-controller` | Approvals, period close, GAAP/NIF checks | Approval rules, report accuracy, close automation |
| `@bog-connector` | External sync (crews, banks, commerce) | Idempotent ingest APIs, event schemas |
| `@bog-pm-orchestrator` | Prioritizes build tickets | `AgentWorkItem` specs, acceptance criteria |

**Workflow:** Domain agent documents need → PM opens ticket → Systems Engineer implements → QA / Human verifies → log in `docs/WORK_PROCEDURE_LOG.md`.

## Systems engineering cadence

Align with portfolio **evolving-systems mandate** (light radar every 2nd Monday):

1. Patch dependencies and Prisma schema safely.
2. Improve connector reliability and agent-org spine.
3. Extend reports and dashboards from **posted** journals only.
4. Never add a parallel ledger or hard-coded secrets.

## Human approval required

- Production deploy, migrations, new cron/webhooks.
- Auto-posting without Controller policy.
- Ledger corrections that bypass audit trail.

## Local runbook

```bash
pnpm run go-live:local    # Docker Postgres
pnpm run dev:program      # API :3001 + UI :5173
pnpm run post:draft-journals   # post crew-pushed DRAFT journals
```

Crews push via `ops:accounting-push-bog` (dropship, investment-fund).
