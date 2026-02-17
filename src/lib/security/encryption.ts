import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Retrieves and validates the encryption key from the ENCRYPTION_KEY
 * environment variable. The key must be a base64-encoded 32-byte value.
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "It must be a base64-encoded 32-byte key."
    );
  }

  const key = Buffer.from(keyBase64, "base64");

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to exactly 32 bytes. Got ${key.length} bytes.`
    );
  }

  return key;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in the format "iv:authTag:ciphertext" where all
 * components are hex-encoded.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with the encrypt function.
 * Expects the format "iv:authTag:ciphertext" where all components
 * are hex-encoded.
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();

  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted string format. Expected 'iv:authTag:ciphertext'."
    );
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
