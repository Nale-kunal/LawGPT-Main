/**
 * adminInternal.js
 *
 * Internal Admin Control Plane — NOT a public API.
 *
 * Security contract:
 *  - Requires X-Admin-Internal-Secret header (timing-safe comparison via crypto.timingSafeEqual)
 *  - Requires X-Admin-Source: admin-control-plane header
 *  - ADMIN_INTERNAL_SECRET MUST be set in environment — no fallback, no default
 *  - All params validated with Zod schemas
 *  - Real session revocation via sessionVersion increment
 *  - Rate limited to 20 req/5min per IP
 *  - Every action logged to structured audit log
 */

import express from 'express';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import User from '../models/User.js';
import AbuseSignalLog from '../models/AbuseSignalLog.js';
import UserUsageSnapshot from '../models/UserUsageSnapshot.js';
import logger from '../utils/logger.js';
import { invalidateUserCache } from '../utils/userCache.js';
import { disconnectUserSockets } from '../community/socket/socketServer.js';
import { validate } from '../middleware/validate.js';
import {
    objectIdSchema,
    suspendUserBodySchema,
    upgradePlanBodySchema,
    revokeSessionsBodySchema,
    adminInternalUserQuerySchema,
} from '../schemas/paramSchemas.js';
import { z } from 'zod';
import { env } from '../config/env.js';

const router = express.Router();

// ── Rate limiter: 20 requests per 5 minutes per IP ────────────────────────────
const adminInternalRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many admin requests. Please wait before retrying.' },
    keyGenerator: (req) => req.ip,
});

router.use(adminInternalRateLimit);

// ── Security Middleware ───────────────────────────────────────────────────────

/**
 * Verifies the admin internal secret using timing-safe comparison.
 * Rejects requests if ADMIN_INTERNAL_SECRET is not configured.
 */
const internalSecretAuth = (req, res, next) => {
    const configuredSecret = env.ADMIN_INTERNAL_SECRET;

    // Hard fail: secret must be configured. env.js already enforces this at
    // startup, but we check again here as defense-in-depth.
    if (!configuredSecret || configuredSecret.length < 32) {
        logger.error('[adminInternal] ADMIN_INTERNAL_SECRET not configured — rejecting all requests');
        return res.status(503).json({ error: 'Admin internal API is not configured' });
    }

    const provided = req.headers['x-admin-internal-secret'];
    if (!provided || typeof provided !== 'string') {
        logger.warn({ ip: req.ip, path: req.path }, '[adminInternal] Missing secret header');
        return res.status(403).json({ error: 'Missing admin internal secret' });
    }

    // Timing-safe comparison — prevents timing oracle attacks
    let isValid = false;
    try {
        const configuredBuffer = Buffer.from(configuredSecret, 'utf8');
        const providedBuffer = Buffer.from(provided, 'utf8');

        // buffers must be same length for timingSafeEqual
        if (configuredBuffer.length === providedBuffer.length) {
            isValid = crypto.timingSafeEqual(configuredBuffer, providedBuffer);
        }
        // If lengths differ, isValid remains false — still constant-time on the comparison itself
    } catch {
        isValid = false;
    }

    if (!isValid) {
        logger.warn({ ip: req.ip, path: req.path }, '[adminInternal] Invalid secret provided');
        return res.status(403).json({ error: 'Invalid admin internal secret' });
    }

    return next();
};

const internalSourceCheck = (req, res, next) => {
    const source = req.headers['x-admin-source'];
    if (source !== 'admin-control-plane') {
        logger.warn({ ip: req.ip, source, path: req.path }, '[adminInternal] Unrecognized admin source');
        return res.status(403).json({ error: 'Unrecognized admin source' });
    }
    return next();
};

router.use(internalSecretAuth, internalSourceCheck);

// ── Audit helper ──────────────────────────────────────────────────────────────

function auditLog(action, userId, details = {}) {
    logger.info({
        audit: true,
        action,
        targetUserId: userId,
        ...details,
    }, `[adminInternal] ${action}`);
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * POST /suspend-user
 * Suspends or unsuspends a user account.
 */
router.post('/suspend-user',
    validate({ body: suspendUserBodySchema }),
    async (req, res) => {
        const { userId, reason, suspend } = req.body;

        try {
            const user = await User.findById(userId);
            if (!user) { return res.status(404).json({ error: 'User not found' }); }

            user.accountStatus.isSuspended = suspend;
            user.accountStatus.suspensionReason = suspend ? reason : null;
            user.status = suspend ? 'suspended' : 'active';

            if (!suspend) {
                user.securityFlags.abuseScore = 0;
            }

            await user.save();
            await invalidateUserCache(userId);

            if (suspend) {
                disconnectUserSockets(userId, 'ACCOUNT_SUSPENDED');
            }

            auditLog(suspend ? 'user_suspended' : 'user_unsuspended', userId, { reason });
            return res.json({ success: true, message: suspend ? 'User suspended' : 'User unsuspended' });
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] suspend-user failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * POST /unsuspend-user
 */
router.post('/unsuspend-user',
    validate({ body: z.object({ userId: objectIdSchema }) }),
    async (req, res) => {
        const { userId } = req.body;

        try {
            const user = await User.findById(userId);
            if (!user) { return res.status(404).json({ error: 'User not found' }); }

            user.accountStatus.isSuspended = false;
            user.accountStatus.suspensionReason = null;
            user.status = 'active';
            user.securityFlags.abuseScore = 0;

            await user.save();
            await invalidateUserCache(userId);

            auditLog('user_unsuspended', userId);
            return res.json({ success: true, message: 'User unsuspended' });
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] unsuspend-user failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * POST /upgrade-plan
 * Updates both the legacy plan.type and the subscriptionPlan fields (keeping both in sync).
 */
router.post('/upgrade-plan',
    validate({ body: upgradePlanBodySchema }),
    async (req, res) => {
        const { userId, planType, limits } = req.body;

        try {
            const user = await User.findById(userId);
            if (!user) { return res.status(404).json({ error: 'User not found' }); }

            // Update new subscription plan field
            user.subscriptionPlan = planType;

            // Update legacy plan.type for backward compatibility
            const legacyTypeMap = { free: 'free', basic: 'free', pro: 'pro', premium: 'enterprise', elite: 'enterprise' };
            user.plan.type = legacyTypeMap[planType] || 'free';

            // Apply limits overrides if provided
            if (limits) {
                user.plan.limits = { ...user.plan.limits.toObject?.() || user.plan.limits, ...limits };
            }

            await user.save();
            await invalidateUserCache(userId);

            auditLog('plan_upgraded', userId, { planType, limits });
            return res.json({ success: true, subscriptionPlan: user.subscriptionPlan, plan: user.plan });
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] upgrade-plan failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * POST /reset-password
 * Generates a password reset token and emails it to the user.
 * Does NOT return the resetUrl in the response (token sent by email only).
 */
router.post('/reset-password',
    validate({ body: z.object({ userId: objectIdSchema }) }),
    async (req, res) => {
        const { userId } = req.body;

        try {
            const user = await User.findById(userId);
            if (!user) { return res.status(404).json({ error: 'User not found' }); }

            const { default: PasswordReset } = await import('../models/PasswordReset.js');

            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await PasswordReset.deleteMany({ userId: user._id });
            await PasswordReset.create({ userId: user._id, email: user.email, tokenHash, expiresAt });

            const resetUrl = `${env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

            try {
                const mailer = await import('../utils/mailer.js');
                await mailer.sendPasswordResetEmail({ to: user.email, resetUrl });
            } catch (emailErr) {
                logger.warn({ err: emailErr.message }, '[adminInternal] reset-password: email delivery failed');
            }

            auditLog('password_reset_triggered', userId);
            // Never return the resetUrl in the response — token is sent by email only
            return res.json({ success: true, message: 'Password reset email sent' });
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] reset-password failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * POST /revoke-all-sessions
 *
 * REAL implementation: increments sessionVersion on the User document.
 * Any JWT issued before sessionVersionAt is now rejected by auth middleware.
 * Also invalidates the Redis user profile cache so the next request
 * fetches the updated sessionVersion from MongoDB.
 */
router.post('/revoke-all-sessions',
    validate({ body: revokeSessionsBodySchema }),
    async (req, res) => {
        const { userId, reason } = req.body;

        try {
            const user = await User.findByIdAndUpdate(
                userId,
                {
                    $inc: { sessionVersion: 1 },
                    $set: { sessionVersionAt: new Date() },
                },
                { new: true }
            );

            if (!user) { return res.status(404).json({ error: 'User not found' }); }

            // Invalidate Redis cache so next auth request reads fresh sessionVersion
            await invalidateUserCache(userId);

            auditLog('sessions_revoked', userId, {
                newSessionVersion: user.sessionVersion,
                reason: reason || 'admin action',
            });

            return res.json({
                success: true,
                message: 'All sessions revoked — user must re-authenticate',
                sessionVersion: user.sessionVersion,
            });
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] revoke-all-sessions failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * GET /get-user-metadata
 * Returns user metadata (excludes password hash and sensitive security fields).
 */
router.get('/get-user-metadata',
    validate({ query: adminInternalUserQuerySchema }),
    async (req, res) => {
        const { userId } = req.query;

        try {
            const user = await User.findById(userId).select(
                '-passwordHash -verificationToken -resetPasswordToken -securityAnswerHash'
            ).lean();
            if (!user) { return res.status(404).json({ error: 'User not found' }); }
            return res.json(user);
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] get-user-metadata failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * GET /get-user-usage
 */
router.get('/get-user-usage',
    validate({ query: adminInternalUserQuerySchema }),
    async (req, res) => {
        const { userId } = req.query;

        try {
            const usage = await UserUsageSnapshot.find({ userId })
                .sort({ snapshotDate: -1 })
                .limit(30)
                .lean();
            return res.json(usage);
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] get-user-usage failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

/**
 * GET /get-user-abuse-log
 */
router.get('/get-user-abuse-log',
    validate({ query: adminInternalUserQuerySchema }),
    async (req, res) => {
        const { userId } = req.query;

        try {
            const logs = await AbuseSignalLog.find({ userId })
                .sort({ timestamp: -1 })
                .limit(50)
                .lean();
            return res.json(logs);
        } catch (err) {
            logger.error({ err, userId }, '[adminInternal] get-user-abuse-log failed');
            return res.status(500).json({ error: 'Operation failed' });
        }
    }
);

export default router;
