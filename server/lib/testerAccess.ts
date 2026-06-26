import { prisma } from './prisma';

export type TesterAccessInfo = {
  isTester: boolean;
  accessExpiresAt: string | null;
  daysRemaining: number | null;
  expired: boolean;
};

export async function getTesterAccessBlock(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;

  const enrollment = await prisma.testerEnrollment.findUnique({
    where: { userId },
    select: { accessExpiresAt: true },
  });
  if (!enrollment) return null;

  if (enrollment.accessExpiresAt <= new Date()) {
    return 'Your beta test period has ended. Thank you for your feedback!';
  }
  return null;
}

export async function getTesterAccessInfo(userId: string): Promise<TesterAccessInfo> {
  const enrollment = await prisma.testerEnrollment.findUnique({
    where: { userId },
    select: { accessExpiresAt: true },
  });
  if (!enrollment) {
    return { isTester: false, accessExpiresAt: null, daysRemaining: null, expired: false };
  }

  const msLeft = enrollment.accessExpiresAt.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const expired = msLeft <= 0;

  return {
    isTester: true,
    accessExpiresAt: enrollment.accessExpiresAt.toISOString(),
    daysRemaining,
    expired,
  };
}
