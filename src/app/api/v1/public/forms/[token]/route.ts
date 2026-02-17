import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { RateLimiter } from "@/lib/security/rate-limiter";
import { formatErrorResponse } from "@/lib/errors";
import type { PublicFormConfig } from "@/types";
import type { FormFieldSnapshot } from "@/types";

const rateLimiter = new RateLimiter(30, 60000);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const rateLimitResult = rateLimiter.check(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) },
        }
      );
    }

    const { token } = await params;

    const formUrl = await prisma.formUrl.findUnique({
      where: { token },
      include: { form: true },
    });

    const notAvailableResponse = NextResponse.json(
      { error: "This form is not available." },
      { status: 404 }
    );

    if (!formUrl) {
      return notAvailableResponse;
    }

    if (!formUrl.form.isActive) {
      return notAvailableResponse;
    }

    if (formUrl.form.accessType === "ONE_TIME_URL" && formUrl.isUsed) {
      return notAvailableResponse;
    }

    if (formUrl.expiresAt && new Date() > formUrl.expiresAt) {
      return notAvailableResponse;
    }

    const honeypotFieldName = `hp_${crypto.randomBytes(4).toString("hex")}`;

    const config: PublicFormConfig = {
      id: formUrl.form.id,
      title: formUrl.form.title,
      description: formUrl.form.description ?? undefined,
      templateName: formUrl.form.cmpTemplateName,
      fields: formUrl.form.formFieldsSnapshot as unknown as FormFieldSnapshot[],
      honeypotFieldName,
    };

    return NextResponse.json(config);
  } catch (error) {
    const status = error instanceof Error && "statusCode" in error
      ? (error as { statusCode: number }).statusCode
      : 500;
    return NextResponse.json(formatErrorResponse(error), { status });
  }
}
