# Go live today — BOG as a real accounting program

**Agent org execution plan** (PM → Systems Engineer → Bookkeeper → Connector → Controller → You).

---

## The gap today

| Piece | Status |
|-------|--------|
| Accounting UI (GL, AR, AP, reports) | Built |
| Agent spine + Shopify connector code | Built |
| **Vercel site** (`bog-accounting-v5.vercel.app`) | **Frontend only** — no API on same host → demo/offline |
| **Your Supabase URL** | Wrong host (`db.1964...`) — blocked |
| eBay / dropship-crew | Not linked yet |

**Face I goal:** One company, real database, API login, books persist, Shopify can feed AR.

---

## Fastest path (today, ~15 min) — local program on your Mac

No Supabase URL fighting. Uses Docker Postgres.

```bash
cd "/Users/manuelmejia/Desktop/BOG  APP/accounting-app"

# 1. Start DB + schema + seed users
pnpm run go-live:local

# 2. Put this in .env (go-live script prints it if missing):
# DATABASE_URL=postgresql://postgres:boglocal@localhost:5433/accounting

# 3. Run full program (API + UI)
pnpm run dev:program
```

Open **http://localhost:5173**  
Login: **admin@company.com** / **demo123**  
Sidebar should show **Active** (green), not Demo.

Optional Desktop app for local:

```bash
BOG_APP_URL=http://localhost:5173 ./scripts/create-mac-desktop-launcher.sh
```

---

## Production path (website + Desktop launcher)

Vercel = static files only. API must live elsewhere.

### Systems Engineer — deploy API (Render)

1. Push repo to GitHub (if not already)
2. [render.com](https://render.com) → New **Blueprint** → point at `accounting-app/render.yaml`
3. Set **`DATABASE_URL`** in Render to your **correct** Supabase URI (paste from Supabase dashboard)
4. Note API URL: `https://bog-accounting-api.onrender.com` (example)

### Systems Engineer — wire Vercel frontend

In Vercel project **bog-accounting-v5**:

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://YOUR-RENDER-API.onrender.com/api` |

Redeploy Vercel. Desktop launcher URL stays `https://bog-accounting-v5.vercel.app` — now it hits real API.

### You — fix Supabase (when ready for cloud DB)

Supabase → **Settings → Database → Connection string (URI)** → copy whole line → Render `DATABASE_URL` (and local `.env` if you switch off Docker).

---

## Agent checklist (after DB works)

| Agent | Task | Done when |
|-------|------|-----------|
| **PM** | Run digest | `GET /api/agent-org/digest` shows zeros or real counts |
| **Bookkeeper** | Process events | `POST /api/agent-org/run-bookkeeper` |
| **Connector** | Shopify webhook | `docs/SHOPIFY_CONNECTOR.md` — secret + store domain |
| **Controller** | Approve drafts | Agent operations → AR draft → post to ledger |
| **Systems Engineer** | Render + Vercel env | `/api/health` → `"database": true` on production |
| **You** | Login API (not localStorage demo) | `admin@company.com` after bootstrap |

---

## Shopify (first live channel)

1. API public URL (Render or ngrok for local test)
2. `SHOPIFY_WEBHOOK_SECRET` on API server
3. Shopify Admin → webhook `orders/paid` → `/api/connectors/shopify/webhook`
4. **Agent operations** → enable store domain
5. Paid order → **Events** tab → **AR** draft invoice

---

## Not in “today” scope (Face II / next)

- eBay connector (dropship-crew)
- Multi-project dashboard (filter by `SHOPIFY` / `EBAY` source — UI partial in Agent operations)
- Auto GL post without Controller approval

---

## Commands reference

| Command | Purpose |
|---------|---------|
| `pnpm run go-live:local` | Docker DB + `db push` + seed |
| `pnpm run dev:program` | API :3001 + UI :5173 |
| `pnpm run db:bootstrap` | Re-seed users only |
| `pnpm start` | API only |
| `pnpm run start:mock` | Mock API (no DB) |

---

## GH compliance touchpoints

- **#10 DevOps:** `render.yaml` + `VITE_API_URL` (this doc)
- **#9 Security:** set `JWT_SECRET` on Render; use API login not demo localStorage
- **#8 Face I:** real COA + AR/AP + period discipline before more ERP

**Human gate:** You merge deploys and approve Controller posts — agents draft and build, you ship.
