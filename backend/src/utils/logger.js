import pino from 'pino';
import { reqSerializer, resSerializer } from './logSanitizer.js';

/**
 * Centralized Pino logger with:
 *  - Automatic redaction of sensitive fields via `redact` config
 *  - Custom request/response serializers that strip auth headers and cookies
 *  - Environment-aware pretty-printing (dev only)
 *  - Structured JSON output in production (machine-parseable)
 */
const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

    // ── Automatic field redaction ────────────────────────────────────────────
    // Pino redacts these paths at the serialization layer — zero performance
    // impact on the calling code, secrets never reach the transport layer.
    redact: {
        paths: [
            // HTTP request auth headers
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-csrf-token"]',
            'req.headers["x-admin-internal-secret"]',
            // Common body fields that may contain secrets
            'body.password',
            'body.passwordHash',
            'body.token',
            'body.secret',
            'body.refreshToken',
            'body.resetToken',
            'body.verificationToken',
            // Auth callback fields
            'accessToken',
            'refreshToken',
            'idToken',
            'code',
            // Database credentials in error messages
            'err.config.auth',
            'err.config.headers.Authorization',
        ],
        censor: '[REDACTED]',
    },

    // ── Custom serializers ───────────────────────────────────────────────────
    // Replaces default Pino request/response serializers with ones that
    // explicitly exclude Authorization and Cookie headers.
    serializers: {
        req: reqSerializer,
        res: resSerializer,
        // Standard error serializer — preserves stack and message
        err: pino.stdSerializers.err,
    },

    // ── Pretty-print in development only ────────────────────────────────────
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    }),
});

export default logger;
