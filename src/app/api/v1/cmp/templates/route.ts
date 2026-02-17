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
    const templates = await client.getTemplates();

    logger.info({ requestId, userId: user.sub, templateCount: templates.length }, "Fetched CMP templates");

    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn({ requestId, error: error.message }, "Failed to fetch templates");
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, "Unexpected error fetching templates");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
