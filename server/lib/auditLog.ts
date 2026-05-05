import { AuditAction } from '@prisma/client';
import { prisma } from './prisma';

export async function writeAuditLog(params: {
  companyId: string;
  userId?: string | null;
  action: AuditAction;
  module: string;
  resourceId?: string | null;
  resourceType?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId ?? undefined,
        action: params.action,
        module: params.module,
        resourceId: params.resourceId ?? undefined,
        resourceType: params.resourceType ?? undefined,
        changes: params.changes === undefined ? undefined : (params.changes as object),
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined,
        success: params.success ?? true,
        errorMessage: params.errorMessage ?? undefined,
      },
    });
  } catch (e) {
    console.warn('auditLog write failed', e);
  }
}
