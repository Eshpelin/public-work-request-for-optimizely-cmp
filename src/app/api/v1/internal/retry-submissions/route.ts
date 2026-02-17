import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";
import { CmpTokenManager } from "@/lib/cmp-client/auth";
import { CmpClient } from "@/lib/cmp-client";
import { serializeFormData } from "@/lib/form-engine/serializers";
import logger from "@/lib/logging/logger";
import type { CmpFormField } from "@/types";

/** Maximum number of retry attempts before giving up. */
const MAX_RETRIES = 5;

/** Backoff intervals in milliseconds, indexed by retry count. */
const RETRY_BACKOFF_MS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  4 * 60 * 60 * 1000,
];

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

export async function POST() {
  const now = new Date();

  // Find all submissions eligible for retry.
  const submissions = await prisma.submission.findMany({
    where: {
      status: { in: ["FAILED", "RETRYING"] },
      nextRetryAt: { lte: now },
      retryCount: { lt: MAX_RETRIES },
    },
    include: {
      form: {
        include: { credential: true },
      },
    },
  });

  let succeeded = 0;
  let failed = 0;

  for (const submission of submissions) {
    try {
      // Mark as retrying.
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "RETRYING" },
      });

      const credential = submission.form.credential;
      if (!credential || !credential.isActive) {
        throw new Error("No active CMP credentials available for this form.");
      }

      const client = createCmpClientFromCredential(credential);

      let workRequestId = submission.cmpWorkRequestId;

      // If no work request exists yet, create one.
      if (!workRequestId) {
        const fields = submission.form.formFieldsSnapshot as unknown as CmpFormField[];
        const formData = submission.formData as Record<string, unknown>;
        const allFieldIdentifiers = new Set(fields.map((f) => f.identifier));

        const serializedFields = serializeFormData(
          fields,
          formData,
          allFieldIdentifiers
        );

        const workRequest = await client.createWorkRequest(
          submission.form.cmpTemplateId,
          serializedFields,
        );

        workRequestId = workRequest.id;
      }

      // Update submission as successfully submitted.
      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          cmpWorkRequestId: workRequestId,
          completedAt: new Date(),
          errorMessage: null,
          nextRetryAt: null,
        },
      });

      logger.info(
        { submissionId: submission.id, workRequestId },
        "Retry succeeded for submission."
      );

      succeeded += 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const newRetryCount = submission.retryCount + 1;

      logger.error(
        { submissionId: submission.id, retryCount: newRetryCount, error: errorMessage },
        "Retry failed for submission."
      );

      // Calculate the next retry time using exponential backoff.
      // If the retry count has reached the max, leave as FAILED with no next retry.
      const nextRetryAt =
        newRetryCount < MAX_RETRIES
          ? new Date(Date.now() + RETRY_BACKOFF_MS[newRetryCount])
          : null;

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "FAILED",
          retryCount: newRetryCount,
          errorMessage,
          nextRetryAt,
        },
      });

      failed += 1;
    }
  }

  return NextResponse.json({
    processed: submissions.length,
    succeeded,
    failed,
  });
}
