/**
 * logSanitizer.js
 *
 * Centralized log sanitization utility.
 * Prevents secrets, tokens, passwords, and credentials from leaking into logs.
 *
 * Usage:
 *   import { sanitize, maskToken } from '../utils/logSanitizer.js';
 *   logger.info(sanitize({ user, token, data }), 'Event occurred');
 */

// ── Sensitive field name patterns ─────────────────────────────────────────────
// These are matched case-insensitively against object keys.
// Any key matching any of these substrings will have its value redacted.
const SENSITIVE_FIELD_SUBSTRINGS = [
    'password',
    'passwd',
    'token',
    'secret',
    'apikey',
    'api_key',
    'authorization',
    'cookie',
    'jwt',
    'refresh',
    'resettoken',
    'reset_token',
    'verifytoken',
    'verify_token',
    'emailtoken',
    'email_token',
    'hash',
    'credential',
    'credentials',
    'pin',
    'otp',
    'cvv',
    'cardnumber',
    'card_number',
    'ssn',
    'privatekey',
    'private_key',
    'smtppass',
    'smtp_pass',
    'accesstoken',
    'access_token',
    'idtoken',
    'id_token',
    'clientsecret',
    'client_secret',
];

// ── Values that are always fully redacted regardless of field name ────────────
// These patterns match common secret formats in values.
const SENSITIVE_VALUE_PATTERNS = [
    /^Bearer\s+\S+/i,           // Bearer tokens
    /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]+$/, // JWT
];

/**
 * Returns true if a field name is considered sensitive.
 * @param {string} key
 */
function isSensitiveKey(key) {
    const lower = key.toLowerCase().replace(/[-_]/g, '');
    return SENSITIVE_FIELD_SUBSTRINGS.some(s => lower.includes(s.replace(/[-_]/g, '')));
}

/**
 * Returns true if a string value looks like a secret (JWT, Bearer token, etc.)
 * regardless of the field name it was found in.
 * @param {string} value
 */
function isSensitiveValue(value) {
    if (typeof value !== 'string') {return false;}
    return SENSITIVE_VALUE_PATTERNS.some(re => re.test(value));
}

/**
 * Masks a string value for safe logging.
 *  - Strings longer than 12 chars: show first 4 + '***' + last 4
 *  - Strings 1-12 chars: fully redact as '[REDACTED]'
 *  - Empty strings: return '[REDACTED]'
 *  - Non-strings: return '[REDACTED]'
 *
 * @param {*} value
 * @returns {string}
 */
export function maskValue(value) {
    if (typeof value !== 'string' || value.length === 0) {
        return '[REDACTED]';
    }
    if (value.length > 12) {
        return `${value.slice(0, 4)}***${value.slice(-4)}`;
    }
    return '[REDACTED]';
}

/**
 * Masks a token for safe logging — shows a short prefix only.
 * Example: "eyJhbGciOiJIUzI1NiJ9..." → "eyJh[REDACTED]"
 * @param {string} token
 * @returns {string}
 */
export function maskToken(token) {
    if (typeof token !== 'string' || token.length === 0) {return '[REDACTED]';}
    return `${token.slice(0, 4)}[REDACTED]`;
}

/**
 * Deep-clones an object and redacts all sensitive fields.
 * Safe to call on arbitrary objects — does not mutate the original.
 *
 * Handles: plain objects, arrays, primitives.
 * Does NOT traverse: class instances, functions, Buffers (returned as-is).
 *
 * @param {*} obj - Object to sanitize
 * @param {number} [depth=0] - Current recursion depth (max 10)
 * @returns {*} Sanitized clone
 */
export function sanitize(obj, depth = 0) {
    // Depth guard to prevent prototype pollution via circular refs
    if (depth > 10) {return '[MAX_DEPTH]';}

    // Primitive — return as-is (numbers, booleans, null, undefined)
    if (obj === null || obj === undefined) {return obj;}
    if (typeof obj === 'number' || typeof obj === 'boolean') {return obj;}

    // String — check if it looks like a secret value
    if (typeof obj === 'string') {
        return isSensitiveValue(obj) ? maskValue(obj) : obj;
    }

    // Array — recursively sanitize elements
    if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item, depth + 1));
    }

    // Plain object — recursively sanitize, redacting sensitive keys
    if (typeof obj === 'object' && obj.constructor === Object) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            // Block prototype pollution attempts in logged objects
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                result[key] = '[BLOCKED]';
                continue;
            }
            if (isSensitiveKey(key)) {
                result[key] = maskValue(value);
            } else {
                result[key] = sanitize(value, depth + 1);
            }
        }
        return result;
    }

    // Everything else (Date, Buffer, class instance, function) — return as-is
    return obj;
}

/**
 * Creates a Pino-compatible serializer for request objects
 * that strips Authorization headers and cookies.
 * @param {object} req - Express request object
 * @returns {object} Safe request summary
 */
export function reqSerializer(req) {
    return {
        id: req.id,
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query ? sanitize(req.query) : undefined,
        remoteAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
        // Explicitly exclude: authorization, cookie, x-csrf-token
    };
}

/**
 * Creates a Pino-compatible serializer for response objects.
 * @param {object} res - Express response object
 * @returns {object} Safe response summary
 */
export function resSerializer(res) {
    return {
        statusCode: res.statusCode,
    };
}

export default { sanitize, maskValue, maskToken, reqSerializer, resSerializer };
