/**
 * Allow-listed RSS/HTML fetch + optional summarization.
 * No arbitrary crawling — URLs must come from configured IntelFeedSource rows or env defaults.
 */
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';

const FETCH_TIMEOUT_MS = Math.min(Math.max(Number(process.env.INTEL_FETCH_TIMEOUT_MS ?? 25_000), 5_000), 60_000);
const MAX_BODY_CHARS = Math.min(Math.max(Number(process.env.INTEL_MAX_BODY_CHARS ?? 120_000), 8_000), 500_000);
const HOST_DENY = new Set(
  (process.env.INTEL_FEED_HOST_DENYLIST ?? 'localhost,127.0.0.1,0.0.0.0,::1,169.254.169.254')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

export function assertSafeIntelUrl(urlStr: string): URL {
  let u: URL;
  try {
    u = new URL(urlStr.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  if (u.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed for intel feeds');
  }
  const host = u.hostname.toLowerCase();
  if (HOST_DENY.has(host) || host.endsWith('.localhost')) {
    throw new Error('Host is not permitted for intel feeds');
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error('Private/reserved hostnames are not permitted');
  }
  return u;
}

function extractRssTitlesAndSnippet(xml: string): { titles: string[]; snippet: string } {
  const titles: string[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const blocks = itemBlocks.length > 0 ? itemBlocks.slice(0, 25) : [xml];
  for (const block of blocks) {
    const m = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m?.[1]) {
      const t = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/i, '$1').replace(/<[^>]+>/g, '').trim();
      if (t && !titles.includes(t)) titles.push(t.slice(0, 500));
    }
    if (titles.length >= 18) break;
  }
  const snippet = xml.slice(0, MAX_BODY_CHARS).trim();
  return { titles, snippet };
}

function stripHtmlRough(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BODY_CHARS);
}

export async function fetchFeedBody(url: URL): Promise<{ text: string; status: number }> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.8',
        'User-Agent': 'BOG-Pi-IntelDigest/1.0 (+allow-listed feeds only)',
      },
    });
    const buf = await res.text();
    return { text: buf.slice(0, MAX_BODY_CHARS), status: res.status };
  } finally {
    clearTimeout(t);
  }
}

async function summarizeWithOpenAI(label: string, titles: string[], excerpt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || process.env.INTEL_DIGEST_SUMMARIZE === 'false') return null;

  const openai = new OpenAI({ apiKey: key });
  const titlesBlock = titles.length ? titles.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join('\n') : '(no titles parsed)';
  const body = excerpt.slice(0, 14_000);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.INTEL_DIGEST_MODEL ?? 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content:
            'You summarize allow-listed public feeds for product intelligence for a North-American accounting/ERP team. Output markdown: ## Headlines, ## Possible product implications (hypotheses only), ## What to verify before building. No legal advice; flag compliance sensitivity briefly.',
        },
        {
          role: 'user',
          content: `Feed label: ${label}\n\nTitles:\n${titlesBlock}\n\nExcerpt (truncated):\n${body}`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error('Intel digest summarize:', e);
    return null;
  }
}

/** Runs digest for all enabled IntelFeedSource rows. Idempotent append rows. */
export async function runIntelDigestJob(): Promise<{ sourcesProcessed: number; itemsWritten: number }> {
  const sources = await prisma.intelFeedSource.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  let itemsWritten = 0;
  for (const src of sources) {
    let url: URL;
    try {
      url = assertSafeIntelUrl(src.url);
    } catch (e) {
      console.warn(`Intel skip bad URL ${src.label}:`, e);
      continue;
    }

    try {
      const { text, status } = await fetchFeedBody(url);
      const lower = text.slice(0, 4000).toLowerCase();
      const looksXml = lower.includes('<rss') || lower.includes('<feed') || lower.includes('<rdf:rdf');
      const parsed = looksXml ? extractRssTitlesAndSnippet(text) : { titles: [] as string[], snippet: stripHtmlRough(text) };
      const { titles, snippet: excerpt } = parsed;
      const titleLine =
        titles.length > 0 ? titles.slice(0, 5).join(' · ') : `${src.label} fetch (${status})`;

      const summary = await summarizeWithOpenAI(src.label, titles, excerpt);

      await prisma.intelDigestItem.create({
        data: {
          sourceId: src.id,
          title: titleLine.slice(0, 500),
          excerpt,
          summary,
          httpStatus: status,
        },
      });
      itemsWritten += 1;
    } catch (e) {
      console.error(`Intel fetch failed ${src.label}:`, e);
      await prisma.intelDigestItem.create({
        data: {
          sourceId: src.id,
          title: `${src.label} — fetch error`,
          excerpt: String(e instanceof Error ? e.message : e).slice(0, 8000),
          summary: null,
          httpStatus: 0,
        },
      });
      itemsWritten += 1;
    }
  }

  /** Trim oldest digest rows globally (cap growth). */
  const cap = Math.min(Math.max(Number(process.env.INTEL_DIGEST_ROW_CAP ?? 4000), 200), 50_000);
  const total = await prisma.intelDigestItem.count();
  const overflow = total - cap;
  if (overflow > 0) {
    const victims = await prisma.intelDigestItem.findMany({
      orderBy: { fetchedAt: 'asc' },
      take: overflow,
      select: { id: true },
    });
    await prisma.intelDigestItem.deleteMany({
      where: { id: { in: victims.map((v) => v.id) } },
    });
  }

  return { sourcesProcessed: sources.length, itemsWritten };
}

/** Seed default HTTPS feeds from comma-separated INTEL_SEED_FEEDS=url|Label,url|Label when table empty. */
export async function seedIntelFeedsFromEnvIfEmpty(): Promise<void> {
  const raw = process.env.INTEL_SEED_FEEDS?.trim();
  if (!raw) return;
  const count = await prisma.intelFeedSource.count();
  if (count > 0) return;

  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  let order = 0;
  for (const p of parts) {
    const [urlPart, labelPart] = p.split('|').map((x) => x.trim());
    if (!urlPart) continue;
    const label = labelPart || urlPart.slice(0, 80);
    try {
      assertSafeIntelUrl(urlPart);
      await prisma.intelFeedSource.create({
        data: { label, url: urlPart, enabled: true, sortOrder: order++ },
      });
    } catch (e) {
      console.warn('INTEL_SEED_FEEDS skip:', urlPart, e);
    }
  }
}
