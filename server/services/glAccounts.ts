import { prisma } from '../lib/prisma';

/** Resolve posting account id by company chart code; returns null if missing. */
export async function requireAccountIdByCode(companyId: string, code: string): Promise<string> {
  const trimmed = code.trim();
  const a = await prisma.account.findFirst({
    where: { companyId, code: trimmed, isActive: true, allowPosting: true },
  });
  if (!a) {
    throw new Error(`Chart of accounts has no active posting account with code ${trimmed}`);
  }
  return a.id;
}
