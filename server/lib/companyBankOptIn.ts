import type { Company } from '@prisma/client';

/** Use when building bank-feed / import features to respect company opt-in. */
export function companyOptedInToBankFeeds(c: Pick<Company, 'useBankFeeds'>): boolean {
  return c.useBankFeeds === true;
}

/** Use when building outbound payment-rail features to respect company opt-in. */
export function companyOptedInToBankPayments(c: Pick<Company, 'useBankOutboundPayments'>): boolean {
  return c.useBankOutboundPayments === true;
}
