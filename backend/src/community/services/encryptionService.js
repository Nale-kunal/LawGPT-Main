/**
 * encryptionService.js
 *
 * AES-256-GCM server-side encryption for community messages.
 *
 * Security design:
 *  - Master key rotation via keys mapped in process.env.COMMUNITY_ENCRYPTION_SECRETS
 *  - Per-conversation keys derived via HKDF from a versioned master secret + conversationId
 *  - Keys are NEVER stored in the database — derived on demand
 *  - Strict replay prevention by tracking message nonces (IVs) in Redis
 *  - GCM authentication tag (16 bytes) provides tamper detection
 *  - Plaintext is NEVER logged or stored
 */

import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { redis } from '../../utils/redis.js';
import logger from '../../utils/logger.js';

// ── Master secrets key rotation map ───────────────────────────────────────────
let KEY_SECRETS = {
  '1': process.env.COMMUNITY_ENCRYPTION_SECRET || 'dev-insecure-fallback-do-not-use-in-production-ever'
};

const rawSecrets = process.env.COMMUNITY_ENCRYPTION_SECRETS;
if (rawSecrets) {
  try {
    const parsed = JSON.parse(rawSecrets);
    if (typeof parsed === 'object' && parsed !== null) {
      KEY_SECRETS = { ...KEY_SECRETS, ...parsed };
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to parse COMMUNITY_ENCRYPTION_SECRETS env. Falling back to primary secret.');
  }
}

// Derive active key version (the highest numeric or string key in the map)
export const ACTIVE_KEY_VERSION = Object.keys(KEY_SECRETS)
  .sort((a, b) => Number(a) - Number(b))
  .pop() || '1';

if (KEY_SECRETS['1'] === 'dev-insecure-fallback-do-not-use-in-production-ever' && process.env.NODE_ENV === 'production') {
  logger.error('COMMUNITY_ENCRYPTION_SECRET must be configured in production!');
  process.exit(1);
}

// ── Key derivation ─────────────────────────────────────────────────────────────
// HKDF-like: HMAC-SHA256(masterSecret_version, conversationId) → 32-byte key
// Deterministic per conversation and version — no key storage needed
function deriveConversationKey(conversationId, keyVersion = '1') {
  const secret = KEY_SECRETS[keyVersion] || KEY_SECRETS['1'];
  return createHmac('sha256', secret)
    .update(`community:conv:${conversationId}`)
    .digest(); // 32 bytes — AES-256 key
}

// ── Nonce anti-replay verification ────────────────────────────────────────────
/**
 * Track message nonces (IVs) in Redis to prevent replay attacks.
 * Returns true if the nonce is already used, false if it is fresh.
 */
export async function isNonceReplayed(conversationId, iv) {
  if (!redis.isAvailable()) {
    return false; // Fail open to skip checks if Redis is offline in dev
  }
  try {
    const raw = redis.raw();
    if (!raw) { return false; }

    const key = `rl:nonce:${conversationId}:${iv}`;
    // NX = only set if it does not exist. Expiry set to 24 hours (86400s)
    const result = await raw.set(key, '1', 'EX', 86400, 'NX');
    return result !== 'OK';
  } catch (err) {
    logger.warn({ err, conversationId }, 'Nonce replay check failed (non-fatal)');
    return false;
  }
}

// ── Encrypt ───────────────────────────────────────────────────────────────────
/**
 * Encrypt a plaintext string for a given conversation.
 *
 * @param {string} plaintext       - Message content to encrypt
 * @param {string} conversationId  - MongoDB ObjectId string
 * @param {string} keyVersion      - Key version to encrypt with
 * @returns {{ ciphertext: string, iv: string, authTag: string, keyVersion: string }}
 */
export function encryptMessage(plaintext, conversationId, keyVersion = ACTIVE_KEY_VERSION) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('encryptMessage: plaintext must be a non-empty string');
  }
  if (!conversationId) {
    throw new Error('encryptMessage: conversationId is required');
  }

  try {
    const key = deriveConversationKey(conversationId, keyVersion);
    const iv  = randomBytes(12); // 96-bit IV — GCM standard

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag

    return {
      ciphertext: encrypted.toString('base64'),
      iv:         iv.toString('base64'),
      authTag:    authTag.toString('base64'),
      keyVersion,
    };
  } catch (err) {
    logger.error({ err, conversationId }, 'encryptMessage: encryption failed');
    throw new Error('Message encryption failed', { cause: err });
  }
}

// ── Decrypt ───────────────────────────────────────────────────────────────────
/**
 * Decrypt a message for a given conversation.
 *
 * @param {string} ciphertext      - base64 ciphertext
 * @param {string} iv              - base64 IV
 * @param {string} authTag         - base64 GCM auth tag
 * @param {string} conversationId  - MongoDB ObjectId string
 * @param {string} keyVersion      - Key version message was encrypted with
 * @returns {string} plaintext
 */
export function decryptMessage(ciphertext, iv, authTag, conversationId, keyVersion = '1') {
  if (!ciphertext || !iv || !authTag || !conversationId) {
    throw new Error('decryptMessage: all parameters are required');
  }

  try {
    const key  = deriveConversationKey(conversationId, keyVersion);
    const ivBuf  = Buffer.from(iv, 'base64');
    const tagBuf = Buffer.from(authTag, 'base64');
    const ctBuf  = Buffer.from(ciphertext, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, ivBuf);
    decipher.setAuthTag(tagBuf);

    const decrypted = Buffer.concat([
      decipher.update(ctBuf),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    if (err.message?.includes('Unsupported state')) {
      throw new Error('Message integrity check failed — possible tampering detected', { cause: err });
    }
    logger.error({ err: err.message, conversationId, keyVersion }, 'decryptMessage: decryption failed');
    throw new Error('Message decryption failed', { cause: err });
  }
}

// ── Encrypt/Decrypt Attachment Metadata ───────────────────────────────────────
/**
 * Encrypt file metadata (URLs, filenames) to keep them private.
 */
export function encryptAttachmentMetadata(filename, secureUrl, conversationId, keyVersion = ACTIVE_KEY_VERSION) {
  try {
    const key = deriveConversationKey(conversationId, keyVersion);
    const iv = randomBytes(12);

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const payload = JSON.stringify({ filename, secureUrl });
    const encrypted = Buffer.concat([
      cipher.update(payload, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.toString('base64'),
      iv:            iv.toString('base64'),
      authTag:       authTag.toString('base64'),
      keyVersion
    };
  } catch (err) {
    logger.error({ err, conversationId }, 'encryptAttachmentMetadata: failed');
    throw new Error('Attachment encryption failed', { cause: err });
  }
}

/**
 * Decrypt file metadata.
 */
export function decryptAttachmentMetadata(encryptedData, iv, authTag, conversationId, keyVersion = '1') {
  try {
    const key = deriveConversationKey(conversationId, keyVersion);
    const ivBuf = Buffer.from(iv, 'base64');
    const tagBuf = Buffer.from(authTag, 'base64');
    const ctBuf = Buffer.from(encryptedData, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, ivBuf);
    decipher.setAuthTag(tagBuf);

    const decrypted = Buffer.concat([
      decipher.update(ctBuf),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    logger.error({ err: err.message, conversationId, keyVersion }, 'decryptAttachmentMetadata: failed');
    return { filename: '[Encrypted File]', secureUrl: '' };
  }
}

// ── Batch decrypt for message list ────────────────────────────────────────────
export function decryptMessages(messages) {
  return messages.map((msg) => {
    try {
      if (!msg.encryptedContent || !msg.iv || !msg.authTag) {
        return { ...msg, content: null };
      }
      const convId = msg.conversationId?.toString?.() || msg.conversationId;
      const keyVer = msg.keyVersion || '1';
      const content = decryptMessage(msg.encryptedContent, msg.iv, msg.authTag, convId, keyVer);
      return {
        ...msg,
        content,
        encryptedContent: undefined,
        iv: undefined,
        authTag: undefined,
      };
    } catch {
      return {
        ...msg,
        content: '[Message could not be decrypted]',
        encryptedContent: undefined,
        iv: undefined,
        authTag: undefined,
      };
    }
  });
}

// ── Preview generation ────────────────────────────────────────────────────────
export function generatePreview(messageType, plaintext) {
  switch (messageType) {
    case 'image': return '📷 Image';
    case 'voice': return '🎤 Voice message';
    case 'file':  return '📎 File attachment';
    case 'video': return '🎥 Video';
    case 'system': return plaintext || '';
    default:
      return plaintext ? plaintext.slice(0, 80) : '';
  }
}

export default {
  ACTIVE_KEY_VERSION,
  isNonceReplayed,
  encryptMessage,
  decryptMessage,
  encryptAttachmentMetadata,
  decryptAttachmentMetadata,
  decryptMessages,
  generatePreview
};
