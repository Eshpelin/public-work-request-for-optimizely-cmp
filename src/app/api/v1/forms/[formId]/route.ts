import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

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

    const form = await prisma.publicForm.findUnique({
      where: { id: formId },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        formUrls: {
          orderBy: { createdAt: "desc" },
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

    logger.info({ requestId, userId: user.sub, formId }, "Fetched form details");

    return NextResponse.json({ form });
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
