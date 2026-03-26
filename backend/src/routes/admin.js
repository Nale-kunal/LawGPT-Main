/**
 * Admin routes — protected by requireRole('admin').
 * Features:
 *  - Bull Board queue dashboard (non-production or admin only)
 *  - Audit log chain verification endpoint
 *  - Admin user listing
 */

import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import { requireRole } from '../middleware/rbac.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// ActivityEvent is the audit trail for auth events (login, OAuth, link, unlink)
let ActivityEvent = null;
try { ActivityEvent = (await import('../models/ActivityEvent.js')).default; } catch { /* not available in all envs */ }

const router = express.Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireRole('admin'));

// ─── Audit Log Chain Verification ─────────────────────────────────────────────
/**
 * GET /api/v1/admin/audit/verify
 * Walks the entire audit log hash chain and reports any tampered entries.
 * Restricted to admin role — this is a sensitive security operation.
 */
router.get('/audit/verify', async (req, res) => {
    try {
        logger.info({ userId: req.user?.userId }, 'Admin: audit chain verification started');
        const result = await AuditLog.verifyChain();

        if (result.valid) {
            return res.json({
                ok: true,
                message: 'Audit log chain integrity verified — no tampering detected',
                checked: result.checked,
            });
        } else {
            logger.error({ firstTamperedId: result.firstTamperedId }, '🚨 Audit log tampering detected');
            return res.status(200).json({
                ok: false,
                alert: 'CHAIN_INTEGRITY_VIOLATION',
                message: 'Audit log tampering detected — chain broken at entry below',
                firstTamperedId: result.firstTamperedId,
                checked: result.checked,
            });
        }
    } catch (err) {
        logger.error({ err }, 'Audit chain verification failed');
        return res.status(500).json({ error: 'Verification failed', message: err.message });
    }
});

// ─── Audit Log Query ──────────────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.userId) { filter.userId = req.query.userId; }
        if (req.query.action) { filter.action = req.query.action; }

        const [entries, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-hash -prevHash') // Don't expose hash chain to API consumers
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        return res.json({
            ok: true,
            data: entries,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        logger.error({ err }, 'Audit log query failed');
        return res.status(500).json({ error: 'Query failed' });
    }
});

// ─── Bull Board Queue Dashboard ───────────────────────────────────────────────
// Only mount if BullMQ / Redis are available, else return 503
router.get('/queues', async (req, res) => {
    const redisAvailable = (await import('../utils/redis.js')).default.isAvailable();
    if (!redisAvailable) {
        return res.status(503).json({
            error: 'Queue dashboard unavailable',
            message: 'Redis is not connected. Queue monitoring requires Redis.',
        });
    }

    try {
        // Dynamic import so Bull Board doesn't crash if Redis is not available
        const { createBullBoard } = await import('@bull-board/api').catch(() => null) || {};
        const { BullMQAdapter } = await import('@bull-board/api/bullMQAdapter.js').catch(() => null) || {};
        const { getEmailQueue } = await import('../workers/emailWorker.js');
        const { getCleanupQueue } = await import('../workers/cleanupWorker.js');

        if (!createBullBoard || !BullMQAdapter) {
            return res.json({
                ok: true,
                message: 'Install @bull-board/api for UI. Current queue status:',
                queues: ['email', 'cleanup'],
                note: 'npm install @bull-board/api @bull-board/express',
            });
        }

        const emailQueue = getEmailQueue();
        const cleanupQueue = getCleanupQueue();

        const queues = [];
        if (emailQueue) {
            const [waiting, active, failed, completed] = await Promise.all([
                emailQueue.getWaitingCount(),
                emailQueue.getActiveCount(),
                emailQueue.getFailedCount(),
                emailQueue.getCompletedCount(),
            ]);
            queues.push({ name: 'email', waiting, active, failed, completed });
        }

        if (cleanupQueue) {
            const [waiting, active, failed] = await Promise.all([
                cleanupQueue.getWaitingCount(),
                cleanupQueue.getActiveCount(),
                cleanupQueue.getFailedCount(),
            ]);
            queues.push({ name: 'cleanup', waiting, active, failed });
        }

        return res.json({ ok: true, queues });
    } catch (err) {
        logger.error({ err }, 'Queue dashboard error');
        return res.status(500).json({ error: 'Queue dashboard error', message: err.message });
    }
});

// ─── Auth Event Log Query ──────────────────────────────────────────────────────
/**
 * GET /api/v1/admin/auth-logs
 * Returns last 100 authentication activity events.
 * Filterable by: ?event_type=login_failure&success=false&email_hash=<hash>
 * Protected by requireAuth + requireRole('admin') (applied via router.use above).
 * Raw IPs are never stored — they are hashed at emission time.
 */
router.get('/auth-logs', async (req, res) => {
    if (!ActivityEvent) {
        return res.status(503).json({ error: 'AUTH_LOG_UNAVAILABLE', message: 'ActivityEvent model not loaded' });
    }
    try {
        const page  = Math.max(1, parseInt(req.query.page  || '1',   10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '100', 10)));
        const skip  = (page - 1) * limit;

        const filter = {};
        if (req.query.event_type) { filter.eventType = req.query.event_type; }
        if (req.query.success !== undefined) { filter['metadata.success'] = req.query.success === 'true'; }
        if (req.query.email_hash) { filter['metadata.emailHash'] = req.query.email_hash; }

        const [events, total] = await Promise.all([
            ActivityEvent.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('eventType metadata createdAt userId -_id')
                .lean(),
            ActivityEvent.countDocuments(filter),
        ]);

        logger.info({ userId: req.user?.userId, filters: Object.keys(filter) }, 'Admin: auth-logs queried');
        return res.json({
            ok: true,
            data: events,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        logger.error({ err }, 'Admin: auth-logs query failed');
        return res.status(500).json({ error: 'QUERY_FAILED', message: err.message });
    }
});

export default router;
