/**
 * Startup security checks — run after env validation, before server listens.
 * These checks warn on security misconfigurations but do NOT crash the server.
 */

import logger from './logger.js';

const isProduction = process.env.NODE_ENV === 'production';

export function runStartupChecks() {
    const warnings = [];
    const securityIssues = [];

    // ── 1. Redis TLS enforcement ─────────────────────────────────────────────────
    const redisUrl = process.env.REDIS_URL;
    const allowInsecureRedis = process.env.ALLOW_INSECURE_REDIS_FALLBACK === 'true';

    if (redisUrl) {
        if (isProduction && !redisUrl.startsWith('rediss://') && !allowInsecureRedis) {
            securityIssues.push(
                'REDIS_URL must use TLS in production (rediss://). ' +
                'Update your Redis URL to use "rediss://" scheme or set ALLOW_INSECURE_REDIS_FALLBACK=true.'
            );
        } else if (isProduction && !redisUrl.startsWith('rediss://') && allowInsecureRedis) {
            warnings.push('REDIS_URL: non-TLS Redis in production (allowed via ALLOW_INSECURE_REDIS_FALLBACK)');
        } else if (!isProduction && redisUrl.startsWith('redis://')) {
            warnings.push('REDIS_URL: non-TLS Redis in development (acceptable for local dev)');
        }
    } else if (isProduction) {
        warnings.push('REDIS_URL not set — using in-memory fallback (rate limiting not distributed)');
    }

    // ── 2. MongoDB TLS enforcement ───────────────────────────────────────────────
    const mongoUri = process.env.MONGODB_URI || '';
    if (isProduction) {
        if (mongoUri.startsWith('mongodb://') && !mongoUri.includes('localhost') && !mongoUri.includes('127.0.0.1')) {
            securityIssues.push(
                'MONGODB_URI must use TLS in production for remote hosts. ' +
                'Use mongodb+srv:// (Atlas) or add ?tls=true to your connection string.'
            );
        }
    }

    // ── 3. MongoDB Atlas free tier (M0) warning ──────────────────────────────────
    if (isProduction && mongoUri.includes('mongodb.net')) {
        warnings.push(
            'MongoDB Atlas detected. Ensure cluster tier is M10+ for production workloads. ' +
            'M0 free tier has connection limits (500 max) and no guaranteed uptime SLA.'
        );
    }

    // ── 4. Cookie security ───────────────────────────────────────────────────────
    if (isProduction && process.env.CORS_ORIGIN?.includes('http://')) {
        warnings.push(
            'CORS_ORIGIN contains an http:// origin in production. ' +
            'HTTPS is required for secure cookies. Update to https://.'
        );
    }

    // ── 5. Weak secrets detection ────────────────────────────────────────────────
    const weakPatterns = ['secret', 'password', 'changeme', 'test123', 'dev123', '12345'];
    for (const varName of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
        const val = (process.env[varName] || '').toLowerCase();
        if (weakPatterns.some(p => val.includes(p))) {
            if (isProduction) {
                securityIssues.push(`${varName} contains a weak/predictable value. Generate: openssl rand -base64 64`);
            } else {
                warnings.push(`${varName} looks weak (fine for dev, NOT for production)`);
            }
        }
    }

    // ── 6. CORS wildcard check ───────────────────────────────────────────────────
    if (isProduction && (process.env.CORS_ORIGIN || '').includes('*')) {
        securityIssues.push('CORS_ORIGIN must not contain wildcard (*) in production. Specify exact allowed origins.');
    }

    // ── Output ───────────────────────────────────────────────────────────────────
    for (const warning of warnings) {
        logger.warn({ check: 'startup' }, `⚠️  ${warning}`);
    }

    if (securityIssues.length > 0) {
        const msg = securityIssues.map(e => `  ✗ ${e}`).join('\n');
        // Log as error but do NOT exit — a running app with warnings > no app at all
        logger.error(`\n🔒 Security config issues detected (server starting anyway):\n${msg}\n`);
    }

    logger.info({ warnings: warnings.length, issues: securityIssues.length }, '✅ Startup checks complete');
}
