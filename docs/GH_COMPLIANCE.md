# GH Compliance — BOG Accounting

**Bank:** `~/engineering-crew/docs/GH_PROMPT_BANK.md`  
**Standing order:** `~/engineering-crew/docs/GH_ENGINEERING_PRIORITY.md`  
**Manager:** `@manager` / `bog-pm-orchestrator`

## Active GH priorities

### P0 — Security (#9)
- [ ] JWT on all mutating routes globally
- [ ] CORS lockdown for production
- [ ] Run `@security_auditor` before Render deploy

### P0 — DevOps (#10)
- [ ] GitHub Actions `build:ci` on push
- [ ] Render API + `VITE_API_URL` wired

### P0 — Product hardening (#7 + #5)
- [x] Live Postgres-only books (no demo ledger)
- [x] P20–P40 autonomy backlog (aging, period wizard, bank stub, ingest)
- [ ] shadcn / component system consistency

## When to invoke which agent

| Situation | GH # | Agent |
|-----------|------|-------|
| New feature ticket | 8 → 6/7 | `@technical_lead` → `bog-systems-engineer` |
| Unfamiliar module | 2 | `@codebase_auditor` |
| GL / posting bug | 3 | `@production_debugger` |
| Slow reports | 4 | `@performance_engineer` |
| Ledger duplication risk | 5 | `@clean_architecture_engineer` |
| Pre-deploy | 9 | `@security_auditor` |
| CI/CD | 10 | `@senior_devops_engineer` |
