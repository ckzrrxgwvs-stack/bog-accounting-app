/** Shared bootstrap demo users — not for production President identity. */
export const BOOTSTRAP_USER_EMAILS = [
  'admin@company.com',
  'cfo@company.com',
  'accountant@company.com',
  'controller@company.com',
] as const;

export function isBootstrapUserEmail(email: string): boolean {
  return BOOTSTRAP_USER_EMAILS.includes(email.toLowerCase() as (typeof BOOTSTRAP_USER_EMAILS)[number]);
}

export function bootstrapUsersEnabled(): boolean {
  return process.env.BOG_BOOTSTRAP_USERS === '1';
}
