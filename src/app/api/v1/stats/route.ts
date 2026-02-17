import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("Authentication required", 401, ErrorCode.UNAUTHORIZED, requestId);
    }

    const [totalForms, totalSubmissions, failedSubmissions] = await Promise.all([
      prisma.publicForm.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: "FAILED" } }),
    ]);

    return NextResponse.json({ totalForms, totalSubmissions, failedSubmissions });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
