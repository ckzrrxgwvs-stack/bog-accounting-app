/** True when API should persist to PostgreSQL via Prisma. */
export function useDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}
