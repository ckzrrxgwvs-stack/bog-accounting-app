# GH Compliance — BOG Accounting App

**Bank:** `~/engineering-crew/docs/GH_PROMPT_BANK.md`  
**Portfolio tracker:** `~/engineering-crew/docs/GH_PORTFOLIO_COMPLIANCE.md`

## Active GH priorities

### P0 — Security (#9)
- [ ] JWT middleware on **all** mutating routes
- [ ] `companyId` from JWT on every Prisma query (tenant isolation)
- [ ] CORS restricted to `FRONTEND_URL` in production
- [ ] Remove demo MFA bypass; implement server-side TOTP
- [ ] Disable `SKIP_GL_AUTH` in production

### P0 — DevOps (#10)
- [ ] Deploy Express API (Render/Railway) with env vars
- [ ] Wire `VITE_API_URL` on Vercel to deployed API
- [ ] GitHub Actions: lint + `tsc -b` + `build:ci`
- [ ] Versioned Prisma migrations (replace ad-hoc `db push`)

### P0 — Tech lead (#8)
- [ ] Face I accounting kernel before expanding Face II ERP UI
- [ ] Per `docs/MODULE_ROADMAP.md` phases 1–7 as launch gate

### P1 — Quality (#2 + tests)
- [ ] Integration tests: GL posting, period close, invoice→ledger
- [ ] Playwright smoke: login → journal entry golden path

## Compliance log

| Date | Item | Status | Note |
|------|------|--------|------|
| 2026-06-23 | 2, 8, 9, 10 | ✅/🔄 | Portfolio audit; compliance doc created |
