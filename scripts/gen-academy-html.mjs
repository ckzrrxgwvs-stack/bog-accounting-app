// Postbuild: generate dist/academy.html from dist/index.html with Pi Academy
// meta (title, Open Graph, Twitter, icons, theme). Social crawlers don't run JS,
// so a shared /academy link needs branded tags in the static HTML. vercel.json
// rewrites /academy -> /academy.html; the SPA still boots and routes to /academy.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const indexPath = resolve(dist, 'index.html');
if (!existsSync(indexPath)) {
  console.error('[gen-academy-html] dist/index.html not found — skipping');
  process.exit(0);
}

let html = readFileSync(indexPath, 'utf8');

const ACADEMY = {
  title: 'Pi Academy · CPA Practice',
  ogTitle: 'Pi Academy · learn the discipline behind the ledger',
  ogDescription:
    'A CPA practice room. Pick the competencies you want — AR, AP, GL and more — and build real, hands-on skill at your own pace.',
  ogImage: 'https://bog-accounting-v5.vercel.app/academy-og.png',
};

// Replace the `attr="..."` value inside the tag that carries id="<id>".
// Handles attr appearing before OR after the id within the same tag.
function setAttrById(id, attr, value) {
  const before = new RegExp(`(<[^>]*\\b${attr}=")[^"]*("[^>]*\\bid="${id}"[^>]*>)`);
  const after = new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\b${attr}=")[^"]*(")`);
  if (before.test(html)) html = html.replace(before, `$1${value}$2`);
  else if (after.test(html)) html = html.replace(after, `$1${value}$2`);
  else console.warn(`[gen-academy-html] could not set ${attr} for #${id}`);
}

html = html.replace(/<title>[^<]*<\/title>/, `<title>${ACADEMY.title}</title>`);

setAttrById('og-site-name', 'content', 'Pi Academy');
setAttrById('og-title', 'content', ACADEMY.ogTitle);
setAttrById('og-description', 'content', ACADEMY.ogDescription);
setAttrById('og-image', 'content', ACADEMY.ogImage);
setAttrById('twitter-title', 'content', ACADEMY.ogTitle);
setAttrById('twitter-description', 'content', ACADEMY.ogDescription);
setAttrById('twitter-image', 'content', ACADEMY.ogImage);
setAttrById('app-favicon', 'href', '/academy-icon.svg');
setAttrById('app-apple-icon', 'href', '/academy-180.png');
setAttrById('app-manifest', 'href', '/academy.webmanifest');
setAttrById('app-theme-color', 'content', '#e8990f');
setAttrById('app-apple-title', 'content', 'Pi Academy');

writeFileSync(resolve(dist, 'academy.html'), html);
console.log('[gen-academy-html] wrote dist/academy.html');
