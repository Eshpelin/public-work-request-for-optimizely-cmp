import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { generateToken } from "@/lib/security/tokens";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

const createUrlsSchema = z.object({
  count: z.number().int().min(1).max(500).default(1),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(
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

    const body = await request.json();
    const parsed = createUrlsSchema.parse(body);

    // OPEN_URL forms should only have a single URL.
    if (form.accessType === "OPEN_URL" && parsed.count !== 1) {
      throw new AppError(
        "OPEN_URL forms can only have one URL",
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
    }

    // Generate the URL records with unique tokens.
    const urlRecords = Array.from({ length: parsed.count }, () => ({
      token: generateToken(),
      formId,
      expiresAt:
        form.accessType === "ONE_TIME_URL" && parsed.expiresAt
          ? new Date(parsed.expiresAt)
          : undefined,
    }));

    await prisma.formUrl.createMany({
      data: urlRecords,
    });

    // Fetch the created records to return them with their IDs.
    const tokens = urlRecords.map((r) => r.token);
    const createdUrls = await prisma.formUrl.findMany({
      where: { token: { in: tokens } },
    });

    const urls = createdUrls.map((u) => ({
      id: u.id,
      token: u.token,
      url: `${process.env.APP_URL}/f/${u.token}`,
      expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
    }));

    logger.info(
      { requestId, userId: user.sub, formId, count: parsed.count },
      "Generated form URLs"
    );

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      logger.warn({ requestId, error: appError.message }, "URL creation validation failed");
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to create URLs");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error creating URLs");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
