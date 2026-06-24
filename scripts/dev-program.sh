#!/usr/bin/env bash
# Run API + Vite together for full BOG program on localhost.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not set. Run first:  pnpm run go-live:local"
  exit 1
fi

cleanup() {
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "${VITE_PID:-}" ]] && kill "$VITE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ API   http://localhost:3001/api/health"
echo "→ App   http://localhost:5173"
echo "→ Login admin@company.com / demo123"
echo ""

pnpm exec tsx watch server/index.ts &
SERVER_PID=$!
pnpm exec vite &
VITE_PID=$!

wait
