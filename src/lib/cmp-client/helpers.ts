import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";
import { CmpTokenManager } from "@/lib/cmp-client/auth";
import { CmpClient } from "@/lib/cmp-client";
import { AppError, ErrorCode } from "@/lib/errors";

/**
 * Creates a CmpClient instance using the currently active CMP credentials.
 * Decrypts the stored client ID and secret, then initializes the token
 * manager and client.
 */
export async function getCmpClient(): Promise<CmpClient> {
  const credential = await prisma.cmpCredential.findFirst({
    where: { isActive: true },
  });

  if (!credential) {
    throw new AppError(
      "No active CMP credentials found",
      400,
      ErrorCode.VALIDATION_ERROR
    );
  }

  const clientId = decrypt(credential.clientIdEncrypted);
  const clientSecret = decrypt(credential.clientSecretEncrypted);
  const tokenManager = new CmpTokenManager(clientId, clientSecret);

  return new CmpClient(tokenManager);
}
