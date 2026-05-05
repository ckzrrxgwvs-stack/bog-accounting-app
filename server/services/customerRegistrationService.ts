import { CustomerRegistrationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  generateRegistrationCode,
  formatRegistrationDisplay,
  isValidNormalizedRegistrationCode,
  normalizeRegistrationInput,
} from '../lib/registrationCode';
import { seedChartOfAccountsTx } from './companyBootstrap';

export async function issueRegistrationCode(params: {
  customerName?: string | null;
  contactEmail?: string | null;
  internalNotes?: string | null;
  expiresAt?: Date | null;
}): Promise<{ id: string; displayCode: string }> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const { normalized, display } = generateRegistrationCode();
    try {
      const row = await prisma.customerRegistration.create({
        data: {
          codeNormalized: normalized,
          customerName: params.customerName ?? undefined,
          contactEmail: params.contactEmail?.trim().toLowerCase() ?? undefined,
          internalNotes: params.internalNotes ?? undefined,
          expiresAt: params.expiresAt ?? undefined,
          status: CustomerRegistrationStatus.ISSUED,
        },
      });
      return { id: row.id, displayCode: display };
    } catch (e: unknown) {
      const dup = e && typeof e === 'object' && 'code' in e && e.code === 'P2002';
      if (!dup) throw e;
    }
  }
  throw new Error('Could not generate a unique registration code');
}

export async function activateRegistration(params: {
  codeRaw: string;
  organizationName?: string | null;
}): Promise<{
  displayCode: string;
  companyId: string;
  companyName: string;
  alreadyActivated: boolean;
}> {
  const normalized = normalizeRegistrationInput(params.codeRaw);
  if (!isValidNormalizedRegistrationCode(normalized)) {
    throw new Error('Invalid registration code format');
  }

  const existing = await prisma.customerRegistration.findUnique({
    where: { codeNormalized: normalized },
  });

  if (!existing) {
    throw new Error('Registration code not found');
  }

  if (existing.status === CustomerRegistrationStatus.REVOKED) {
    throw new Error('This registration code has been revoked');
  }

  if (existing.expiresAt && existing.expiresAt < new Date()) {
    throw new Error('This registration code has expired');
  }

  if (existing.status === CustomerRegistrationStatus.ACTIVATED && existing.companyId) {
    const co = await prisma.company.findUnique({
      where: { id: existing.companyId },
      select: { id: true, name: true },
    });
    if (!co) {
      throw new Error('Activation record is inconsistent — contact support');
    }
    return {
      displayCode: formatRegistrationDisplay(normalized),
      companyId: co.id,
      companyName: co.name,
      alreadyActivated: true,
    };
  }

  const companyName =
    (params.organizationName?.trim() ||
      existing.customerName?.trim() ||
      'New organization') ?? 'New organization';

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        legalName: companyName,
        country: 'US',
        currency: 'USD',
        fiscalYearStart: 1,
        email: existing.contactEmail ?? undefined,
        useInventory: false,
        usePayroll: false,
        useMultiCurrency: false,
        useCostCenters: false,
      },
    });

    await seedChartOfAccountsTx(tx, company.id);

    await tx.customerRegistration.update({
      where: { id: existing.id },
      data: {
        status: CustomerRegistrationStatus.ACTIVATED,
        activatedAt: new Date(),
        companyId: company.id,
      },
    });

    return company;
  });

  return {
    displayCode: formatRegistrationDisplay(normalized),
    companyId: result.id,
    companyName: result.name,
    alreadyActivated: false,
  };
}

export async function revokeRegistration(id: string): Promise<void> {
  await prisma.customerRegistration.update({
    where: { id },
    data: {
      status: CustomerRegistrationStatus.REVOKED,
      revokedAt: new Date(),
    },
  });
}
