import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, createToken } from "@/lib/security/auth";
import { generateCsrfToken, setCsrfCookie } from "@/lib/security/csrf";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";
import { logAudit } from "@/lib/audit";

const registerSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);

    // Only allow registration if no admin exists yet.
    const existingAdmin = await prisma.adminUser.findFirst();
    if (existingAdmin) {
      throw new AppError(
        "Registration is closed",
        403,
        ErrorCode.FORBIDDEN,
        requestId
      );
    }

    const passwordHash = await hashPassword(parsed.password);

    const user = await prisma.adminUser.create({
      data: {
        email: parsed.email,
        passwordHash,
        name: parsed.name,
      },
    });

    const token = createToken(user.id, user.email);

    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    const csrfToken = generateCsrfToken();
    setCsrfCookie(response, csrfToken);

    logger.info({ requestId, userId: user.id }, "Admin user registered");

    logAudit({
      action: "admin.register",
      entity: "AdminUser",
      entityId: user.id,
      details: { email: user.email },
      adminId: user.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      logger.warn({ requestId, error: appError.message }, "Validation failed");
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Registration rejected");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error during registration");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
