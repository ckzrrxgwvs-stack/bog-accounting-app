# BOG build backlog — filed tickets

**PM:** `@bog-pm-orchestrator`  
**Implementer:** `@bog-systems-engineer`  
**Mandate:** `docs/PROGRAM_AUTONOMY_MANDATE.md`

## Seed into Postgres

```bash
pnpm run go-live:local
pnpm run seed:autonomy-backlog
```

View queue: `GET /api/agent-org/work` (President/CFO JWT) or Prisma `AgentWorkItem`.

## Open tickets (priority order)

| P | Filed by | Title | Status |
|---|----------|-------|--------|
| 20 | Bookkeeper + Controller | Dashboard AR/AP aging bucket breakdown | OPEN |
| 25 | Controller | Period close wizard UI | OPEN |
| 35 | Connector + Controller | Bank feed integration stub (read-only) | OPEN |
| 40 | Connector | Crew journal ingest status panel | OPEN |

## Standup — 2026-06-25

**Done today**

- Removed all demo/mock ledger data; Postgres-only books (`bog-12`).
- `PROGRAM_AUTONOMY_MANDATE.md` + systems engineer skill updated.

**Stuck**

- None — DB required for all routes.

**Next (systems engineer)**

1. **P20** — Aging buckets on Dashboard (reuse `invoices/aging`).
2. **P25** — Period close wizard.
3. **P35** — Bank feed stub + CSV import.
4. **P40** — Ingest summary for crew connectors.

**Human approval before**

- Live bank OAuth (Plaid/MX).
- Auto-post without Controller policy.
- Production deploy.
