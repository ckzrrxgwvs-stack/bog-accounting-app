#!/usr/bin/env bash
# Save production family preview link for Desktop share icon (one line).
set -euo pipefail

URL=""
for arg in "$@"; do
  [[ "${arg}" == "--" ]] && continue
  URL="${arg}"
done

URL_FILE="${BOG_FAMILY_PREVIEW_URL_FILE:-${HOME}/.bog-family-preview.url}"

if [[ -z "${URL}" ]]; then
  echo "Usage: pnpm run configure:family-preview-url -- 'https://bog-accounting-v5.vercel.app/try/TOKEN'" >&2
  echo "Create the link in BOG → Settings → Licensing, then paste the full URL here." >&2
  exit 1
fi

if [[ ! "${URL}" =~ ^https://bog-accounting-v5\.vercel\.app/try/[A-Za-z0-9_-]+$ ]]; then
  echo "URL must look like: https://bog-accounting-v5.vercel.app/try/YOUR_TOKEN" >&2
  exit 1
fi

mkdir -p "$(dirname "${URL_FILE}")"
printf '%s\n' "${URL}" > "${URL_FILE}"
chmod 600 "${URL_FILE}"

echo "✓ Saved family preview URL to ${URL_FILE}"
echo "  Run: pnpm run create:family-share-icon"
