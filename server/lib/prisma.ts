import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { normalizeDatabaseUrl } from './databaseUrl';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

function createPrisma(): PrismaClient {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    throw new Error('DATABASE_URL is required when using the database');
  }
  process.env.DATABASE_URL = url;
  const useSsl =
    url.includes('supabase.co') ||
    url.includes('pooler.supabase.com') ||
    url.includes('sslmode=require') ||
    process.env.DATABASE_SSL === 'true';
  const pool = new pg.Pool({
    connectionString: url,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  globalForPrisma.pgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

/** Lazy client: no DB connection until a route actually uses Prisma (allows mock mode without DATABASE_URL). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getClient();
    const value = Reflect.get(client, prop, client) as unknown;
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
}) as PrismaClient;
