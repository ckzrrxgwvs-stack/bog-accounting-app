import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { seedChartOfAccountsTx } from './companyBootstrap';
import { ensureDefaultPortfolioBooks } from './portfolioBooks';
import { generateSecurePassword } from './ownerSetup';
import { issueAuthToken } from '../lib/issueAuthToken';
import { isBootstrapUserEmail } from '../lib/bootstrapUsers';

const DEFAULT_TRIAL_DAYS = Number(process.env.TESTER_TRIAL_DAYS ?? 15);

function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

function frontendBaseUrl(): string {
  const fromEnv = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  return fromEnv || 'https://bog-accounting-v5.vercel.app';
}

export function buildTesterInviteUrl(token: string): string {
  const base = frontendBaseUrl().replace(/\/$/, '');
  return `${base}/try/${token}`;
}

const TESTER_SANDBOX_FEATURES = {
  useInventory: true,
  usePayroll: true,
  useMultiCurrency: true,
  useCostCenters: true,
  useBankFeeds: true,
  useBankOutboundPayments: true,
  useUsPayrollTaxReporting: true,
  useUsInformationReturns: true,
  manualOperationsMode: false,
  aiRetainSessionMemory: true,
  isTesterSandbox: true,
} as const;

export async function issueTesterInviteLink(params: {
  label?: string | null;
  trialDays?: number;
  issuedById?: string | null;
}): Promise<{ id: string; token: string; inviteUrl: string; trialDays: number }> {
  const trialDays = params.trialDays ?? DEFAULT_TRIAL_DAYS;
  if (!Number.isFinite(trialDays) || trialDays < 1 || trialDays > 365) {
    throw new Error('trialDays must be between 1 and 365');
  }

  for (let attempt = 0; attempt < 15; attempt++) {
    const token = generateInviteToken();
    try {
      const row = await prisma.testerInviteLink.create({
        data: {
          token,
          label: params.label?.trim() || undefined,
          trialDays,
          issuedById: params.issuedById ?? undefined,
        },
      });
      return {
        id: row.id,
        token: row.token,
        inviteUrl: buildTesterInviteUrl(row.token),
        trialDays: row.trialDays,
      };
    } catch (e: unknown) {
      const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
      if (!dup) throw e;
    }
  }
  throw new Error('Could not generate a unique invite token');
}

export async function getTesterInvitePublic(tokenRaw: string) {
  const token = tokenRaw.trim();
  if (!token) throw new Error('Invite token is required');

  const link = await prisma.testerInviteLink.findUnique({ where: { token } });
  if (!link || !link.isActive) {
    throw new Error('This preview link is not valid');
  }

  const enrollmentCount = await prisma.testerEnrollment.count({
    where: { inviteLinkId: link.id },
  });

  return {
    label: link.label,
    trialDays: link.trialDays,
    isActive: link.isActive,
    enrollmentCount,
    inviteUrl: buildTesterInviteUrl(link.token),
  };
}

export async function claimTesterInvite(input: {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  generatePassword?: boolean;
  companyName?: string;
}): Promise<{
  token: string;
  generatedPassword?: string;
  accessExpiresAt: string;
  trialDays: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
    companyName: string;
    mfaEnabled: boolean;
    isTester: boolean;
    accessExpiresAt: string;
    daysRemaining: number;
  };
}> {
  const invite = await prisma.testerInviteLink.findUnique({
    where: { token: input.token.trim() },
  });
  if (!invite || !invite.isActive) {
    throw new Error('This preview link is not valid');
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) throw new Error('Valid email is required');
  if (isBootstrapUserEmail(email)) throw new Error('Use your personal email for your preview account');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already in use — sign in or use a different email');

  let plainPassword = input.password?.trim() ?? '';
  let generatedPassword: string | undefined;
  if (input.generatePassword) {
    generatedPassword = generateSecurePassword();
    plainPassword = generatedPassword;
  }
  if (plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters (or choose generate password)');
  }

  const companyName = (input.companyName?.trim() || 'Preview sandbox').trim();
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const firstLoginAt = new Date();
  const accessExpiresAt = new Date(firstLoginAt);
  accessExpiresAt.setDate(accessExpiresAt.getDate() + invite.trialDays);

  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        legalName: companyName,
        country: 'US',
        currency: 'USD',
        fiscalYearStart: 1,
        email,
        ownerSetupCompletedAt: firstLoginAt,
        ...TESTER_SANDBOX_FEATURES,
      },
    });

    await seedChartOfAccountsTx(tx, company.id);

    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: UserRoleType.PRESIDENT,
        companyId: company.id,
        isActive: true,
        mfaEnabled: false,
        canViewPortfolio: true,
        lastLoginAt: firstLoginAt,
      },
      include: { company: { select: { name: true } } },
    });

    await tx.testerEnrollment.create({
      data: {
        inviteLinkId: invite.id,
        userId: created.id,
        firstLoginAt,
        accessExpiresAt,
      },
    });

    return created;
  });

  await ensureDefaultPortfolioBooks(user.companyId);

  const authToken = issueAuthToken({
    id: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  const daysRemaining = Math.ceil(
    (accessExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  return {
    token: authToken,
    generatedPassword,
    accessExpiresAt: accessExpiresAt.toISOString(),
    trialDays: invite.trialDays,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? companyName,
      mfaEnabled: user.mfaEnabled,
      isTester: true,
      accessExpiresAt: accessExpiresAt.toISOString(),
      daysRemaining,
    },
  };
}

export async function listTesterInviteLinks() {
  const rows = await prisma.testerInviteLink.findMany({
    orderBy: { issuedAt: 'desc' },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: {
        orderBy: { firstLoginAt: 'desc' },
        take: 5,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    label: r.label,
    trialDays: r.trialDays,
    isActive: r.isActive,
    inviteUrl: buildTesterInviteUrl(r.token),
    issuedAt: r.issuedAt.toISOString(),
    revokedAt: r.revokedAt?.toISOString() ?? null,
    enrollmentCount: r._count.enrollments,
    recentEnrollments: r.enrollments.map((e) => ({
      email: e.user.email,
      name: `${e.user.firstName} ${e.user.lastName}`.trim(),
      firstLoginAt: e.firstLoginAt.toISOString(),
      accessExpiresAt: e.accessExpiresAt.toISOString(),
      expired: e.accessExpiresAt <= new Date(),
    })),
  }));
}

export async function revokeTesterInviteLink(id: string): Promise<void> {
  await prisma.testerInviteLink.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date() },
  });
}
