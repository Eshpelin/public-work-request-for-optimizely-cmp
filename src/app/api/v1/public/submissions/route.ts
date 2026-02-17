import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { RateLimiter } from "@/lib/security/rate-limiter";
import { decrypt } from "@/lib/security/encryption";
import { CmpTokenManager } from "@/lib/cmp-client/auth";
import { CmpClient } from "@/lib/cmp-client";
import { validateAllFields } from "@/lib/form-engine/validators";
import { serializeFormData } from "@/lib/form-engine/serializers";
import { formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";
import { logAudit } from "@/lib/audit";
import type { CmpFormField } from "@/types";

/** Rate limit public submissions to 5 requests per minute per IP. */
const rateLimiter = new RateLimiter(5, 60000);

/** Backoff intervals in milliseconds for retry scheduling. */
const RETRY_BACKOFF_MS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  4 * 60 * 60 * 1000,
];

interface FileEntry {
  fieldIdentifier: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}

/**
 * Creates a CmpClient from a specific credential record.
 */
function createCmpClientFromCredential(credential: {
  clientIdEncrypted: string;
  clientSecretEncrypted: string;
}): CmpClient {
  const clientId = decrypt(credential.clientIdEncrypted);
  const clientSecret = decrypt(credential.clientSecretEncrypted);
  const tokenManager = new CmpTokenManager(clientId, clientSecret);
  return new CmpClient(tokenManager);
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

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

    // Parse multipart/form-data from the request.
    const formData = await request.formData();

    const tokenValue = formData.get("token");
    if (typeof tokenValue !== "string" || !tokenValue) {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    const formDataValue = formData.get("formData");
    if (typeof formDataValue !== "string") {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    let parsedFormData: Record<string, unknown>;
    try {
      parsedFormData = JSON.parse(formDataValue);
    } catch {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    // Collect file fields (those prefixed with "file_").
    const files: FileEntry[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        files.push({
          fieldIdentifier: key.replace("file_", ""),
          fileName: value.name,
          buffer: Buffer.from(arrayBuffer),
          contentType: value.type || "application/octet-stream",
        });
      }
    }

    // Validate the token by looking up the FormUrl and its associated form.
    const formUrl = await prisma.formUrl.findUnique({
      where: { token: tokenValue },
      include: {
        form: {
          include: { credential: true },
        },
      },
    });

    if (!formUrl) {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    if (!formUrl.form.isActive) {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    if (formUrl.form.accessType === "ONE_TIME_URL" && formUrl.isUsed) {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    if (formUrl.expiresAt && new Date() > formUrl.expiresAt) {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    // For one-time URLs, atomically mark as used.
    if (formUrl.form.accessType === "ONE_TIME_URL") {
      const result = await prisma.formUrl.updateMany({
        where: { id: formUrl.id, isUsed: false },
        data: { isUsed: true, usedAt: new Date() },
      });

      if (result.count !== 1) {
        return NextResponse.json(
          { error: "Invalid submission." },
          { status: 400 }
        );
      }
    }

    // Parse the form fields snapshot and validate submitted data.
    const fields = formUrl.form.formFieldsSnapshot as unknown as CmpFormField[];

    // Treat all fields as visible for server-side validation.
    const allFieldIdentifiers = new Set(fields.map((f) => f.identifier));
    const validationErrors = validateAllFields(
      fields,
      parsedFormData,
      allFieldIdentifiers
    );

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { error: "Invalid submission.", details: validationErrors },
        { status: 400 }
      );
    }

    // Save the submission to the database with PENDING status.
    const submission = await prisma.submission.create({
      data: {
        formId: formUrl.form.id,
        urlId: formUrl.id,
        formData: parsedFormData as unknown as Prisma.InputJsonValue,
        status: "PENDING",
        retryCount: 0,
      },
    });

    // Submit to CMP synchronously so the user sees any errors.
    try {
      const credential = formUrl.form.credential;
      if (!credential || !credential.isActive) {
        throw new Error("No active CMP credentials available for this form.");
      }

      const client = createCmpClientFromCredential(credential);

      const serializedFields = serializeFormData(
        fields,
        parsedFormData,
        allFieldIdentifiers
      );

      const workRequest = await client.createWorkRequest(
        formUrl.form.cmpTemplateId,
        serializedFields,
      );

      for (const file of files) {
        await client.uploadAttachment(
          workRequest.id,
          file.fileName,
          file.buffer,
          file.contentType
        );
      }

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          cmpWorkRequestId: workRequest.id,
          completedAt: new Date(),
        },
      });

      logger.info(
        { submissionId: submission.id, workRequestId: workRequest.id },
        "CMP work request created successfully."
      );
    } catch (cmpError) {
      const errorMessage =
        cmpError instanceof Error ? cmpError.message : "Unknown error";

      logger.error(
        { submissionId: submission.id, error: errorMessage },
        "Failed to create CMP work request."
      );

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "FAILED",
          errorMessage,
          nextRetryAt: new Date(Date.now() + RETRY_BACKOFF_MS[0]),
        },
      });

      return NextResponse.json(
        { error: { message: "Failed to submit to CMP. Please try again later." } },
        { status: 502 }
      );
    }

    logAudit({
      action: "submission.create",
      entity: "Submission",
      entityId: submission.id,
      details: { formId: formUrl.form.id, urlId: formUrl.id },
      ipAddress: ip !== "unknown" ? ip : undefined,
    });

    return NextResponse.json(
      {
        submissionId: submission.id,
        message: "Submission received",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, "Unexpected error in submission handler.");
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
