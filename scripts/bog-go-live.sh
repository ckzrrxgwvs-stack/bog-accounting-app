#!/usr/bin/env bash
# BOG go-live helper — Docker Postgres (default) or existing DATABASE_URL in .env (Supabase/Neon).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCAL_URL="postgresql://postgres:boglocal@localhost:5433/accounting"

echo "═══ BOG Go-Live (local database) ═══"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

push_schema_and_seed() {
  echo "→ Pushing schema..."
  pnpm exec prisma db push
  echo "→ Seeding company + users..."
  BOG_BOOTSTRAP_USERS=1 pnpm exec tsx server/scripts/bootstrapBogProgram.ts
}

print_ready() {
  echo ""
  echo "✓ Ready. Run:  pnpm run dev:program"
  echo "  Open:        http://localhost:5173"
  echo "  Login:       admin@company.com / demo123"
  echo "  Or:          http://localhost:5173/setup-owner (your own President login)"
  echo ""
  echo "Optional: recreate Desktop launcher for local:"
  echo "  BOG_APP_URL=http://localhost:5173 ./scripts/create-mac-desktop-launcher.sh"
}

if ! command -v docker >/dev/null 2>&1; then
  if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" != "$LOCAL_URL" && "$DATABASE_URL" != *"localhost:5433"* ]]; then
    echo "Docker not found — using DATABASE_URL from .env (cloud / remote Postgres)"
    push_schema_and_seed
    print_ready
    exit 0
  fi

  echo ""
  echo "Docker not found and DATABASE_URL points at local Docker Postgres (port 5433)."
  echo ""
  echo "Pick one path:"
  echo ""
  echo "  A) Install Docker Desktop, then re-run:"
  echo "       pnpm run go-live:local"
  echo ""
  echo "  B) Use Supabase or Neon (no Docker):"
  echo "     1. Create a free project at https://supabase.com or https://neon.tech"
  echo "     2. Copy the Postgres connection URI into .env as DATABASE_URL"
  echo "        (replace the localhost:5433 line — keep ?sslmode=require for Supabase)"
  echo "     3. Re-run:  pnpm run go-live:local"
  echo ""
  echo "  C) If you already commented a Supabase URL in .env, uncomment it and"
  echo "     comment out the localhost:5433 line, then re-run go-live:local."
  echo ""
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

push_schema_and_seed

if ! grep -q '^DATABASE_URL=postgresql://postgres:boglocal@localhost:5433/accounting' .env 2>/dev/null; then
  echo ""
  echo "Add this line to accounting-app/.env (or replace DATABASE_URL):"
  echo "DATABASE_URL=${LOCAL_URL}"
fi

print_ready
