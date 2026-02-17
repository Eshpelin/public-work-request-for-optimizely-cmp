import crypto from "crypto";

/**
 * Generates a cryptographically secure 256-bit random token
 * encoded as a URL-safe base64 string (base64url).
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
