import type { Company } from '@prisma/client';

/** Gate future payroll / withholding / W-2–related filing helpers. */
export function companyOptedInToUsPayrollTaxReporting(
  c: Pick<Company, 'useUsPayrollTaxReporting'>
): boolean {
  return c.useUsPayrollTaxReporting === true;
}

/** Gate future 1099 and information-return export / transmit paths. */
export function companyOptedInToUsInformationReturns(
  c: Pick<Company, 'useUsInformationReturns'>
): boolean {
  return c.useUsInformationReturns === true;
}
