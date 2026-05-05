import { prisma } from './prisma';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';

/** Company chose traditional manual operations; AI-assisted features (CPA + ERP Assistant + automated review) must not run. */
export async function isManualOperationsModeActive(): Promise<boolean> {
  const company = await getOrCreateDefaultCompany();
  const row = await prisma.company.findUnique({
    where: { id: company.id },
    select: { manualOperationsMode: true },
  });
  return Boolean(row?.manualOperationsMode);
}
