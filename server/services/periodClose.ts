import { prisma } from '../lib/prisma';

export async function isPeriodClosed(companyId: string, date: Date): Promise<boolean> {
  const year = date.getFullYear();
  const period = date.getMonth() + 1;
  const row = await prisma.closedPeriod.findUnique({
    where: { companyId_year_period: { companyId, year, period } },
  });
  return !!row;
}

export async function assertPeriodOpen(companyId: string, date: Date): Promise<void> {
  if (await isPeriodClosed(companyId, date)) {
    const y = date.getFullYear();
    const p = date.getMonth() + 1;
    throw new Error(`Period ${p}/${y} is closed. Reopen it to post.`);
  }
}
