# Tech radar log — BOG Accounting

**Purpose:** Technology evolution scans for the BOG accounting program.  
**Mandate:** `~/.cursor/rules/evolving-systems-mandate.mdc`  
**Procedure log:** [`WORK_PROCEDURE_LOG.md`](WORK_PROCEDURE_LOG.md) if present · [`docs/BUILD_BACKLOG.md`](BUILD_BACKLOG.md)  
**Portfolio hub:** `~/engineering-crew/docs/TECH_RADAR_LOG.md`

**Cadence:** Light radar (portfolio automation) · Agent audit 1st Monday monthly · Deep review quarterly

---

## tech-01 — Baseline (2026-07-04)

**Cycle:** baseline (seed on portfolio refresh)  
**Agent:** GH

### Current stack snapshot

| Layer | State |
|-------|--------|
| Stack | Next.js, Prisma, Postgres (Supabase), Express API, Vite UI |
| Deploy | Vercel (`bog-accounting-v5.vercel.app`) |
| Agents | bog-pm-orchestrator, bog-systems-engineer, bog-bookkeeper, bog-connector, bog-controller (skills) |
| GH priorities | #9 API auth → #10 CI/CD + backend deploy → #8 Face I scope |
| Backlog | P20–P65 largely ✅ (2026-06-26); Postgres-only books |

### Known gaps

- API auth not production-hardened (#9)
- No CI/CD pipeline (#10)
- Agent org spine live but Human merges/deploys

---

## tech-02 — 2026-07-04 (cycle: light + quarterly)

**Prior entry:** tech-01 (same day seed)

### Notable advances

- **Cursor SDK + Automations:** Headless agents suitable for scheduled journal-ingest health checks and period-close reminders (no auto-post without Controller).
- **Claude Sonnet 5:** Candidate for `@bog-bookkeeper` / `@bog-systems-engineer` agentic workflows.
- **Prisma / Next.js:** Routine security patches — audit on next deep review.

### Recommended upgrades

| Priority | Change | Effort | Risk |
|----------|--------|--------|------|
| P0 | GH #9 — JWT/API auth on `/api/agent-org/*` and sensitive routes | M | M |
| P0 | GH #10 — GitHub Actions: `build:ci`, Prisma validate, smoke health | M | L |
| P1 | Scheduled read-only health automation (DB reachable, queue depth) | S | L |
| P2 | Document Studio + Office hub — UX polish (#7) after auth/CI | M | L |
| P3 | Evaluate Cursor SDK for `run-bookkeeper` dry-run in CI | M | L |

### Applied this cycle

- TECH_RADAR_LOG created (this file)
- Linked to portfolio hub tech-02

### Deferred (needs Human)

- Production deploy, migrations, live ledger posts (Tier 2)
- Dedicated BOG `@manager` agent (future)

### Next cycle focus

- GH #9 security audit before next Vercel deploy
- Sync with engineering-crew portfolio radar Mondays
