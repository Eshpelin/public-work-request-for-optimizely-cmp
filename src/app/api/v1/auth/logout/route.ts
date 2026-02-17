import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/security/auth";
import { formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const token = request.cookies.get("auth_token")?.value;

    if (token) {
      revokeToken(token);
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    logger.info({ requestId }, "User logged out");

    return response;
  } catch (error) {
    logger.error({ requestId, error }, "Unexpected error during logout");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
