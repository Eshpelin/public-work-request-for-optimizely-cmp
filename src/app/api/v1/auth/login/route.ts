import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, createToken } from "@/lib/security/auth";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

const loginSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const user = await prisma.adminUser.findUnique({
      where: { email: parsed.email },
    });

    if (!user || !user.isActive) {
      throw new AppError(
        "Invalid credentials",
        401,
        ErrorCode.UNAUTHORIZED,
        requestId
      );
    }

    const passwordValid = await verifyPassword(parsed.password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(
        "Invalid credentials",
        401,
        ErrorCode.UNAUTHORIZED,
        requestId
      );
    }

    const token = createToken(user.id, user.email);

    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    logger.info({ requestId, userId: user.id }, "Admin user logged in");

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      logger.warn({ requestId, error: appError.message }, "Login validation failed");
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Login failed");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error during login");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
