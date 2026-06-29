import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { UserRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BOOTSTRAP_USER_EMAILS, isBootstrapUserEmail } from '../lib/bootstrapUsers';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { issueAuthToken } from '../lib/issueAuthToken';
import { ensureDefaultPortfolioBooks } from './portfolioBooks';

export function generateSecurePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export type OwnerSetupStatus = {
  needsOwnerSetup: boolean;
  ownerSetupCompleted: boolean;
  bootstrapUsersAvailable: boolean;
  presidentEmail: string | null;
  /** True when an active PRESIDENT can sign in (custom or bootstrap). */
  signInAvailable: boolean;
  /** Email hint for login form — custom President or local bootstrap admin. */
  presidentLoginHint: string | null;
  options: {
    availableNow: Array<{ id: string; label: string; description: string }>;
    availableLater: Array<{ id: string; label: string; description: string }>;
  };
};

export async function getOwnerSetupStatus(): Promise<OwnerSetupStatus> {
  const company = await getOrCreateDefaultCompany();
  const users = await prisma.user.findMany({
    where: { companyId: company.id, isActive: true },
    select: { email: true, role: true },
  });

  const customPresident = users.find(
    (u) => u.role === UserRoleType.PRESIDENT && !isBootstrapUserEmail(u.email)
  );
  const bootstrapPresident = users.find(
    (u) => u.role === UserRoleType.PRESIDENT && isBootstrapUserEmail(u.email)
  );
  const ownerSetupCompleted = Boolean(company.ownerSetupCompletedAt) || Boolean(customPresident);
  const needsOwnerSetup = !ownerSetupCompleted;

  const bootstrapUsersAvailable = users.some((u) => isBootstrapUserEmail(u.email));
  const signInAvailable = Boolean(customPresident || bootstrapPresident);
  const presidentLoginHint =
    customPresident?.email ?? (bootstrapPresident ? bootstrapPresident.email : null);

  return {
    needsOwnerSetup,
    ownerSetupCompleted,
    bootstrapUsersAvailable,
    presidentEmail: customPresident?.email ?? null,
    signInAvailable,
    presidentLoginHint,
    options: {
      availableNow: [
        {
          id: 'owner_wizard',
          label: 'First-run owner setup (recommended)',
          description: 'Choose your email and password, or let BOG generate a secure password.',
        },
        ...(bootstrapUsersAvailable
          ? [
              {
                id: 'bootstrap_login',
                label: 'Bootstrap dev login',
                description: `Sign in with admin@company.com / demo123 (local dev only). Then create your President user under Users.`,
              },
            ]
          : []),
        {
          id: 'users_api',
          label: 'Users page (after any President login)',
          description: 'Settings → Users — add staff with email + password (8+ characters).',
        },
      ],
      availableLater: [
        {
          id: 'invite_email',
          label: 'Email invitations',
          description: 'Send invite links with MFA setup — planned.',
        },
        {
          id: 'sso',
          label: 'SSO / Google Workspace',
          description: 'Enterprise single sign-on — planned.',
        },
        {
          id: 'password_reset',
          label: 'Self-service password reset',
          description: 'Forgot-password flow with email — planned.',
        },
      ],
    },
  };
}

export async function completeOwnerSetup(input: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  generatePassword?: boolean;
  companyName?: string;
  deactivateBootstrapUsers?: boolean;
}): Promise<{
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
    companyName: string;
    mfaEnabled: boolean;
  };
  generatedPassword?: string;
}> {
  if (!input.companyName?.trim()) {
    throw new Error('Business name is required');
  }

  const status = await getOwnerSetupStatus();
  if (!status.needsOwnerSetup) {
    throw new Error('Owner setup is already complete — sign in or add members under Users');
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('Valid email is required');
  }
  if (isBootstrapUserEmail(email)) {
    throw new Error('Use your personal email — bootstrap addresses are reserved for dev');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already in use');
  }

  let plainPassword = input.password?.trim() ?? '';
  let generatedPassword: string | undefined;
  if (input.generatePassword) {
    generatedPassword = generateSecurePassword();
    plainPassword = generatedPassword;
  }
  if (plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters (or choose generate password)');
  }

  const companyName = input.companyName!.trim();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.$transaction(async (tx) => {
    const company = await getOrCreateDefaultCompany();
    await tx.company.update({
      where: { id: company.id },
      data: {
        name: companyName,
        legalName: company.legalName || companyName,
        email,
        ownerSetupCompletedAt: new Date(),
      },
    });
    const companyId = company.id;

    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: UserRoleType.PRESIDENT,
        companyId,
        isActive: true,
        mfaEnabled: false,
        canViewPortfolio: true,
      },
      include: { company: { select: { name: true } } },
    });

    if (input.deactivateBootstrapUsers !== false) {
      await tx.user.updateMany({
        where: {
          companyId,
          email: { in: [...BOOTSTRAP_USER_EMAILS] },
        },
        data: { isActive: false },
      });
    }

    return created;
  });

  await ensureDefaultPortfolioBooks(user.companyId);

  const token = issueAuthToken({
    id: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? companyName,
      mfaEnabled: user.mfaEnabled,
    },
    generatedPassword,
  };
}
