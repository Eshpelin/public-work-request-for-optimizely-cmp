import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { getCmpClient } from "@/lib/cmp-client/helpers";
import { generateToken } from "@/lib/security/tokens";
import { validateCsrf } from "@/lib/security/csrf";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";
import { logAudit } from "@/lib/audit";

const createFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cmpTemplateId: z.string().min(1, "CMP template ID is required"),
  accessType: z.enum(["OPEN_URL", "ONE_TIME_URL"]),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("Authentication required", 401, ErrorCode.UNAUTHORIZED, requestId);
    }

    const forms = await prisma.publicForm.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: {
            formUrls: true,
            submissions: true,
          },
        },
      },
    });

    logger.info({ requestId, userId: user.sub }, "Fetched all forms");

    return NextResponse.json({ forms });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to fetch forms");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error fetching forms");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = createFormSchema.parse(body);

    // Fetch template details from CMP to get form fields and name.
    const client = await getCmpClient();
    const template = await client.getTemplate(parsed.cmpTemplateId);

    // Get the active credential ID to link the form to the credential used.
    const credential = await prisma.cmpCredential.findFirst({
      where: { isActive: true },
    });
    if (!credential) {
      throw new AppError(
        "No active CMP credentials found",
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
    }

    // Create the form record.
    const form = await prisma.publicForm.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        cmpTemplateId: parsed.cmpTemplateId,
        cmpTemplateName: template.title,
        formFieldsSnapshot: template.form_fields as unknown as Prisma.InputJsonValue,
        accessType: parsed.accessType,
        createdById: user.sub,
        credentialId: credential.id,
      },
    });

    // For OPEN_URL forms, create a single permanent URL automatically.
    let formUrls: Array<{ id: string; token: string; url: string; expiresAt: string | null }> = [];
    if (parsed.accessType === "OPEN_URL") {
      const token = generateToken();
      const formUrl = await prisma.formUrl.create({
        data: {
          token,
          formId: form.id,
        },
      });
      formUrls.push({
        id: formUrl.id,
        token: formUrl.token,
        url: `${process.env.APP_URL}/f/${formUrl.token}`,
        expiresAt: null,
      });
    }

    logger.info(
      { requestId, userId: user.sub, formId: form.id },
      "Created new public form"
    );

    logAudit({
      action: "form.create",
      entity: "PublicForm",
      entityId: form.id,
      details: { title: form.title, accessType: form.accessType },
      adminId: user.sub,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    });

    return NextResponse.json(
      {
        form: {
          ...form,
          urls: formUrls,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      logger.warn({ requestId, error: appError.message }, "Form creation validation failed");
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to create form");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error creating form");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
