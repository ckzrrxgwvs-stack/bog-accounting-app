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

## Tickets (priority order)

| P | Title | Status |
|---|-------|--------|
| 20 | Dashboard AR/AP aging bucket breakdown | ✅ DONE |
| 25 | Period close wizard UI | ✅ DONE |
| 35 | Bank feed integration stub (read-only) | ✅ DONE |
| 40 | Crew journal ingest status panel | ✅ DONE |
| 45 | Financial institution electronic linking (registry + sandbox) | ✅ DONE |
| 50 | Microsoft Office hub (.xlsx / .docx) | ✅ DONE |
| 55 | Visual ergonomics & comfort mode | ✅ DONE |
| 60 | Owner setup wizard + live Users page | ✅ DONE |
| 65 | Portfolio books, first-run setup, delegated access | ✅ DONE |

## Implemented (2026-06-25 — 2026-06-26)

- **P20** — Dashboard aging summary shows Current / 1–30 / 31–60 / 60+ buckets via `/api/reports/ar-aging` and `ap-aging`.
- **P25** — `PeriodClose.tsx` four-step wizard; `GET /api/periods/preview` validates TB balance and open journals before close.
- **P35** — `BankFeedAccount` + `BankFeedTransaction` models; `POST /api/bank-feeds/import-csv`; Settings integrations CSV import when `useBankFeeds` is on.
- **P40** — `GET /api/dashboard/ingest-summary`; Dashboard “Crew ingest” card per ledger book.
- **P45** — `FinancialInstitutionConnection` model; `/integrations/financial`; Plaid/MX/PayPal registry + sandbox sync.
- **P50** — `/office` hub; Excel export/import; Word legal templates via `/api/office`.
- **P55** — Comfort mode, ⌘K command palette, Settings → Display & comfort.
- **P60** — `/setup-owner` wizard; `GET/POST /api/setup/owner*`; Users page wired to Postgres; `BOG_BOOTSTRAP_USERS` gated dev accounts.
- **P65** — One portfolio company, multiple project books (`PortfolioBook`), top-menu switcher, inline first sign-in with generate-password; `UserBookAccess` + `UserModuleGrant`; President/CFO/Controller assign books; Controller → department managers → AP/AR/Collections cascade.

**After pull (P65):** run `pnpm exec prisma db push` on the API host (Render build runs this automatically). Tables: `PortfolioBook`, `UserBookAccess`, `UserModuleGrant`, `User.canViewPortfolio`.

## Next backlog (deferred)

- Live Plaid/MX/PayPal OAuth (Human approval)
- Auto-reconcile bank lines to GL
- Period close audit log UI surfacing
- Journal Excel import → commit DRAFT entries
- Full in-browser spreadsheet (out of scope — use Data Studio + Excel export)
- Portfolio rollup dashboard (full KPIs across authorized books)
- Settings → Portfolio & access tab (optional; today: Users + top menu)
- Email invitations and self-service password reset
