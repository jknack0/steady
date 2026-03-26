import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;
const ENCODING = "base64url";

// Prefix so we can distinguish encrypted values from plaintext during migration
const ENCRYPTED_PREFIX = "enc:";

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;

  const keyEnv = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyEnv) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FIELD_ENCRYPTION_KEY must be set in production (32-byte key, base64-encoded)");
    }
    // Dev-only deterministic key — never used in production
    _key = crypto.scryptSync("dev-field-encryption-key", "steady-dev-salt", 32);
    return _key;
  }

  _key = Buffer.from(keyEnv, "base64");
  if (_key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be exactly 32 bytes (256 bits) when base64-decoded");
  }
  return _key;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns: "enc:<iv>:<authTag>:<ciphertext>" (all base64url)
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}

/**
 * Decrypt a value produced by encryptField().
 * If the value doesn't have the encrypted prefix, returns it as-is
 * (supports gradual migration of existing plaintext data).
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    return encryptedValue; // plaintext (pre-migration data)
  }

  const payload = encryptedValue.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted field value");
  }

  const [ivStr, authTagStr, ciphertextStr] = parts;
  const key = getKey();
  const iv = Buffer.from(ivStr, ENCODING);
  const authTag = Buffer.from(authTagStr, ENCODING);
  const ciphertext = Buffer.from(ciphertextStr, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Reset cached key — only for testing. */
export function _resetKeyCache(): void {
  _key = null;
}
