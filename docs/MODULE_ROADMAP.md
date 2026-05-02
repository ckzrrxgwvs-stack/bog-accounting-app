# Module roadmap (GAAP-aligned build order)

Build sequence follows normal accounting flow: **foundation → master data → general ledger → subledgers → reporting → extensions**. Reports are used as **checkpoints** alongside modules, not only at the end.

| Phase | Module | Scope (high level) | Depends on |
| ----- | ------ | ------------------- | ---------- |
| **1** | **Foundation** | Company profile, fiscal settings, **chart of accounts** (COA), optional opening balances | — |
| **2** | **Master data** | Customers, vendors, inventory items (as needed) | Phase 1 |
| **3** | **General ledger** | Journal entries, posting, period awareness | Phase 1–2 |
| **4** | **Accounts payable** | Vendor bills → approvals → payments → GL | Phase 1–3 |
| **5** | **Accounts receivable** | Customer invoices → receipts → GL | Phase 1–3 |
| **6** | **Inventory / Payroll / CFDI** | Domain-specific modules | Prior phases + compliance rules |
| **7** | **Financial statements & close** | Trial balance, income statement, balance sheet, cash flow; period close habits | Phases 1–6 |
| **8** | **Field / mobile (later)** | Same APIs; responsive/PWA then native clients | Stable API + auth |

**Current focus:** Phase **1** — COA + company stored in PostgreSQL via API; UI at `/ledger/coa`.
