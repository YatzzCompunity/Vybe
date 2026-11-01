import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a cryptographically random 32-byte (64 hex character) confirmation token
 * and its one-way SHA-256 hash.
 *
 * Security Invariant:
 * - Only `tokenHash` is persisted in `NewsletterSubscriber.confirmTokenHash`.
 * - The raw `token` is intended solely for out-of-band email delivery (Phase 4+ TODO)
 *   and must NEVER be stored in the database, returned in API responses, or written
 *   to application logs.
 */
export function generateConfirmationTokenPair(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashConfirmationToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Compute the deterministic SHA-256 hex digest of a confirmation token.
 */
export function hashConfirmationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim(), "utf8").digest("hex");
}
