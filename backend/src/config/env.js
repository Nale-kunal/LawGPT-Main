/**
 * Centralised environment variable validation.
 * Validated once at startup using Zod — fail fast if config is wrong.
 *
 * Usage (must be first import in index.js):
 *   import { env } from './src/config/env.js';
 */

import { z } from 'zod';

// ── Schema ────────────────────────────────────────────────────────────────────
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'staging', 'test', 'production']).default('development'),
    PORT: z.coerce.number().min(1).max(65535).default(5000),

    // Database
    MONGODB_URI: z.string().regex(
        /^mongodb(\+srv)?:\/\/.+/,
        'MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)'
    ),

    // Auth — minimum 32 chars enforced
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

    // Multi-key rotation (optional — JSON array of { kid, secret, active })
    JWT_KEYS: z.string().optional(),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    COOKIE_DOMAIN: z.string().optional(),

    // Redis — required in production unless fallback is explicitly allowed
    REDIS_URL: z.string().optional(),
    ALLOW_INSECURE_REDIS_FALLBACK: z.coerce.boolean().default(false),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    // Optional external services
    SENTRY_DSN: z.string().url().optional().or(z.literal('')),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().email().optional(),

    // Deployment
    SHUTDOWN_TIMEOUT: z.coerce.number().default(30000),
    FRONTEND_URL: z.string().url().optional().or(z.literal('')),

    // Google OAuth (optional — feature disabled if absent)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().url().optional().or(z.literal('')),

    // ── Razorpay ──────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID:        z.string().optional(),
    RAZORPAY_KEY_SECRET:    z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    // Subscription Plan IDs (created in Razorpay Dashboard)
    RAZORPAY_PLAN_ID_BASIC:          z.string().optional(),
    RAZORPAY_PLAN_ID_PRO:            z.string().optional(),
    RAZORPAY_PLAN_ID_PREMIUM:        z.string().optional(),
    RAZORPAY_PLAN_ID_ELITE:          z.string().optional(),
    RAZORPAY_PLAN_ID_BASIC_YEARLY:   z.string().optional(),
    RAZORPAY_PLAN_ID_PRO_YEARLY:     z.string().optional(),
    RAZORPAY_PLAN_ID_PREMIUM_YEARLY: z.string().optional(),
    RAZORPAY_PLAN_ID_ELITE_YEARLY:   z.string().optional(),

    // ── Community System ──────────────────────────────────────────────────
    // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    COMMUNITY_ENCRYPTION_SECRET: z.string().min(32).optional(),

    // ── Admin Internal API ────────────────────────────────────────────────
    // REQUIRED — generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ADMIN_INTERNAL_SECRET: z.string().min(32, 'ADMIN_INTERNAL_SECRET must be at least 32 characters'),

    // ── SMTP / Email ──────────────────────────────────────────────────────
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().optional(),
    RESET_PASSWORD_BASE_URL: z.string().url().optional().or(z.literal('')),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    SUPPORT_EMAIL: z.string().email().optional(),

    // ── Alerting ─────────────────────────────────────────────────────────
    SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),

    // ── Note Attachments ──────────────────────────────────────────────────
    NOTE_ATTACHMENT_MAX_SIZE_MB: z.coerce.number().optional(),

    // ── Activity TTL ──────────────────────────────────────────────────────
    ACTIVITY_EVENT_TTL_DAYS: z.coerce.number().optional(),

    // ── Metrics ───────────────────────────────────────────────────────────
    METRICS_TOKEN: z.string().optional(),
});

// ── Known insecure placeholder strings that must never appear in production secrets ──
const INSECURE_PLACEHOLDERS = [
    'your-jwt-secret',
    'your-refresh-secret',
    'change-this',
    'change-in-production',
    'changeme',
    'placeholder',
    'replace-with',
    'your-secret',
    'secret-key',
    'minimum-32-characters',
    'minimum-64-characters',
];

/**
 * Returns true if the string contains any known insecure placeholder substring.
 * Case-insensitive check.
 */
function containsPlaceholder(value) {
    const lower = value.toLowerCase();
    return INSECURE_PLACEHOLDERS.some(p => lower.includes(p));
}

/**
 * The hardcoded fallback that used to exist in adminInternal.js.
 * Explicitly rejected — if anyone copies this into env it will be blocked.
 */
const KNOWN_COMPROMISED_SECRETS = new Set([
    'c7e5a6f912b3d8c4e5a6f912b3d8c4e5a6f912b3d8c4e5a6f912b3d8c4e5a6f9',
]);

// ── Production-specific extra rules ──────────────────────────────────────────
function applyProductionRules(data) {
    const errors = [];

    if (data.NODE_ENV === 'production') {
        if (!data.REDIS_URL && !data.ALLOW_INSECURE_REDIS_FALLBACK) {
            console.warn('[startup] REDIS_URL not set — falling back to in-memory store. Set REDIS_URL in production for rate limiting and session persistence.');
        }
        if (!data.SENTRY_DSN) {
            // Warn but don't fail — Sentry is highly recommended but optional
            console.warn('[startup] SENTRY_DSN not set — error tracking disabled in production');
        }
        if (!data.CLOUDINARY_CLOUD_NAME) {
            console.warn('[startup] CLOUDINARY credentials not set — file uploads will fail');
        }
        if (data.JWT_SECRET.length < 64) {
            errors.push('JWT_SECRET must be at least 64 characters in production (use node -e "require(\'crypto\').randomBytes(64).toString(\'hex\')")');
        }
        if (data.JWT_REFRESH_SECRET.length < 64) {
            errors.push('JWT_REFRESH_SECRET must be at least 64 characters in production');
        }
        if (data.ADMIN_INTERNAL_SECRET.length < 32) {
            errors.push('ADMIN_INTERNAL_SECRET must be at least 32 characters in production');
        }
        // ── Razorpay production requirements ──────────────────────────────
        if (!data.RAZORPAY_KEY_ID || !data.RAZORPAY_KEY_ID.startsWith('rzp_')) {
            errors.push('RAZORPAY_KEY_ID is required in production (must start with rzp_live_ or rzp_test_)');
        }
        if (!data.RAZORPAY_KEY_SECRET) {
            errors.push('RAZORPAY_KEY_SECRET is required in production');
        }
        if (!data.RAZORPAY_WEBHOOK_SECRET || data.RAZORPAY_WEBHOOK_SECRET.length < 20) {
            errors.push('RAZORPAY_WEBHOOK_SECRET is required and must be at least 20 characters in production');
        }
        // Warn (not fail) if plan IDs not configured — payment routes will 503 gracefully
        const planIdVars = [
            'RAZORPAY_PLAN_ID_BASIC','RAZORPAY_PLAN_ID_PRO',
            'RAZORPAY_PLAN_ID_PREMIUM','RAZORPAY_PLAN_ID_ELITE',
        ];
        const missingPlanIds = planIdVars.filter(k => !data[k]);
        if (missingPlanIds.length > 0) {
            console.warn(`[startup] Missing Razorpay plan IDs (payment creation will fail for those tiers): ${missingPlanIds.join(', ')}`);
        }
    }

    // ── Placeholder/insecure secret rejection (all environments) ──────────
    if (containsPlaceholder(data.JWT_SECRET)) {
        errors.push('JWT_SECRET contains insecure placeholder text. Generate a real secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    }
    if (containsPlaceholder(data.JWT_REFRESH_SECRET)) {
        errors.push('JWT_REFRESH_SECRET contains insecure placeholder text. Generate a real secret.');
    }
    if (KNOWN_COMPROMISED_SECRETS.has(data.ADMIN_INTERNAL_SECRET)) {
        errors.push('ADMIN_INTERNAL_SECRET is using a known compromised value. Generate a new one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    if (containsPlaceholder(data.ADMIN_INTERNAL_SECRET)) {
        errors.push('ADMIN_INTERNAL_SECRET contains insecure placeholder text.');
    }

    return errors;
}

// ── Validate ──────────────────────────────────────────────────────────────────
function validateEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const issues = result.error.issues.map(i => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
        console.error(`\n🚨 FATAL: Invalid environment configuration:\n${issues}\n`);
        process.exit(1);
    }

    const productionErrors = applyProductionRules(result.data);
    if (productionErrors.length > 0) {
        const msg = productionErrors.map(e => `  • ${e}`).join('\n');
        console.error(`\n🚨 FATAL: Production environment requirements not met:\n${msg}\n`);
        process.exit(1);
    }

    return result.data;
}

// Validated, typed env — singleton
export const env = validateEnv();
export default env;
