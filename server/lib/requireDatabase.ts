import type { Response } from 'express';
import { useDatabase } from './dbMode';

/** Respond 503 when PostgreSQL is not configured. BOG no longer serves in-memory demo ledgers. */
export function requireDatabase(res: Response): boolean {
  if (!useDatabase()) {
    res.status(503).json({
      error: 'Database required',
      hint: 'Run pnpm run go-live:local && pnpm run dev:program',
    });
    return false;
  }
  return true;
}
