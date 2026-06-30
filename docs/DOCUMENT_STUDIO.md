# BOG Document Studio — native productivity layer

**Phase 1 shipped:** 2026-06-30 · `@bog-systems-engineer` · `@aesthetics_agent`  
**Vision:** BOG as a productivity platform — branded mail and board-ready reports **inside the program**, with Office hub (.xlsx/.docx) as export compatibility, not the only path.

---

## What ships today (Phase 1)

| Capability | Route | Notes |
|------------|-------|-------|
| **Branded mail composer** | `/documents` | Templates, live letterhead preview, **Download .docx**, Print/PDF |
| **Company brand kit** | `GET /api/documents/brand` | Name, legal name, contact, logo URL |
| **Branded financial reports** | `/reports` | Letterhead on preview + **Print / PDF** |
| **Office hub** (existing) | `/office` | Excel/Word file exchange with Microsoft 365 |

Set **`logo`** on company (Settings → company profile when exposed, or API PATCH) to your logo URL; defaults to BOG mark.

---

## Roadmap (think big — portfolio platform base)

| Phase | Deliverable | Agents |
|-------|-------------|--------|
| **2** | SMTP send from BOG (SendGrid/Resend) with audit log | Systems Engineer, Security |
| **3** | Branded PDF server export (pdfkit) for reports + mail | Systems Engineer |
| **4** | Report **packs** — multi-statement bundle, cover, TOC | Bookkeeper, Aesthetics |
| **5** | In-app spreadsheet grid (beyond Data Studio) for ad-hoc analysis | Senior FE, Performance |
| **6** | Template marketplace / industry packs (CPA, retail, fund) | PM, Marketing |
| **7** | White-label / multi-tenant brand kits per portfolio book | Technical Lead |

Cross-crew borrow approved: **@aesthetics_agent** (letterhead), **@senior_frontend_engineer** (GH #7), **@store_builder_agent** (brand parity with storefront).

---

## User flow

### Mail
1. **Reporting & tools → Document Studio**
2. Pick template → edit recipient, subject, body
3. **Download .docx** (Word-compatible) or **Print / PDF** from preview

### Reports
1. **Reports** → generate live figures
2. **Print / PDF** — letterhead + statement layout (cleaner than raw CSV/Excel for clients)

---

## API

```http
GET  /api/documents/brand
POST /api/documents/mail/docx
     { "subject", "recipientName", "recipientEmail?", "body" }
```

---

## GH compliance

- **#7 Frontend** — Document Studio UI, print CSS, brand components
- **#6 Backend** — brand kit + docx compose routes
- **#9 Security** — Phase 2 email send requires auditor gate

Log: `doc-studio-01` in BUILD_BACKLOG.
