import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/security/auth";
import { encrypt } from "@/lib/security/encryption";
import { AppError, ErrorCode, formatErrorResponse } from "@/lib/errors";
import logger from "@/lib/logging/logger";

const createCredentialSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  label: z.string().optional(),
});

const updateCredentialSchema = z.object({
  id: z.string().min(1, "Credential ID is required"),
  isActive: z.boolean().optional(),
  label: z.string().optional(),
});

// Strips encrypted fields from a credential record before returning it.
function sanitizeCredential(credential: {
  id: string;
  label: string;
  isActive: boolean;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: credential.id,
    label: credential.label,
    isActive: credential.isActive,
    lastTestedAt: credential.lastTestedAt,
    createdAt: credential.createdAt,
  };
}

async function requireAuth(requestId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError(
      "Authentication required",
      401,
      ErrorCode.UNAUTHORIZED,
      requestId
    );
  }
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    await requireAuth(requestId);

    const credentials = await prisma.cmpCredential.findMany({
      orderBy: { createdAt: "desc" },
    });

    const sanitized = credentials.map(sanitizeCredential);

    return NextResponse.json({ credentials: sanitized });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Failed to fetch credentials");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const user = await requireAuth(requestId);

    const body = await request.json();
    const parsed = createCredentialSchema.parse(body);

    // Deactivate all existing credentials before creating a new one.
    await prisma.cmpCredential.updateMany({
      data: { isActive: false },
    });

    const clientIdEncrypted = encrypt(parsed.clientId);
    const clientSecretEncrypted = encrypt(parsed.clientSecret);

    const credential = await prisma.cmpCredential.create({
      data: {
        clientIdEncrypted,
        clientSecretEncrypted,
        label: parsed.label ?? "Default",
        isActive: true,
      },
    });

    logger.info(
      { requestId, userId: user.sub, credentialId: credential.id },
      "CMP credential created"
    );

    return NextResponse.json(
      { credential: sanitizeCredential(credential) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Failed to create credential");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const user = await requireAuth(requestId);

    const body = await request.json();
    const parsed = updateCredentialSchema.parse(body);

    // If activating this credential, deactivate all others first.
    if (parsed.isActive === true) {
      await prisma.cmpCredential.updateMany({
        data: { isActive: false },
      });
    }

    const updateData: { isActive?: boolean; label?: string } = {};
    if (parsed.isActive !== undefined) {
      updateData.isActive = parsed.isActive;
    }
    if (parsed.label !== undefined) {
      updateData.label = parsed.label;
    }

    const credential = await prisma.cmpCredential.update({
      where: { id: parsed.id },
      data: updateData,
    });

    logger.info(
      { requestId, userId: user.sub, credentialId: credential.id },
      "CMP credential updated"
    );

    return NextResponse.json({ credential: sanitizeCredential(credential) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const appError = new AppError(
        error.issues.map((e: { message: string }) => e.message).join(". "),
        400,
        ErrorCode.VALIDATION_ERROR,
        requestId
      );
      return NextResponse.json(formatErrorResponse(appError, requestId), {
        status: 400,
      });
    }

    if (error instanceof AppError) {
      return NextResponse.json(formatErrorResponse(error, requestId), {
        status: error.statusCode,
      });
    }

    logger.error({ requestId, error }, "Failed to update credential");
    return NextResponse.json(formatErrorResponse(error, requestId), {
      status: 500,
    });
  }
}
