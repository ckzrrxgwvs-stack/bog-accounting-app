#!/usr/bin/env bash
# Desktop launcher for sharing BOG with family & close friends — program input, not public beta.
set -euo pipefail

APP_NAME="${BOG_SHARE_APP_NAME:-BOG · Family Preview — SHARE}"
URL_FILE="${BOG_FAMILY_PREVIEW_URL_FILE:-${HOME}/.bog-family-preview.url}"
DESKTOP="${HOME}/Desktop"
APP_PATH="${DESKTOP}/${APP_NAME}.app"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="${ROOT}/public/favicon.svg"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "${BUILD_DIR}"' EXIT

# BOG_APP_URL overrides file; otherwise launcher reads URL_FILE at double-click time.
if [[ -n "${BOG_APP_URL:-}" ]]; then
  mkdir -p "$(dirname "${URL_FILE}")"
  printf '%s\n' "${BOG_APP_URL}" > "${URL_FILE}"
  chmod 600 "${URL_FILE}"
fi

echo "→ Building family & friends preview share icon on Desktop"
echo "  Name: ${APP_NAME}"
echo "  URL file: ${URL_FILE}"
echo "  Note: BOG is still in development — for trusted feedback only, not public release."

# Remove legacy / public-beta launcher names.
rm -rf "${DESKTOP}/BOG Beta Test — SHARE.app" 2>/dev/null || true
rm -rf "${DESKTOP}/BOG Beta Test.app" 2>/dev/null || true

qlmanage -t -s 1024 -o "${BUILD_DIR}" "${SVG}" >/dev/null 2>&1
PNG="${BUILD_DIR}/$(basename "${SVG}").png"
if [[ ! -f "${PNG}" ]]; then
  echo "Could not render icon from ${SVG}" >&2
  exit 1
fi

ICONSET="${BUILD_DIR}/AppIcon.iconset"
mkdir -p "${ICONSET}"
sips -z 16 16     "${PNG}" --out "${ICONSET}/icon_16x16.png"      >/dev/null
sips -z 32 32     "${PNG}" --out "${ICONSET}/icon_16x16@2x.png"   >/dev/null
sips -z 32 32     "${PNG}" --out "${ICONSET}/icon_32x32.png"      >/dev/null
sips -z 64 64     "${PNG}" --out "${ICONSET}/icon_32x32@2x.png"   >/dev/null
sips -z 128 128   "${PNG}" --out "${ICONSET}/icon_128x128.png"    >/dev/null
sips -z 256 256   "${PNG}" --out "${ICONSET}/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "${PNG}" --out "${ICONSET}/icon_256x256.png"    >/dev/null
sips -z 512 512   "${PNG}" --out "${ICONSET}/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "${PNG}" --out "${ICONSET}/icon_512x512.png"    >/dev/null
sips -z 1024 1024 "${PNG}" --out "${ICONSET}/icon_512x512@2x.png" >/dev/null
iconutil -c icns "${ICONSET}" -o "${BUILD_DIR}/AppIcon.icns"

rm -rf "${APP_PATH}"
mkdir -p "${APP_PATH}/Contents/MacOS" "${APP_PATH}/Contents/Resources"

cat > "${APP_PATH}/Contents/MacOS/launcher" <<'EOF'
#!/bin/bash
URL_FILE="${BOG_FAMILY_PREVIEW_URL_FILE:-$HOME/.bog-family-preview.url}"
if [[ -f "${URL_FILE}" ]]; then
  URL="$(head -1 "${URL_FILE}" | tr -d '[:space:]')"
  if [[ -n "${URL}" ]]; then
    open "${URL}"
    exit 0
  fi
fi
osascript <<'APPLESCRIPT' 2>/dev/null || true
display dialog "Family preview link not set yet.

1. Sign in to BOG → Settings → Licensing
2. Create a family preview link
3. In Terminal, run:
   pnpm run configure:family-preview-url -- 'PASTE_URL_HERE'

Opening Settings now." buttons {"OK"} default button 1 with title "BOG Family Preview"
APPLESCRIPT
open "https://bog-accounting-v5.vercel.app/settings"
EOF
chmod +x "${APP_PATH}/Contents/MacOS/launcher"

cp "${BUILD_DIR}/AppIcon.icns" "${APP_PATH}/Contents/Resources/AppIcon.icns"

cat > "${APP_PATH}/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.bog.accounting.family-preview.share</string>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

touch "${APP_PATH}"

echo "✓ Created: ${APP_PATH}"
echo "  Share only with family & close friends — BOG is unfinished; their input helps improve it."
echo "  Preview access ends 15 days after each person's first sign-in."
