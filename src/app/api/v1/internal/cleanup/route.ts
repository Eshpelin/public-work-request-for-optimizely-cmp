import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import logger from "@/lib/logging/logger";

export async function POST() {
  const now = new Date();

  // Delete expired FormUrls older than 30 days.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const expiredUrlsResult = await prisma.formUrl.deleteMany({
    where: {
      expiresAt: { lt: thirtyDaysAgo },
    },
  });

  // Delete AuditLogs older than 90 days.
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oldAuditLogsResult = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
    },
  });

  logger.info(
    {
      expiredUrls: expiredUrlsResult.count,
      oldAuditLogs: oldAuditLogsResult.count,
    },
    "Cleanup completed."
  );

  return NextResponse.json({
    expiredUrls: expiredUrlsResult.count,
    oldAuditLogs: oldAuditLogsResult.count,
  });
}
