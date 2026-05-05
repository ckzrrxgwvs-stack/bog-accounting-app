/**
 * Printable SVG barcode strip + human-readable text (demo placement).
 * For GS1-128 / scanner-grade labels in production, integrate a validated encoder
 * or render PNG via an optional `bwip-js` install (`pnpm add bwip-js`).
 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Deterministic pseudo-bar pattern from payload for layout preview (not for POS scanning). */
export function buildBarcodeSvg(payload: string, humanReadable?: string | null): string {
  const text = humanReadable ?? payload;
  const unit = 2;
  let x = 10;
  const parts: string[] = [];
  for (let i = 0; i < payload.length; i++) {
    const n = (payload.charCodeAt(i) * (i + 7)) % 5;
    const w = 1 + (n % 3);
    parts.push(`<rect x="${x}" y="8" width="${w}" height="36" fill="#111"/>`);
    x += w + unit;
  }
  const width = Math.max(160, x + 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64">
  <rect width="100%" height="100%" fill="#fff"/>
  ${parts.join('')}
  <text x="10" y="58" font-family="ui-monospace,monospace" font-size="10" fill="#333">${escapeXml(text)}</text>
</svg>`;
}
