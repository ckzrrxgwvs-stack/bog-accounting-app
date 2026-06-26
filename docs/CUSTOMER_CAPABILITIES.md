# BOG customer capabilities — integrations, Office, ergonomics

**Owner:** `@bog-pm-orchestrator` · **Implementer:** `@bog-systems-engineer`  
**Updated:** 2026-06-25 (P45–P55)

## What customers asked for vs what BOG delivers

| Request | BOG today | Full parity note |
|---------|-----------|------------------|
| Link banks, cards, PayPal electronically | ✅ Connection registry, sandbox sync, CSV; live Plaid/MX/PayPal when env credentials + Human approval | Not every global institution until provider keys are live |
| Excel import/export | ✅ Native `.xlsx` trial balance, COA, journals, import template + journal upload preview | BOG is not Excel — use **Data Studio** for in-app analysis; open exports in Microsoft 365 for pivot/macros |
| Word legal documents | ✅ `.docx` templates (engagement letter, FS cover, management rep, invoice transmittal) | BOG is not Word — generate draft, finalize in Microsoft Word (letterhead, track changes, e-sign) |
| Visually ergonomic UI | ✅ Comfort mode, large text, soft grid toggle, ⌘K navigation, module spacing | Ongoing design iteration via `@bog-systems-engineer` |

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
pnpm exec prisma db push   # FinancialInstitutionConnection + BankFeedAccount.connectionId
```
