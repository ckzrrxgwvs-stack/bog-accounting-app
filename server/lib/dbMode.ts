/** True when API should persist to PostgreSQL via Prisma. */
export function useDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Same as useDatabase — alias for non-React middleware where "use*" triggers hooks lint. */
export function databaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
