import { execFileSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { useDatabase } from '../lib/dbMode';
import { normalizeDatabaseUrl, prismaCliDatabaseUrl } from '../lib/databaseUrl';

let schemaChecked = false;
let schemaReady = false;

/** Apply Prisma schema to Postgres (idempotent). Runs once per process on Render if tables missing. */
export async function ensureDatabaseSchema(): Promise<void> {
  if (!useDatabase() || schemaChecked) return;

  const canQuery = await pingSchema();
  if (canQuery) {
    schemaReady = true;
    schemaChecked = true;
    return;
  }

  if (process.env.SCHEMA_PUSH_ON_START === 'false') {
    console.error('   ⚠️  Database tables missing and SCHEMA_PUSH_ON_START=false');
    schemaChecked = true;
    return;
  }

  console.log('   → Applying database schema (prisma db push)…');
  try {
    const rawUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
    execFileSync('pnpm', ['exec', 'prisma', 'db', 'push', '--accept-data-loss'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        ...(rawUrl ? { DATABASE_URL: prismaCliDatabaseUrl(rawUrl) } : {}),
      },
      cwd: process.cwd(),
    });
    schemaReady = await pingSchema();
    if (schemaReady) {
      console.log('   ✓ Database schema ready');
    } else {
      console.error('   ⚠️  Schema push finished but Company table still missing');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('   ⚠️  prisma db push failed:', msg.slice(0, 500));
  }

  schemaChecked = true;
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
