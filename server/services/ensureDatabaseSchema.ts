import { execFileSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { normalizeDatabaseUrl, prismaCliDatabaseUrl } from '../lib/databaseUrl';

let schemaChecked = false;
let schemaReady = false;

function runSchemaPush(): void {
  const rawUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  execFileSync('pnpm', ['exec', 'prisma', 'db', 'push', '--accept-data-loss'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      ...(rawUrl ? { DATABASE_URL: prismaCliDatabaseUrl(rawUrl) } : {}),
    },
    cwd: process.cwd(),
  });
}

/** Apply Prisma schema to Postgres (idempotent). Syncs columns on every startup on Render. */
export async function ensureDatabaseSchema(): Promise<void> {
  if (!useDatabase() || schemaChecked) return;

  if (process.env.SCHEMA_PUSH_ON_START === 'false') {
    schemaReady = await pingSchema();
    schemaChecked = true;
    if (!schemaReady) {
      throw new Error('Database schema out of date and SCHEMA_PUSH_ON_START=false');
    }
    return;
  }

  console.log('   → Syncing database schema (prisma db push)…');
  try {
    runSchemaPush();
  } catch (e) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const detail = [
      err.stderr?.toString(),
      err.stdout?.toString(),
      err.message,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 800);
    console.error('   ⚠️  prisma db push failed:', detail);
    schemaChecked = true;
    throw new Error(`prisma db push failed: ${detail.slice(0, 200)}`);
  }

  schemaReady = await pingSchema();
  schemaChecked = true;
  if (!schemaReady) {
    throw new Error('Schema push finished but Company table is still not queryable');
  }
  console.log('   ✓ Database schema ready');
}

export function isSchemaReady(): boolean {
  return schemaReady;
}

async function pingSchema(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.company.findFirst({ take: 1, select: { id: true } });
    return true;
  } catch {
    return false;
  }
}
