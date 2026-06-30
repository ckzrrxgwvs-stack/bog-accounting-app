import { prisma } from '../../lib/prisma';

export type BrandKit = {
  companyId: string;
  companyName: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  logoUrl: string;
  tagline: string;
  preparerLine: string;
};

const DEFAULT_LOGO = '/favicon.svg';
const TAGLINE = 'Books On The Go · Precision in every ledger';

export async function resolveBrandKit(companyId: string): Promise<BrandKit> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      legalName: true,
      email: true,
      phone: true,
      address: true,
      taxId: true,
      logo: true,
    },
  });

  const logoUrl =
    company.logo?.trim() && (company.logo.startsWith('http') || company.logo.startsWith('/'))
      ? company.logo.trim()
      : DEFAULT_LOGO;

  return {
    companyId: company.id,
    companyName: company.name,
    legalName: company.legalName || company.name,
    email: company.email ?? '',
    phone: company.phone ?? '',
    address: company.address ?? '',
    taxId: company.taxId ?? '',
    logoUrl,
    tagline: TAGLINE,
    preparerLine: `${company.legalName || company.name} · BOG Accounting Program`,
  };
}
