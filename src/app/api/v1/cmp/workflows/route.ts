import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security/auth";
import { getCmpClient } from "@/lib/cmp-client/helpers";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("Authentication required", 401, ErrorCode.UNAUTHORIZED, requestId);
    }

    const client = await getCmpClient();
    const workflows = await client.getWorkflows();

    logger.info({ requestId, userId: user.sub }, "Fetched CMP workflows");

    return NextResponse.json({ workflows });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to fetch workflows");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Unexpected error fetching workflows");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
