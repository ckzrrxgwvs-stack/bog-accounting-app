# BOG owner login & portfolio access — available now vs later

**P60 + P65** · `@bog-systems-engineer` · updated 2026-06-26

## Model (P65)

- **One portfolio company** — name set at first sign-in (you = President).
- **Many project books** — Commerce, Agentic, Personal, plus custom projects; each has its own GL.
- **Top menu** — switch active book; optional **Portfolio** rollup when authorized.
- **Members** — own email/password under your company (not separate companies).
- **Access chain** — President / CFO / Controller assign books; Controller assigns department managers; managers delegate AP, AR, Collections, etc.

## Available **now**

| Option | When to use | How |
|--------|-------------|-----|
| **First-run setup** (recommended) | Fresh production | Login page shows setup form when `needsOwnerSetup`, or `/setup-owner`. Business name + email + password or **generate password**. |
| **Bootstrap dev users** | Local only | `pnpm run go-live:local` → `admin@company.com` / `demo123` |
| **Users page** | Add staff, assign access | **Users** → Add User; book icon for portfolio + department grants |
| **Add project book** | New ledger under portfolio | Top menu → **Add project book** (President / CFO) |
| **API** | Automation | See API reference below |

### Production first-time flow

1. Deploy API with `DATABASE_URL` + `JWT_SECRET` (Render runs `prisma db push` on build).
2. Open `https://bog-accounting-v5.vercel.app/login` (or `/setup-owner`).
3. Complete setup with your business name and President credentials.
4. Bootstrap demo users are deactivated automatically.

Do **not** set `BOG_BOOTSTRAP_USERS=1` on production Render.

### Local dev flow

```bash
pnpm run go-live:local
pnpm run dev:program
```

Visit http://localhost:5173/login for inline setup or `/setup-owner`.

## Access delegation

| Role | Books & portfolio | Departments (AP, AR, Collections, …) |
|------|-------------------|--------------------------------------|
| President | Assign all | Assign all + re-delegation |
| CFO | Assign all | Assign all + re-delegation; create project books |
| Controller | Assign below Controller | Assign to accountants / clerks |
| Dept manager | — | Only modules granted with **May delegate downstream** |

## Available **later** (backlog)

| Option | Notes |
|--------|--------|
| Email invitations | Invite link + MFA enrollment |
| SSO / Google Workspace | Enterprise tenants |
| Self-service password reset | Forgot-password email flow |
| Settings → Portfolio tab | Optional; today: Users + top menu |

## API reference

```bash
# Status
GET /api/setup/owner-status

# One-time President setup (public, rate-limited)
POST /api/setup/owner
{
  "email": "you@company.com",
  "firstName": "Manuel",
  "lastName": "Mejia",
  "companyName": "My Portfolio LLC",
  "generatePassword": true
}

# Staff + access (JWT required)
POST /api/users
PUT /api/portfolio/users/:userId/access
{
  "canViewPortfolio": true,
  "bookIds": ["..."],
  "modules": [
    { "module": "accounts_receivable", "canDelegate": true },
    { "module": "collections", "canDelegate": false }
  ]
}

GET /api/portfolio/delegation-options
GET /api/company/workspaces
```

## Environment

| Variable | Purpose |
|----------|---------|
| `BOG_BOOTSTRAP_USERS=1` | Demo users (local only) |
| `BOG_BOOTSTRAP_PASSWORD` | Override `demo123` |
| `JWT_SECRET` | Required in production |
| `DATABASE_URL` | Supabase URI on Render |

## After deploy

Render `buildCommand` includes `pnpm exec prisma db push`. Verify:

```bash
curl -s https://bog-accounting-api.onrender.com/api/health
# expect database: true, schemaReady: true
```

Redeploy Vercel after API is live so `VITE_API_URL` points at Render `/api`.
