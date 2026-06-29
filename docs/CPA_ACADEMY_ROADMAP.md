# CPA Academy — Roadmap & Crew Construction Plan

**Status:** Planned (placeholder shipped). Human directive — build *after* core BOG is stable; sequence below.
**Surface today:** `/academy` (nav: Intelligence → CPA Academy) renders a "Coming soon" preview page.
**Goal:** An AI-guided training path inside BOG that prepares accountants toward **CPA certification**, reusing the same AI engine that powers the AI CPA Assistant.

> Compliance note: BOG Academy is a **study aid**, not a guarantee of passing the CPA exam, and not affiliated with AICPA/NASBA. All certification content is reviewed for accuracy before release.

---

## Product vision

Turn BOG's AI into a personal CPA tutor that teaches concepts, drills exam-style questions, and reports readiness — without leaving the accounting workspace. Lessons can pull real (anonymized, opt-in) examples from the user's own ledger so learning is concrete.

### Learner tracks (MVP scope)
1. **Foundations** — GAAP/IFRS fundamentals, accounting cycle, double-entry mastery.
2. **AI-tutored lessons** — adaptive explanations + Q&A; next lesson targets weak spots.
3. **Exam-style practice** — MCQ + task-based simulations mapped to the four CPA sections (AUD, FAR, REG, + Discipline).
4. **Progress & readiness** — per-topic mastery, simulated score, personalized study plan.

---

## Architecture sketch (for `@technical_lead` to ratify before code)

- **Data:** `Course`, `Module`, `Lesson`, `Question`, `LearnerProgress`, `AttemptResult` (Prisma models, tenant-scoped like the rest of BOG).
- **AI:** reuse the AI CPA service layer (OpenAI key already wired); add a tutoring prompt set + retrieval over curriculum + opt-in tenant memory (already modeled as `AiTenantMemory`).
- **Content:** curriculum authored as structured Markdown/JSON, version-controlled; question bank seeded + reviewed.
- **Access:** gated by `ai_cpa` module today; consider a dedicated `academy` module + role grants later.
- **Honesty/safety:** answer explanations cite the rule/standard; no exam-dump content; disclaimers on every results screen.

---

## Crew construction plan (all agents)

Route everything through **@manager**; **@technical_lead** owns architecture sign-off; **@qa_engineer** gates each release. GH items in brackets.

| Phase | Lead agent | Supporting | Deliverable |
|---|---|---|---|
| 0. Scope & architecture | `@technical_lead` [8] | `@manager` | Ratified data model, AI approach, content pipeline, success metrics |
| 1. Curriculum design | `@market_researcher` + subject expert | `@marketing_content_agent` | Topic map per CPA section, lesson outlines, sourcing of authoritative references |
| 2. Backend & schema | `@startup_backend_architect` [6] / `@systems_engineering_agent` | `@clean_architecture_engineer` [5] | Prisma models, course/lesson/question APIs, progress tracking, migrations |
| 3. AI tutoring engine | `@systems_engineering_agent` | `@production_debugger` [3] | Tutor prompts, adaptive lesson selection, retrieval over curriculum, guardrails |
| 4. Frontend experience | `@senior_frontend_engineer` [7] | `@aesthetics_agent` | Lesson player, practice runner, results dashboard — neon-synced, accessible, responsive |
| 5. Visual & brand polish | `@aesthetics_agent` | `@senior_frontend_engineer` | Academy look-and-feel, motion, badges/progress visuals (restraint: one accent system) |
| 6. Content authoring & review | `@marketing_content_agent` | subject expert + `@qa_agent` | Lessons + question bank written, fact-checked, disclaimers |
| 7. Security & privacy | `@security_auditor` [9] | — | Opt-in ledger-example usage, PII handling, exam-integrity review |
| 8. Performance | `@performance_engineer` [4] | — | Lesson/quiz load, AI latency budget, bundle impact |
| 9. QA & launch gate | `@qa_engineer` / `@qa_agent` | all | Accuracy, accessibility (WCAG), reduced-motion, mobile, regression — **before any deploy** |
| 10. DevOps & rollout | `@senior_devops_engineer` [10] | `@systems_engineering_agent` | Feature flag, phased release, monitoring, content versioning |

---

## Phased delivery

- **M1 — Foundations vertical slice:** 1 section (e.g., FAR), ~10 lessons + ~50 questions, AI tutor + progress. Behind a feature flag.
- **M2 — Adaptivity + second section:** weakness-targeted lesson selection, simulated score, study plan.
- **M3 — All four sections + readiness dashboard, badges, polish.**

Each milestone: `@technical_lead` review → build → `@qa` gate → Human approves deploy.

---

## Decisions needed from Human (before Phase 1)

- Target exam jurisdiction(s) and section model (current AICPA CPA Evolution: AUD/FAR/REG + one Discipline).
- Free for preview users vs. paid module.
- Use the learner's real ledger as teaching material (opt-in) — yes/no.
- Build now vs. after core BOG GA (current directive: **after**).

---

## Log

- `acad-01` (2026-06-29) ✅ Placeholder page + nav entry shipped; roadmap drafted. Next: Human answers decisions above, then `@technical_lead` Phase 0.
