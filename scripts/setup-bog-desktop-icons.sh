#!/usr/bin/env bash
# Creates/refreshes BOG Desktop icons: main app + family & friends share.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ -f "${HOME}/.bog-secrets.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${HOME}/.bog-secrets.env"
  set +a
fi

echo "→ Main program icon (BOG-Pi · Books On The Go)"
bash scripts/create-mac-desktop-launcher.sh

echo "→ Pi Academy icon (CPA practice — launches separately, integral sibling)"
bash scripts/create-academy-desktop-launcher.sh

URL_FILE="${BOG_FAMILY_PREVIEW_URL_FILE:-${HOME}/.bog-family-preview.url}"

if [[ -n "${BOG_APP_URL:-}" ]] || [[ -f "${URL_FILE}" ]]; then
  echo "→ Family & friends share icon"
  bash scripts/create-family-preview-launcher.sh
elif [[ -n "${AGENT_ORG_CRON_SECRET:-}" ]] || [[ -n "${TESTER_INVITE_ISSUER_SECRET:-}" ]]; then
  echo "→ Issuing production family preview link via API…"
  pnpm run issue:family-preview -- --via-api --desktop
else
  echo "→ Family share icon (configure URL at first open)"
  bash scripts/create-family-preview-launcher.sh
  echo ""
  echo "Tip: After you create a link in Settings → Licensing, run:"
  echo "  pnpm run configure:family-preview-url -- 'https://bog-accounting-v5.vercel.app/try/TOKEN'"
  echo "  pnpm run create:family-share-icon"
fi
