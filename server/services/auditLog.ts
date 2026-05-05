import { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function writeAuditLog(input: {
  companyId: string;
  userId?: string | null;
  action: AuditAction;
  module: string;
  resourceId?: string | null;
  resourceType?: string | null;
  changes?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId ?? undefined,
        action: input.action,
        module: input.module,
        resourceId: input.resourceId ?? undefined,
        resourceType: input.resourceType ?? undefined,
        changes: input.changes === undefined ? undefined : (input.changes as object),
        success: true,
      },
    });
  } catch (e) {
    console.error('auditLog write failed', e);
  }
}
