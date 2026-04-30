# Professional Accounting System

A full-featured web-based accounting application with AI CPA assistant, supporting USA (GAAP) and Mexico (NIF/CFDI) compliance.

## Current Deployment

- Frontend production URL: `https://bog-accounting-v5.vercel.app`
- Status: live and reachable
- Current mode: demo mode (frontend static deployment without backend API)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Demo Mode (Free - No Setup Required)

The application runs in demo mode by default using browser localStorage. All features are functional but data resets on browser refresh.

**Demo Accounts:**
- `admin@company.com` / `demo123` (President)
- `cfo@company.com` / `demo123` (CFO)
- `accountant@company.com` / `demo123` (Accountant)

## Free Tier Setup

### 1. Supabase (Recommended - Free 500MB)

1. Go to https://supabase.com and create a project
2. Go to Settings > Database > Connection string
3. Copy the URI and add to `.env`:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
   ```
4. Run migrations:
   ```bash
   cd accounting-app && npx prisma migrate deploy
   ```

### 2. Neon (Free 3GB)

1. Go to https://neon.tech and create a project
2. Copy the connection string to `.env`
3. Run migrations

### 3. OpenAI API (Free $5 Credit)

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required for Production

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | For AI CPA assistant |
| `JWT_SECRET` | Session token secret |
| `PAC_API_KEY` | Mexico CFDI (optional) |

## Features

### Core Modules
- **Dashboard** - KPIs, quick actions, aging summaries
- **General Ledger** - Journal entries, account filtering
- **Accounts Payable** - Vendor invoices, approval workflow
- **Accounts Receivable** - Customer invoices, aging
- **Inventory** - Items, low stock alerts, valuation
- **Payroll** - USA/Mexico compliance
- **CFDI** - Mexico electronic invoicing
- **Reports** - Income statement, balance sheet
- **AI CPA Assistant** - GPT-4 powered financial advisor

### Security
- **7 Roles**: President, CFO, Controller, Accountant, AP/AR Clerk, ReadOnly
- **MFA Required**: All users must set up multi-factor authentication
- **Role-based Permissions**: Module-level access control
- **Audit Logging**: Complete activity tracking

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State**: Zustand
- **Routing**: React Router 6
- **Backend**: Express.js (Node.js)
- **Database**: PostgreSQL (Prisma ORM)
- **AI**: OpenAI GPT-4
- **Charts**: Recharts

## Project Structure

```
accounting-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/           # Page components
│   ├── stores/          # Zustand stores
│   ├── services/        # API and data services
│   ├── types/           # TypeScript types
│   └── App.tsx          # Main app with routing
├── server/              # Express backend
│   ├── routes/           # API endpoints
│   └── services/        # Business logic
├── prisma/
│   └── schema.prisma    # Database schema
└── dist/                 # Production build
```

## Deployment (free static hosting)

The UI is a Vite SPA. **Recommended: [Vercel](https://vercel.com)** (free tier, good Vite support). **Netlify** and **Cloudflare Pages** work too — configs are in this folder.

### Vercel (easiest)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel → set **Root Directory** to `accounting-app` if your repo root is the parent folder (otherwise leave `.`).
3. Vercel detects `vercel.json`: build `pnpm run build:ci`, output `dist`, SPA routes rewrite to `index.html`.
4. You get a URL like `https://<project>.vercel.app`.

Environment variables (optional): add `VITE_API_URL` if your API is hosted elsewhere (full URL to the API base, e.g. `https://your-api.onrender.com/api`).

### Netlify

Connect the repo → base directory `accounting-app` → build command `pnpm run build:ci`, publish directory `dist`. Uses `netlify.toml` + `public/_redirects`.

### API note

`pnpm dev` proxies `/api` to the Express server locally. In production, deploy the **server** separately (Railway, Render, Fly.io) and set **`VITE_API_URL`** on the frontend host to that API base URL.

For full functionality with database:
1. Deploy frontend to static hosting (above)
2. Deploy backend to a Node.js platform (Railway, Render, Fly.io)
3. Use Supabase or Neon for free PostgreSQL

## License

MIT License