/**
 * cryptoService.ts
 *
 * Client-side cryptographic helper service.
 * In Phase 1, all message encryption/decryption occurs server-side via AES-256-GCM.
 * This service provides basic hashing and serves as a placeholder/foundation for
 * Phase 2 client-side End-to-End Encryption (E2EE) using Web Crypto API.
 */

/**
 * Generate a SHA-256 hash of a string.
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a standard cryptographically secure random UUID.
 */
export function generateClientMessageId(): string {
  return crypto.randomUUID();
}

/**
 * Phase 2 Web Crypto E2EE placeholder.
 */
export default {
  sha256,
  generateClientMessageId,
};
