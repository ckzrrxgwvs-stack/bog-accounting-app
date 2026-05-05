# Product phases (Face I, II, III…)

Canonical reference for **what ships in which release** and how **ERP and extensions** relate to the **accounting-first** launch. Works with **`PROGRAM_DIRECTION.md`** (why and where) and **`MODULE_ROADMAP.md`** (module build order **inside** accounting).

---

## Naming

- **Face I** = first **market launch story**: a **complete-enough accounting program** for the chosen NA vertical(s)—see completion criteria below.
- **Face II+** = additive releases (**ERP pack**, deeper logistics, manufacturing, etc.) shipped when ready—not hidden experiments forever.

**Important:** “Face I” is **not** the same as **module Phase 1** in `MODULE_ROADMAP.md` (that table is **foundation → … → reporting** within accounting).

---

## Face I — Accounting focus (launch scope)

**Goal:** Ship an accounting product we can **sell, implement, and support** for a defined NA vertical—**depth over breadth**.

**Includes (conceptually):**

- Foundation through financial statements & close for **that** launch promise—aligned with **`MODULE_ROADMAP.md`** modules as far as Face I commits (typically through strong GL, AP, AR, reporting, period discipline).
- Controls that matter for buyers: roles, audit posture, GL posting rules, period close—scoped per `PROGRAM_DIRECTION.md`.
- Any **AI / assistant** features remain **supporting**, not a substitute for correct books.

**Face I is “complete” when:**

- The **golden path** for the target industry is end-to-end credible (see `PROGRAM_DIRECTION.md`).
- **Known limitations** are documented (internal + customer-facing as needed).
- Production basics: env, auth, backups posture, and support path are defined—not “demo only.”

**Explicitly not required for Face I launch:**

- Full **ERP** surface (orders, logistics UI, MRP, etc.) as part of the **first launch story**—see Face II.

---

## Face II — ERP & operational depth (update / add-on)

**Goal:** Layer **operational ERP** (and related workflows) on top of the **same company books**, without rewriting accounting.

**Principles:**

- **Shared kernel:** GL, period close, and company policy remain the **system of record**; ERP events **post or reconcile** to the GL through defined integration (design early, ship when ready).
- **Modular delivery:** routes and features grouped so ERP can ship as **Face II** (or **licensed add-on**) without breaking Face I tenants who only use accounting.
- **Compatibility:** ERP work done **during Face I** lives in the **same repo** when possible—structured so it can ship as **Face II** via flags, packaging, or release notes—not half-wired into Face I UX promises.

**Launch Face II when:**

- Accounting kernel is stable enough that ERP traffic doesn’t compromise close **integrity**.
- At least one **vertical golden path** through ERP → finance is demonstrable (e.g. order → ship → invoice → cash with controlled exceptions).

---

## Face III, IV, …

Reserve for **major expansions**: deeper NA compliance lanes, additional vertical packs, LATAM configuration packs, mobile/PWA hardening, partner integrations—each phase gets its own short goal + exit criteria when planned.

---

## Parallel work during Face I

New ideas (ERP, logistics, etc.) **should not block** Face I.

| Do | Don’t |
| --- | --- |
| Track ERP issues as **Face II+** in backlog | Bundle ERP into **Face I marketing** before it’s ready |
| Keep **boundaries** (feature flags, routes, env) | Let ERP **silently** depend on incomplete GL/posting rules |
| Design **posting / period** touchpoints early | Merge incompatible UX so accounting users inherit ERP half-states |

---

## Cross-reference

- Strategy & geography: **`PROGRAM_DIRECTION.md`**
- Accounting module sequence: **`MODULE_ROADMAP.md`**
- Historical week-based plan (may be stale): **`../../SPEC.md`** §8
