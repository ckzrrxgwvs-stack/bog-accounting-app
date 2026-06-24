# Path B — Production go-live (Supabase + Render + Vercel)

**Goal:** Desktop / Vercel URL → real API → real Supabase database.

Repo: `https://github.com/ckzrrxgwvs-stack/bog-accounting-app`

---

## Step 1 — Supabase (you, ~5 min)

1. [supabase.com](https://supabase.com) → your project  
2. **Settings → Database → Connection string → URI**  
3. Copy the **entire** string (host looks like `db.xxxxxxxxxxxx.supabase.co`, **not** `db.1964...`)  
4. If password has `?` or `/`, reset password to letters+numbers only, or use Supabase’s pre-encoded URI  

**Keep this URI private** — you’ll paste it only into Render (Step 2).

---

## Step 2 — Render API (you, ~10 min)

1. [dashboard.render.com](https://dashboard.render.com) → sign in with GitHub  
2. **New +** → **Blueprint**  
3. Connect repo **`ckzrrxgwvs-stack/bog-accounting-app`**  
4. Render reads `render.yaml` and creates **`bog-accounting-api`**  
5. When prompted for env vars, set:
   - **`DATABASE_URL`** = paste Supabase URI from Step 1  
   - **`OPENAI_API_KEY`** = optional (AI CPA)  
   - **`SHOPIFY_WEBHOOK_SECRET`** = optional (later)  
6. **`JWT_SECRET`** and **`AGENT_ORG_CRON_SECRET`** — Render auto-generates  
7. Deploy and wait until **Live**  

**Copy your API URL**, e.g.:

`https://bog-accounting-api.onrender.com`

**Verify:**

```bash
curl -s https://bog-accounting-api.onrender.com/api/health
```

Expect: `"database": true`, `"schemaReady": true`

**If accounts still empty after deploy** — one-time init (Render → Environment → copy `AGENT_ORG_CRON_SECRET`):

```bash
curl -X POST https://bog-accounting-api.onrender.com/api/setup/init \
  -H "x-agent-org-secret: YOUR_AGENT_ORG_CRON_SECRET"
```

Expect: `"accountCount": 16` (or similar), `"userCount": 4`

**First login** (auto-seeded on empty DB):

- `admin@company.com` / `demo123`  
- Change password later via Users module or Supabase  

---

## Step 3 — Vercel frontend (you, ~5 min)

1. [vercel.com](https://vercel.com) → project **bog-accounting-v5**  
2. **Settings → Environment Variables**  
3. Add:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://bog-accounting-api.onrender.com/api` |

Use **your** Render URL + `/api` at the end.

4. **Deployments → Redeploy** latest (must rebuild so Vite picks up the var)  

**Verify:** open site → sidebar should show **Active** (not Demo) when API + DB work.

---

## Step 4 — Desktop launcher (already done)

Your **BOG Accounting.app** points at `https://bog-accounting-v5.vercel.app` — no change needed after Step 3.

---

## Step 5 — Shopify (when ready)

1. Render env: `SHOPIFY_WEBHOOK_SECRET`  
2. Shopify webhook URL: `https://bog-accounting-api.onrender.com/api/connectors/shopify/webhook`  
3. In app: **Agent operations** → enable store domain  

See `docs/SHOPIFY_CONNECTOR.md`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `database: false` on `/api/health` | `DATABASE_URL` missing/wrong on Render |
| P1001 / can’t reach DB | Wrong Supabase host or project paused |
| P1000 auth failed | Wrong password in URI |
| Vercel still Demo | `VITE_API_URL` not set or didn’t redeploy |
| CORS error in browser | `FRONTEND_URL` on Render = `https://bog-accounting-v5.vercel.app` |
| Login fails | Use API login `admin@company.com` / `demo123` after first deploy |

---

## Push code first (if Render deploy is stale)

From `accounting-app`:

```bash
git add -A && git commit -m "Production path B: Render bootstrap, db push, go-live docs"
git push origin main
```

Then trigger Render deploy from dashboard or auto on push.

---

## Agent org after Path B

| Agent | Action |
|-------|--------|
| PM | Open **Agent operations** → digest |
| Connector | Shopify webhook to Render URL |
| Bookkeeper | Runs on webhook or manual **Run bookkeeper** |
| Controller | Approve AR drafts → post to ledger |
| You | Supabase URI + Render + Vercel env vars |
