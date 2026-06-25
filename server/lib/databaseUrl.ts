/** Fix common paste mistakes in Render / Supabase DATABASE_URL values. */
export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  if (url.startsWith('DATABASE_URL=')) {
    url = url.slice('DATABASE_URL='.length).trim();
  }
  return url;
}

export type DatabaseUrlCheck =
  | { ok: true; host: string; port: string }
  | { ok: false; reason: string };

export function validateDatabaseUrl(url: string): DatabaseUrlCheck {
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    return {
      ok: false,
      reason: 'Must start with postgresql:// (no quotes, no DATABASE_URL= prefix)',
    };
  }
  try {
    const parsed = new URL(url.replace(/^postgres:\/\//, 'postgresql://'));
    if (!parsed.hostname) {
      return {
        ok: false,
        reason: 'Missing hostname — password may contain unescaped @ or # characters',
      };
    }
    return { ok: true, host: parsed.hostname, port: parsed.port || '5432' };
  } catch {
    return {
      ok: false,
      reason: 'Could not parse URL — special characters in password must be URL-encoded (@ # : / ? %)',
    };
  }
}

/** Normalize env DATABASE_URL in place; log safe diagnostics when invalid. */
export function applyDatabaseUrlEnv(): DatabaseUrlCheck | null {
  const normalized = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!normalized) return null;
  process.env.DATABASE_URL = normalized;
  const check = validateDatabaseUrl(normalized);
  if (!check.ok) {
    console.error(`   ⚠️  DATABASE_URL invalid: ${check.reason}`);
  } else {
    console.log(`   🔗 Database host: ${check.host}:${check.port}`);
  }
  return check;
}
