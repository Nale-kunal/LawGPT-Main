import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import AbuseSignalLog from '../models/AbuseSignalLog.js';
import UserUsageSnapshot from '../models/UserUsageSnapshot.js';
import { blacklistToken } from '../services/tokenService.js';
import { updateDocument, MODELS } from '../services/mongodb.js';

const router = express.Router();

// --- Security Middleware ---

// --- Security Middleware ---

const internalSecretAuth = (req, res, next) => {
    const defaultSecret = 'c7e5a6f912b3d8c4e5a6f912b3d8c4e5a6f912b3d8c4e5a6f912b3d8c4e5a6f9'; // Fallback for dev only
    const secret = process.env.ADMIN_INTERNAL_SECRET || defaultSecret;
    const provided = req.headers['x-admin-internal-secret'];

    if (!provided || provided !== secret) {
        return res.status(403).json({ error: 'Invalid internal admin secret' });
    }

    next();
};

const internalSourceCheck = (req, res, next) => {
    const source = req.headers['x-admin-source'];
    if (source !== 'admin-control-plane') {
        return res.status(403).json({ error: 'Unrecognized admin source' });
    }
    next();
};

// Use the new internal secret architecture
router.use(internalSecretAuth, internalSourceCheck);

// --- Endpoints ---

// Helper for logging admin actions
const logAdminAction = async (adminId, action, targetUserId, details = {}, req) => {
    await AdminAuditLog.create({
        adminId,
        action,
        targetUserId,
        details,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });
};

router.post('/suspend-user', async (req, res) => {
    const { userId, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.accountStatus.isSuspended = true;
    user.accountStatus.suspensionReason = reason;
    await user.save();

    await logAdminAction(null, 'user_suspend', userId, { reason }, req);
    res.json({ success: true, message: 'User suspended' });
});

router.post('/unsuspend-user', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.accountStatus.isSuspended = false;
    user.securityFlags.abuseScore = 0; // Reset abuse score on manual unsuspend
    await user.save();

    await logAdminAction(null, 'user_unsuspend', userId, {}, req);
    res.json({ success: true, message: 'User unsuspended' });
});

router.post('/upgrade-plan', async (req, res) => {
    const { userId, planType, limits } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.plan.type = planType;
    if (limits) user.plan.limits = { ...user.plan.limits, ...limits };
    await user.save();

    await logAdminAction(null, 'plan_upgrade', userId, { planType, limits }, req);
    res.json({ success: true, plan: user.plan });
});

router.post('/reset-password', async (req, res) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    try {
        const crypto = await import('crypto');
        const mailer = await import('../utils/mailer.js');
        const { default: PasswordReset } = await import('../models/PasswordReset.js');

        const resetToken = crypto.default.randomBytes(32).toString('hex');
        const tokenHash = crypto.default.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await PasswordReset.create({
            userId: user._id,
            email: user.email,
            tokenHash,
            expiresAt
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;
        await mailer.sendPasswordResetEmail({ to: user.email, resetUrl });

        await logAdminAction(null, 'password_reset', userId, {}, req);
        res.json({ success: true, message: 'Password reset email sent' });
    } catch (err) {
        console.error('Failed to trigger reset email from admin:', err);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

router.post('/revoke-all-sessions', async (req, res) => {
    const { userId } = req.body;
    // This would typically involve blacklisting all tokens for this user 
    // or incrementing a session version on the user model.
    // For now, we'll mark this as successful if the user exists.
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logAdminAction(null, 'sessions_revoke', userId, {}, req);
    res.json({ success: true, message: 'All sessions revoked (mock)' });
});

router.get('/get-user-metadata', async (req, res) => {
    const { userId } = req.query;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

router.get('/get-user-usage', async (req, res) => {
    const { userId } = req.query;
    const usage = await UserUsageSnapshot.find({ userId }).sort({ snapshotDate: -1 }).limit(30);
    res.json(usage);
});

router.get('/get-user-abuse-log', async (req, res) => {
    const { userId } = req.query;
    const logs = await AbuseSignalLog.find({ userId }).sort({ timestamp: -1 }).limit(50);
    res.json(logs);
});

export default router;
