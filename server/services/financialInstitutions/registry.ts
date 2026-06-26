import type { FinancialConnectionProvider, FinancialInstitutionType } from '@prisma/client';

export type ProviderCatalogEntry = {
  provider: FinancialConnectionProvider;
  label: string;
  institutionTypes: FinancialInstitutionType[];
  description: string;
  liveReady: boolean;
  envKeys: string[];
  docsUrl?: string;
};

function envReady(keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

export function getFinancialProviderCatalog(): ProviderCatalogEntry[] {
  const plaidKeys = ['PLAID_CLIENT_ID', 'PLAID_SECRET'];
  const mxKeys = ['MX_CLIENT_ID', 'MX_API_KEY'];
  const paypalKeys = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'];
  const sandbox = process.env.BOG_FINANCIAL_SANDBOX === '1' || process.env.NODE_ENV === 'development';

  return [
    {
      provider: 'PLAID',
      label: 'Plaid (banks & credit cards)',
      institutionTypes: ['BANK', 'CREDIT_CARD'],
      description: 'Link checking, savings, and card accounts for daily transaction sync.',
      liveReady: envReady(plaidKeys),
      envKeys: plaidKeys,
      docsUrl: 'https://plaid.com/docs/',
    },
    {
      provider: 'MX',
      label: 'MX (bank aggregation)',
      institutionTypes: ['BANK'],
      description: 'Enterprise bank connectivity for statement lines and balances.',
      liveReady: envReady(mxKeys),
      envKeys: mxKeys,
      docsUrl: 'https://docs.mx.com/',
    },
    {
      provider: 'PAYPAL',
      label: 'PayPal',
      institutionTypes: ['PAYPAL'],
      description: 'Import PayPal balance activity and settlement batches.',
      liveReady: envReady(paypalKeys),
      envKeys: paypalKeys,
      docsUrl: 'https://developer.paypal.com/docs/',
    },
    {
      provider: 'MANUAL_CSV',
      label: 'CSV / OFX file import',
      institutionTypes: ['BANK', 'CREDIT_CARD', 'PAYPAL'],
      description: 'Upload exports from any institution when electronic linking is not available.',
      liveReady: true,
      envKeys: [],
    },
    {
      provider: 'SANDBOX',
      label: 'Sandbox (testing)',
      institutionTypes: ['BANK', 'CREDIT_CARD', 'PAYPAL'],
      description: 'Simulated institution for demos and UAT — no live credentials.',
      liveReady: sandbox,
      envKeys: ['BOG_FINANCIAL_SANDBOX'],
    },
  ];
}

export function providerSupportsType(
  provider: FinancialConnectionProvider,
  institutionType: FinancialInstitutionType
): boolean {
  const entry = getFinancialProviderCatalog().find((p) => p.provider === provider);
  return Boolean(entry?.institutionTypes.includes(institutionType));
}
