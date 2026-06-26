#!/usr/bin/env bash
# BOG go-live helper — local database path (fastest; no Supabase URL pain).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCAL_URL="postgresql://postgres:boglocal@localhost:5433/accounting"

echo "═══ BOG Go-Live (local database) ═══"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker Desktop OR fix Supabase DATABASE_URL in .env"
  exit 1
fi

echo "→ Starting Postgres (docker compose)..."
docker compose up -d

echo "→ Waiting for database..."
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres -d accounting >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export DATABASE_URL="${LOCAL_URL}"

echo "→ Pushing schema..."
pnpm exec prisma db push

echo "→ Seeding company + users..."
BOG_BOOTSTRAP_USERS=1 pnpm exec tsx server/scripts/bootstrapBogProgram.ts

if ! grep -q '^DATABASE_URL=postgresql://postgres:boglocal@localhost:5433/accounting' .env 2>/dev/null; then
  echo ""
  echo "Add this line to accounting-app/.env (or replace DATABASE_URL):"
  echo "DATABASE_URL=${LOCAL_URL}"
fi

echo ""
echo "✓ Ready. Run:  pnpm run dev:program"
echo "  Open:        http://localhost:5173"
  echo "  Login:       admin@company.com / demo123"
  echo "  Or:          http://localhost:5173/setup-owner (your own President login)"
echo ""
echo "Optional: recreate Desktop launcher for local:"
echo "  BOG_APP_URL=http://localhost:5173 ./scripts/create-mac-desktop-launcher.sh"
