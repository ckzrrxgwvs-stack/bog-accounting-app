# CPA Academy — Direction, Roadmap & Crew Construction Plan

**Status:** Direction set (placeholder shipped). Research in progress by the crew (curriculum + brand identity).
**Surface today:** `/academy` renders a preview page.
**Owner directive (2026-06-28):** The CPA Academy is a **fundamental part of BOG** but must have **its own place and personality — separate from the accounting program**. BOG's app serves as the **practice room**; the Academy is its own branded learning environment. The program must be **modular and self-directed**: a learner may develop *only* the competency they want (e.g., just **AR**, just **AP**) without committing to the full CPA path. Flexibility is the differentiator.

> Compliance note: BOG Academy is a **practice & study aid**, not a guarantee of passing the CPA exam, and not affiliated with AICPA/NASBA. CPA Evolution / AICPA references are used for alignment only. All content reviewed for accuracy before release.

---

## 1. What changed (new mandate)

| Old framing | New direction |
|---|---|
| A tab *inside* BOG ("from bookkeeper to CPA inside BOG") | A **separate-identity sub-brand** with its own home, voice, and look |
| Linear CPA path (do all sections) | **À-la-carte modules** — pick AR, AP, GL… independently; finishing the whole path is optional |
| Lessons live in the workspace | **Academy = learn + plan; BOG app = the practice room** where skills are drilled on real-style ledgers |
| "Build later, after core BOG" | Direction is live now; research underway; build still sequenced & flag-gated |

**Three pillars to design around:**
1. **Own place & personality** — distinct brand/voice (mentor-like, momentum-driven) that still feels like a sibling of BOG.
2. **Practice room** — the Academy hands off into the BOG accounting app to *do the work*, then reads results back as mastery signal.
3. **Choose-your-path flexibility** — every competency is independently selectable; progress and "readiness" must remain meaningful even when a learner only does a subset.

---

## 2. Research in progress (crew)

- **`@market_researcher`** — comprehensive report on how top universities structure accounting curricula (UT Austin, BYU, USC, Illinois, NC State, CSUN catalogs reviewed), the current **CPA Evolution** exam model, and a **modular competency taxonomy** (AR/AP/GL/etc.) mapped to CPA sections. → I compile into `docs/CPA_ACADEMY_REPORT.md`.
- **`@aesthetics_agent`** — the Academy's **separate identity**: name options, personality/voice, visual direction (sibling of BOG, its own place), key screens (home, module picker, practice-room hand-off, mastery/readiness), and how to signal the separation. → feeds the brand section of the report.

GH role: I ("put it altogether") synthesize both into the report below + this roadmap, then `@technical_lead` ratifies architecture before code.

### Grounded facts already confirmed (web)
- **CPA Evolution (Jan 2024+):** 3 Core sections — **AUD, FAR, REG** — plus **one** Discipline of choice: **BAR**, **ISC**, or **TCP**. Each section = MCQs + task-based simulations. (AICPA/NASBA.)
- **University backbone (common sequence):** intro financial → intro managerial → intermediate financial I/II(/III) → cost/managerial → income tax → auditing & assurance → accounting information systems (AIS) → advanced topics → ethics → capstone/internship.

---

## 3. Product vision (revised)

A **practice room for accountants** with its own academy identity. You enroll, pick the competencies you care about, and the Academy gives you: short concept primers, **hands-on practice tasks performed inside the BOG accounting app**, instant feedback, and a **per-module mastery meter**. Going all the way to CPA-readiness is one option among many — most learners will pick targeted modules.

### Modular competency map (à la carte — pick any subset)
Each module is independently enrollable, has its own mastery meter, and maps to CPA section(s) for those who want the full path.

| Module | Core skills | Practice tasks (in BOG) | CPA mapping |
|---|---|---|---|
| **Accounts Receivable (AR)** | Invoicing, aging, collections, allowance for doubtful accounts | Issue invoices, age receivables, post write-offs/allowance | FAR |
| **Accounts Payable (AP)** | Bills, terms, 3-way match, accruals | Enter bills, schedule payments, accrue at close | FAR |
| **General Ledger / Journal Entries** | Double-entry, debits/credits, adjusting entries | Build & post JEs, correcting entries | FAR |
| **Bank Reconciliation** | Matching, outstanding items, book vs. bank | Reconcile a statement, resolve discrepancies | FAR / AUD |
| **Inventory & COGS** | Costing (FIFO/LIFO/avg), lower-of-cost | Value inventory, compute COGS | FAR / BAR |
| **Payroll** | Gross-to-net, withholdings, employer taxes | Run a payroll, post the entry | REG / FAR |
| **Fixed Assets & Depreciation** | Capitalization, methods, disposals | Set up assets, run depreciation, dispose | FAR / TCP |
| **Financial Statements** | Prep & analysis (BS, IS, CF), ratios | Assemble statements, compute ratios | FAR / BAR |
| **Period Close** | Accruals, deferrals, close checklist | Run a month-end close | FAR / BAR |
| **Audit Basics** | Assertions, evidence, sampling, controls | Test a control, sample, document | AUD / ISC |
| **Tax Basics** | Book-tax differences, individual/business | Prepare a basic computation | REG / TCP |
| **Managerial / Cost** | CVP, budgeting, variances | Build a budget, compute variances | BAR |

*(Final taxonomy + learning objectives per module to be finalized from the `@market_researcher` report.)*

### Mastery model for partial paths
- Each module has its own **0–100 mastery meter** earned through practice attempts (worked examples → guided → independent), with a **mastery threshold** to mark a module "proficient."
- **No requirement to complete others.** A learner who only does AR sees a complete, satisfying AR journey + an AR proficiency badge.
- A separate, *opt-in* **"CPA readiness"** view aggregates module mastery into section-level (AUD/FAR/REG/Discipline) readiness — shown only when relevant, never as a gate.

---

## 4. Architecture sketch (for `@technical_lead` to ratify before code)

- **Separation:** Academy gets its own route namespace (`/academy/*`), its own shell/theme tokens (sibling of BOG, distinct identity), and a clear entry/exit transition to the BOG **practice room**.
- **Data:** `Track`/`Module`, `Lesson`, `PracticeTask`, `Question`, `Enrollment` (per-module), `LearnerProgress`, `AttemptResult`, `MasteryState` — tenant-scoped like the rest of BOG. Enrollment is **per module**, not per course.
- **Practice room bridge:** practice tasks launch a scoped/sandboxed BOG workspace (or a seeded practice company) and read structured results back to score mastery.
- **AI:** reuse the AI CPA service layer (OpenAI key wired); add tutoring/feedback prompt sets + retrieval over curriculum; opt-in tenant memory (`AiTenantMemory`).
- **Access:** dedicated `academy` module + per-module enrollment grants.
- **Honesty/safety:** explanations cite the rule/standard; no exam-dump content; disclaimers on results screens.

---

## 5. Crew construction plan (all agents)

Route through **@manager**; **@technical_lead** owns architecture sign-off; **@qa_engineer** gates each release. GH items in brackets.

| Phase | Lead agent | Supporting | Deliverable |
|---|---|---|---|
| R. Research (now) | `@market_researcher` + `@aesthetics_agent` | GH (synthesis) | Curriculum + competency taxonomy report **and** separate-identity brand spec → `CPA_ACADEMY_REPORT.md` |
| 0. Scope & architecture | `@technical_lead` [8] | `@manager` | Ratified data model, practice-room bridge, AI approach, success metrics |
| 1. Curriculum & module design | `@market_researcher` + subject expert | `@marketing_content_agent` | Per-module objectives, lesson outlines, practice-task specs, authoritative references |
| 2. Backend & schema | `@startup_backend_architect` [6] / `@systems_engineering_agent` | `@clean_architecture_engineer` [5] | Per-module enrollment, progress/mastery APIs, practice-room bridge, migrations |
| 3. AI tutoring/feedback engine | `@systems_engineering_agent` | `@production_debugger` [3] | Feedback prompts, adaptive selection, retrieval, guardrails |
| 4. Academy frontend (own identity) | `@senior_frontend_engineer` [7] | `@aesthetics_agent` | Academy home, module picker, practice runner, mastery dashboard — accessible, responsive |
| 5. Brand & visual system | `@aesthetics_agent` | `@senior_frontend_engineer` | Academy look-and-feel, motion, badges/mastery visuals — distinct sibling brand |
| 6. Content authoring & review | `@marketing_content_agent` | subject expert + `@qa_agent` | Module lessons + practice tasks + question bank, fact-checked, disclaimers |
| 7. Security & privacy | `@security_auditor` [9] | — | Practice-sandbox isolation, opt-in data usage, PII, exam-integrity |
| 8. Performance | `@performance_engineer` [4] | — | Lesson/practice load, AI latency budget, bundle impact |
| 9. QA & launch gate | `@qa_engineer` / `@qa_agent` | all | Accuracy, WCAG, reduced-motion, mobile, regression — **before any deploy** |
| 10. DevOps & rollout | `@senior_devops_engineer` [10] | `@systems_engineering_agent` | Feature flag, phased release, monitoring, content versioning |

---

## 6. Phased delivery (revised around modularity)

- **M1 — One module, end-to-end:** ship **Accounts Receivable** as a complete à-la-carte module — primer → practice tasks in BOG → mastery meter + badge. Behind a feature flag. Proves the separate-identity shell + practice-room bridge.
- **M2 — Module library + picker:** add AP, GL, Bank Rec; the module-picker IA; opt-in CPA-readiness aggregation.
- **M3 — Breadth + readiness:** remaining modules, section-level readiness view, badges, polish.

Each milestone: `@technical_lead` review → build → `@qa` gate → Human approves deploy.

---

## 7. Decisions — locked by owner (2026-06-28)

- ✅ **Name:** **Pi Academy** (π is the program's main logo; sibling of the BOG-Pi cube with an amber "crown").
- ✅ **Brand:** its own place — amber identity, own `PiAcademyMark` logo (`src/components/PiAcademyLogo.tsx`).
- ✅ **Freemium model:** the **free tier gives only the minimum to register + one genuine win** (a single guided AR taster + one real practice rep + first mastery movement) — engineered as a hook. **All depth & breadth (every module, unlimited practice, badges/micro-certificates, CPA-readiness tracking) is the paid Pi Academy Membership.** Free must feel impressive enough to make enrollment desirable.
- Proposed **M1 module:** Accounts Receivable (end-to-end).

### Still open
- First paid module to ship in M1 (proposed: **AR**) — confirm.
- Practice data: learner's real ledger vs. seeded practice companies (privacy).
- Membership price point.
- Build timing vs. core BOG GA.

---

## Log

- `acad-01` (2026-06-29) ✅ Placeholder page + nav entry shipped; roadmap drafted.
- `acad-02` (2026-06-29) ✅ Direction reset per owner: separate identity, practice-room model, à-la-carte modular tracks. CPA Evolution + university curriculum grounded via web. `@market_researcher` + `@aesthetics_agent` dispatched to gather the full report.
- `acad-03` (2026-06-29) ✅ Both research streams returned; compiled into **`CPA_ACADEMY_REPORT.md`** (Part A curriculum/competency taxonomy, Part B "Pi Academy" separate-identity design, Part C synthesis + decisions). Brand recommends name **"Pi Academy"**, amber accent, `[data-surface="academy"]` token scope, 6 per-competency path colors. Proposed M1 = Accounts Receivable end-to-end.
- `acad-04` (2026-06-29) ✅ Owner locked: name **Pi Academy** + **π as main logo** (`PiAcademyMark`, amber crown sibling of BOG cube), and a **freemium hook** (free = minimum to register + one real win; paid Membership = full certification). Shipped: `PiAcademyLogo.tsx`, rebuilt `/academy` preview with amber identity + free-vs-membership tiers, nav renamed "Pi Academy". Pushed live. **Next:** `@technical_lead` Phase 0 (data model + practice-room bridge); confirm M1 module + practice-data + price.
