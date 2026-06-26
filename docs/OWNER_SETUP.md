# BOG owner login — available now vs later

**P60** · `@bog-systems-engineer` · 2026-06-25

## Available **now**

| Option | When to use | How |
|--------|-------------|-----|
| **First-run owner wizard** (recommended) | Fresh production or you want *your* email as President | Open `/setup-owner` or follow the link on the login page. Choose email + password, or **Generate secure password**. |
| **Bootstrap dev users** | Local development only | `pnpm run go-live:local` sets `BOG_BOOTSTRAP_USERS=1` → `admin@company.com` / `demo123` (or `BOG_BOOTSTRAP_PASSWORD`). |
| **Users page** | Add CFO, accountants, clerks after you are President | **Users** → Add User — email, role, password (8+) or generate. Wired to live Postgres. |
| **API** | Scripts / automation | `POST /api/setup/owner` (once) or `POST /api/users` (JWT as President/CFO/Controller). |

### Production first-time flow

1. Deploy API with `DATABASE_URL` + `JWT_SECRET`.
2. Run `pnpm exec prisma db push` on the API host.
3. Open `https://<your-vercel-app>/setup-owner`.
4. Create your President account (your real email).
5. Bootstrap demo users are **deactivated** automatically.

Do **not** set `BOG_BOOTSTRAP_USERS=1` on production Render unless you explicitly want dev accounts.

### Local dev flow

```bash
pnpm run go-live:local    # BOG_BOOTSTRAP_USERS=1 → demo users
pnpm run dev:program
```

Either sign in with `admin@company.com` / `demo123` **or** visit http://localhost:5173/setup-owner for your own login.

## Available **later** (backlog)

| Option | Notes |
|--------|--------|
| Email invitations | Send invite link + MFA enrollment |
| SSO / Google Workspace | Enterprise tenants |
| Self-service password reset | Forgot-password email flow |
| Username (non-email) login | Email remains primary identifier today |

## API reference

```bash
# Status + option list
GET /api/setup/owner-status

# One-time President setup (public, rate-limited)
POST /api/setup/owner
{
  "email": "you@company.com",
  "firstName": "Manuel",
  "lastName": "Mejia",
  "companyName": "My Company LLC",
  "password": "your-secure-password",
  "generatePassword": false
}

# Staff user (requires Bearer JWT — President/CFO/Controller)
POST /api/users
Authorization: Bearer <token>
{
  "email": "staff@company.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "ACCOUNTANT",
  "password": "min-8-chars"
}
```

## Environment

| Variable | Purpose |
|----------|---------|
| `BOG_BOOTSTRAP_USERS=1` | Create `admin@company.com` etc. (local go-live only) |
| `BOG_BOOTSTRAP_PASSWORD` | Override default `demo123` |
| `BOG_BOOTSTRAP_RESET=1` | Reset bootstrap passwords on `db:bootstrap` |
| `JWT_SECRET` | Required in production for login tokens |
