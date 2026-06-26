# BOG customer capabilities — integrations, Office, ergonomics

**Owner:** `@bog-pm-orchestrator` · **Implementer:** `@bog-systems-engineer`  
**Updated:** 2026-06-26 (P45–P65)

## What customers asked for vs what BOG delivers

| Request | BOG today | Full parity note |
|---------|-----------|------------------|
| Link banks, cards, PayPal electronically | ✅ Connection registry, sandbox sync, CSV; live Plaid/MX/PayPal when env credentials + Human approval | Not every global institution until provider keys are live |
| Excel import/export | ✅ Native `.xlsx` trial balance, COA, journals, import template + journal upload preview | BOG is not Excel — use **Data Studio** for in-app analysis; open exports in Microsoft 365 for pivot/macros |
| Word legal documents | ✅ `.docx` templates (engagement letter, FS cover, management rep, invoice transmittal) | BOG is not Word — generate draft, finalize in Microsoft Word (letterhead, track changes, e-sign) |
| Visually ergonomic UI | ✅ Comfort mode, large text, soft grid toggle, ⌘K navigation, module spacing | Ongoing design iteration via `@bog-systems-engineer` |
| Portfolio & multi-book access | ✅ One company, project books, top-menu switcher, delegated AP/AR/Collections | Portfolio rollup KPIs — partial (ingest summary); full rollup backlog |

## Portfolio & access (P65)

- **First sign-in:** business name + President account on login (generate-password option).
- **Top menu:** switch authorized project books; Portfolio overview when granted.
- **Users:** President / CFO / Controller assign books; department cascade via `UserModuleGrant`.
- **API:** `/api/portfolio/*`, `/api/company/workspaces`
- **Schema:** `PortfolioBook`, `UserBookAccess`, `UserModuleGrant`, `User.canViewPortfolio`

## Financial institutions (P45)

- **Page:** `/integrations/financial`
- **API:** `/api/financial-connections`
- **Providers:** Plaid, MX, PayPal, manual CSV, sandbox (dev)
- **Human approval:** production `PLAID_*`, `MX_*`, `PAYPAL_*` env vars on API host

## Microsoft Office hub (P50)

- **Page:** `/office`
- **API:** `/api/office`
- **Excel:** `exceljs` — Office Open XML (`.xlsx`)
- **Word:** `docx` — Office Open XML (`.docx`)

## Display & comfort (P55)

- **Settings → Display & comfort**
- **Quick nav:** ⌘K / Ctrl+K
- Stored per browser (`localStorage`)

## After deploy

```bash
# P65 — portfolio + access tables (Render build runs this automatically)
pnpm exec prisma db push

# P45 — if upgrading from older DB without financial connections
# FinancialInstitutionConnection + BankFeedAccount.connectionId
```

### P65 go-live checklist

1. **Render** — push to `main` triggers build (`prisma db push` in `render.yaml`).
2. **Verify API:** `curl -s https://bog-accounting-api.onrender.com/api/health` → `schemaReady: true`.
3. **Vercel** — redeploy so frontend includes P65 (`VITE_API_URL` → Render `/api`).
4. **First login** — `/login` or `/setup-owner` if `needsOwnerSetup`.
5. **Users** — invite team; assign books and departments.

See `docs/OWNER_SETUP.md` for access delegation rules.
