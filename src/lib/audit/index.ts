import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import logger from "@/lib/logging/logger";

export async function logAudit(params: {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  adminId?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as unknown as Prisma.InputJsonValue ?? undefined,
        adminId: params.adminId,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    logger.error({ error, auditAction: params.action }, "Failed to write audit log");
  }
}
