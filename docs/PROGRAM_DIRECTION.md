# Program direction

Canonical reference for **strategy, geography, and how we measure “good enough”** for a saleable vertical product. This is separate from **`PRODUCT_PHASES.md`** (what ships when) and **`MODULE_ROADMAP.md`** (order of accounting modules inside the product).

---

## 1. Geographic focus (now)

- **Primary:** North America — **United States, Mexico, and Canada** (regulatory and commercial cluster, shared trade patterns, bilingual operations).
- **Later:** Central and South America are plausible **extensions** (reuse language, currency, and cross-border patterns) once NA foundations are solid—not parallel “build the world” scope.

Design implication: prefer **country/region as configuration** (currency, tax profile, language) in core models where practical; avoid hard-coding a single country into the general ledger.

---

## 2. Vertical depth target (“65–75%”)

This does **not** mean matching every module of a global ERP suite.

It means:

- **High depth** on the daily workflows for **one or two adjacent industries** we explicitly choose.
- **Honest gaps**: documented limitations, or coverage via **integrations** (bank, payroll partner, 3PL, etc.), not silent promises.
- **Proof**: fewer “we still run this in Excel” moments for that wedge; reference customers over raw feature count.

---

## 3. Grounding rails (keep scope honest)

When prioritizing work, use these checks:

1. **Name the wedge** — Which industries and which buyer (e.g. owner, CFO, ops)?
2. **One golden path** — What end-to-end flow must feel excellent first?
3. **Explicit non-goals** — What we are **not** shipping this phase (prevents scope creep).
4. **Compliance as product** — What **blocks a sale** in NA (audit trail, roles, data handling, tax **hooks**); prefer honest partial depth over fake completeness.
5. **Integrate vs build** — Default to **integrate** for non-core adjacencies until the core is undeniable.

---

## 4. Relationship to other docs

| Document | Purpose |
| -------- | ------- |
| **`PRODUCT_PHASES.md`** | **Face I / II / III…** — product launches; accounting-first vs ERP-later; parallel development rules. |
| **`MODULE_ROADMAP.md`** | **Modules 1–8** — GAAP-aligned **build order** *within* the accounting core (not the same numbering as Face I). |
| **`../SPEC.md`** (repo root) | Broad technical specification; may lag—check dates against this folder for **current** direction. |

---

## 5. Revision

Update this file when geography, target vertical, or depth definition changes; **product phase boundaries** live in `PRODUCT_PHASES.md`.
