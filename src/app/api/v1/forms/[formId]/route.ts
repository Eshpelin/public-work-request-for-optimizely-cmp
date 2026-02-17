import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { validateCsrf } from "@/lib/security/csrf";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";
import { logAudit } from "@/lib/audit";

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

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

    const urlPage = Math.max(1, parseInt(request.nextUrl.searchParams.get("urlPage") ?? "1", 10) || 1);
    const urlPageSize = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("urlPageSize") ?? "20", 10) || 20));

    const form = await prisma.publicForm.findUnique({
      where: { id: formId },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!form) {
      throw new AppError("Form not found", 404, ErrorCode.NOT_FOUND, requestId);
    }

    const [formUrls, totalUrls] = await Promise.all([
      prisma.formUrl.findMany({
        where: { formId },
        orderBy: { createdAt: "desc" },
        skip: (urlPage - 1) * urlPageSize,
        take: urlPageSize,
      }),
      prisma.formUrl.count({ where: { formId } }),
    ]);

    const totalUrlPages = Math.ceil(totalUrls / urlPageSize);

    logger.info({ requestId, userId: user.sub, formId }, "Fetched form details");

    return NextResponse.json({
      form: { ...form, formUrls },
      urlPagination: { page: urlPage, pageSize: urlPageSize, total: totalUrls, totalPages: totalUrlPages },
    });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to fetch form");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error fetching form");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    if (!validateCsrf(request)) {
      return NextResponse.json(
        formatErrorResponse(new AppError("CSRF validation failed", 403, ErrorCode.UNAUTHORIZED, requestId), requestId),
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("Authentication required", 401, ErrorCode.UNAUTHORIZED, requestId);
    }

    const { formId } = await params;

    const existing = await prisma.publicForm.findUnique({
      where: { id: formId },
    });

    if (!existing) {
      throw new AppError("Form not found", 404, ErrorCode.NOT_FOUND, requestId);
    }

    const body = await request.json();
    const parsed = updateFormSchema.parse(body);

    const updatedForm = await prisma.publicForm.update({
      where: { id: formId },
      data: {
        ...(parsed.title !== undefined && { title: parsed.title }),
        ...(parsed.description !== undefined && { description: parsed.description }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
    });

    logger.info({ requestId, userId: user.sub, formId }, "Updated form");

    logAudit({
      action: "form.update",
      entity: "PublicForm",
      entityId: formId,
      details: parsed,
      adminId: user.sub,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    });

    return NextResponse.json({ form: updatedForm });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      logger.warn({ requestId, error: appError.message }, "Form update validation failed");
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to update form");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error updating form");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    if (!validateCsrf(request)) {
      return NextResponse.json(
        formatErrorResponse(new AppError("CSRF validation failed", 403, ErrorCode.UNAUTHORIZED, requestId), requestId),
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("Authentication required", 401, ErrorCode.UNAUTHORIZED, requestId);
    }

    const { formId } = await params;

    const existing = await prisma.publicForm.findUnique({
      where: { id: formId },
    });

    if (!existing) {
      throw new AppError("Form not found", 404, ErrorCode.NOT_FOUND, requestId);
    }

    await prisma.publicForm.delete({
      where: { id: formId },
    });

    logger.info({ requestId, userId: user.sub, formId }, "Deleted form");

    logAudit({
      action: "form.delete",
      entity: "PublicForm",
      entityId: formId,
      details: { title: existing.title },
      adminId: user.sub,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to delete form");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error deleting form");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
