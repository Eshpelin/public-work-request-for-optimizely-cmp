import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("Authentication required", 401, ErrorCode.UNAUTHORIZED, requestId);
    }

    const { formId } = await params;

    const form = await prisma.publicForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new AppError("Form not found", 404, ErrorCode.NOT_FOUND, requestId);
    }

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("pageSize") ?? "20", 10) || 20));

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { formId },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          cmpWorkRequestId: true,
          submittedAt: true,
          errorMessage: true,
          retryCount: true,
        },
      }),
      prisma.submission.count({ where: { formId } }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    logger.info(
      { requestId, userId: user.sub, formId },
      "Fetched form submissions"
    );

    return NextResponse.json({
      submissions,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to fetch submissions");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error fetching submissions");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
