# Product intelligence (realistic & legal-by-design)

This implements **three rails** aligned with `PROGRAM_DIRECTION.md` / `PRODUCT_PHASES.md`:

1. **Tenant feedback** — Structured signals (`ProductFeedback`) per company from authenticated users; executives can triage/archive.
2. **Allow-listed intel digest** — **HTTPS URLs only**, configured in `IntelFeedSource` (admin UI) or optional bootstrap env `INTEL_SEED_FEEDS`. **No arbitrary crawling.** Fetch + optional OpenAI summarization → `IntelDigestItem` rows.
3. **Spec assistant** — Executive-only endpoint drafts **Markdown briefs** for developers (hypotheses + acceptance criteria). **Not** approved specs until humans merge tickets/PRs.

## What this is not

- Not continuous scraping of “the whole web.”
- Not autonomous production deploys or silent schema changes.
- Not legal/tax advice — outputs are **draft hypotheses** for engineering review.

## API (requires `DATABASE_URL`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/product-intel/feedback` | JWT (any active user) |
| GET | `/api/product-intel/feedback/mine` | JWT |
| GET | `/api/product-intel/feedback` | JWT President/CFO/Controller |
| PATCH | `/api/product-intel/feedback/:id` | JWT President/CFO/Controller (`status`: NEW/TRIAGED/ARCHIVED) |
| GET | `/api/product-intel/intel/sources` | Executive |
| POST | `/api/product-intel/intel/sources` | Executive `{ label, url }` |
| DELETE | `/api/product-intel/intel/sources/:id` | Executive |
| POST | `/api/product-intel/intel/run` | Executive — run digest |
| POST | `/api/product-intel/intel/run-cron` | Header `x-intel-digest-secret` = `INTEL_DIGEST_SECRET` |
| GET | `/api/product-intel/intel/digests?limit=` | Executive |
| POST | `/api/product-intel/spec-draft` | Executive `{ topic, context? }` |

## Cron / CI

Example (GitHub Actions) hitting your **API base** (not Vercel static):

```yaml
- run: |
    curl -fsS -X POST "$API_URL/api/product-intel/intel/run-cron" \
      -H "x-intel-digest-secret: ${{ secrets.INTEL_DIGEST_SECRET }}"
```

## Compliance & governance

- Choose feeds your counsel permits (RSS/terms). Respect robots/cache headers informally; prefer vendor/API feeds when available.
- Add DPIA / retention / erasure policies before enterprise sales — code stores text excerpts server-side.
- Cross-tenant analytics would be **separate** consent surface — not enabled here.

## Related docs

- `AI_TENANT_MEMORY.md` — opted-in **assistant** memory inside one tenant (distinct from product roadmap signals).
