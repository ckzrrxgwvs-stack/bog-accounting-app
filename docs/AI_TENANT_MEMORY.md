# AI organizational memory (opt-in)

## What this is

- **Executive toggle:** `Company.aiRetainSessionMemory` (Settings UI under **Manual operations** as **Retain AI session excerpts for this company**).
- **Scope:** Data stays **inside one tenant / company**. Nothing here aggregates customer keystrokes across unrelated tenants into one shared brain for BOG globally — future commercial/analytics pools would need **separate** consent and contracts.

## How “growth” works technically

1. After AI CPA or ERP Assistant returns an answer (live OpenAI mode), optional **truncated excerpts** of the user prompt + assistant reply are stored as rows in **`AiTenantMemory`** (`channel`: `AI_CPA` or `ERP_ASSISTANT`).
2. Before the **next** call for that channel, the latest excerpts are formatted into text and appended to the **system** portion of the model prompt (**retrieval / prompt augmentation**).

That improves continuity (“remember how we explained this yesterday”). It does **not** fine-tune or permanently reprogram OpenAI’s base weights from each keystroke.

## Limits & honesty

- **Cap:** Roughly **380** total excerpts per company (server trims oldest).
- **Not** an excuse to paste ledger-confidential strings — excerpts should respect internal privacy policies.
- **Manual operations mode:** When AI assistants are disabled company-wide, they stop storing **new** memory automatically because assistants do not run.

## Compliance note

Financial/regulated environments often still require DPIAs, retention policy, and right-to-erasure workflows — extend beyond code before claiming enterprise-ready governance.
