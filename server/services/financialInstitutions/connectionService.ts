import type {
  FinancialConnectionProvider,
  FinancialConnectionStatus,
  FinancialInstitutionType,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { importBankFeedCsv } from '../bankFeedImport';
import { getFinancialProviderCatalog, providerSupportsType } from './registry';

type ConnectInput = {
  companyId: string;
  provider: FinancialConnectionProvider;
  institutionType: FinancialInstitutionType;
  displayName: string;
  institutionName?: string;
  accountMask?: string;
};

function maskSuffix(mask?: string): string | undefined {
  if (!mask?.trim()) return undefined;
  const digits = mask.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return mask.trim();
}

function resolveInitialStatus(provider: FinancialConnectionProvider): {
  status: FinancialConnectionStatus;
  lastError?: string;
} {
  const catalog = getFinancialProviderCatalog().find((p) => p.provider === provider);
  if (!catalog) return { status: 'ERROR', lastError: 'Unknown provider' };
  if (provider === 'MANUAL_CSV') return { status: 'CONNECTED' };
  if (provider === 'SANDBOX' && catalog.liveReady) return { status: 'CONNECTED' };
  if (catalog.liveReady) return { status: 'CONNECTED' };
  return {
    status: 'PENDING',
    lastError: `Live credentials not configured — set ${catalog.envKeys.join(', ')} or use Sandbox in development.`,
  };
}

export async function listConnections(companyId: string) {
  const rows = await prisma.financialInstitutionConnection.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    include: {
      bankFeedAccount: {
        select: { id: true, name: true, _count: { select: { transactions: true } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    institutionName: r.institutionName,
    institutionType: r.institutionType,
    provider: r.provider,
    status: r.status,
    accountMask: r.accountMask,
    lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
    lastError: r.lastError,
    bankFeedAccountId: r.bankFeedAccount?.id ?? null,
    transactionCount: r.bankFeedAccount?._count.transactions ?? 0,
  }));
}

export async function connectInstitution(input: ConnectInput) {
  if (!providerSupportsType(input.provider, input.institutionType)) {
    throw new Error('Provider does not support this institution type');
  }

  const { status, lastError } = resolveInitialStatus(input.provider);
  const mask = maskSuffix(input.accountMask);

  const connection = await prisma.financialInstitutionConnection.create({
    data: {
      companyId: input.companyId,
      provider: input.provider,
      institutionType: input.institutionType,
      displayName: input.displayName.trim(),
      institutionName: input.institutionName?.trim() || null,
      accountMask: mask ?? null,
      status,
      lastError: lastError ?? null,
      metadataJson: {
        preparedAt: new Date().toISOString(),
        mode: status === 'CONNECTED' ? 'active' : 'awaiting_credentials',
      },
    },
  });

  let bankFeedAccountId: string | undefined;
  if (status === 'CONNECTED') {
    const account = await prisma.bankFeedAccount.create({
      data: {
        companyId: input.companyId,
        name: input.displayName.trim(),
        institution: input.institutionName?.trim() || input.provider,
        accountMask: mask ?? null,
        connectionId: connection.id,
      },
    });
    bankFeedAccountId = account.id;
  }

  return { connection, bankFeedAccountId, status };
}

export async function disconnectInstitution(companyId: string, connectionId: string) {
  const row = await prisma.financialInstitutionConnection.findFirst({
    where: { id: connectionId, companyId },
  });
  if (!row) throw new Error('Connection not found');

  await prisma.financialInstitutionConnection.update({
    where: { id: connectionId },
    data: { status: 'DISCONNECTED', lastError: null },
  });

  await prisma.bankFeedAccount.updateMany({
    where: { companyId, connectionId },
    data: { isActive: false },
  });
}

export async function syncInstitutionConnection(companyId: string, connectionId: string) {
  const connection = await prisma.financialInstitutionConnection.findFirst({
    where: { id: connectionId, companyId },
    include: { bankFeedAccount: true },
  });
  if (!connection) throw new Error('Connection not found');
  if (connection.status !== 'CONNECTED') {
    throw new Error(connection.lastError ?? 'Connection is not active');
  }

  let account = connection.bankFeedAccount;
  if (!account) {
    account = await prisma.bankFeedAccount.create({
      data: {
        companyId,
        name: connection.displayName,
        institution: connection.institutionName ?? connection.provider,
        accountMask: connection.accountMask,
        connectionId: connection.id,
      },
    });
  }

  if (connection.provider === 'SANDBOX' || connection.provider === 'PLAID' || connection.provider === 'MX' || connection.provider === 'PAYPAL') {
    const today = new Date();
    const rows = [
      { date: new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10), amount: -124.5, memo: 'ACH vendor payment' },
      { date: new Date(today.getTime() - 5 * 86400000).toISOString().slice(0, 10), amount: 4820.0, memo: 'Customer deposit' },
      { date: new Date(today.getTime() - 8 * 86400000).toISOString().slice(0, 10), amount: -89.99, memo: 'Card purchase — office supplies' },
      { date: new Date(today.getTime() - 12 * 86400000).toISOString().slice(0, 10), amount: -2100.0, memo: 'Payroll transfer' },
      { date: new Date(today.getTime() - 15 * 86400000).toISOString().slice(0, 10), amount: 315.25, memo: 'Interest / cashback' },
    ];

    const result = await importBankFeedCsv({
      companyId,
      accountName: account.name,
      accountMask: account.accountMask ?? undefined,
      institution: connection.institutionName ?? connection.provider,
      rows,
      dryRun: false,
      externalIdPrefix: `sync:${connection.id}:`,
    });

    await prisma.financialInstitutionConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });

    return { imported: result.imported, skipped: result.skipped, accountId: result.accountId };
  }

  throw new Error('Sync not implemented for this provider — use CSV import');
}
