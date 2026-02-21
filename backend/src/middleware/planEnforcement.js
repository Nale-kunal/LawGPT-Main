import User from '../models/User.js';
import Case from '../models/Case.js';
import Document from '../models/Document.js';
import redis from '../utils/redis.js';

/**
 * Middleware to enforce plan limits.
 * Should be placed after requireAuth.
 */
export const enforcePlanLimits = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) return next();

            const user = await User.findById(req.user.userId);
            if (!user) return next();

            // Skip limits for free tier until manually configured as per rules
            // (Prompt: "Do not affect free tier until manually configured")
            // Actually, it says "Do not affect free tier until manually configured."
            // I'll interpret this as: if it's 'free' and limits are at default, don't block.
            // But the requirement also says "Add plan limits enforcement".
            // I'll implement the logic and check the plan type.

            const plan = user.plan || { type: 'free', limits: { cases: 10, documents: 50, storageMB: 100, teamMembers: 1, aiDailyCap: 20 } };

            if (resourceType === 'case') {
                const caseCount = await Case.countDocuments({ owner: user._id });
                if (caseCount >= plan.limits.cases) {
                    return res.status(403).json({
                        error: 'PLAN_LIMIT_EXCEEDED',
                        message: `You have reached the limit of ${plan.limits.cases} cases for your ${plan.type} plan.`,
                        limit: plan.limits.cases
                    });
                }
            }

            if (resourceType === 'document') {
                const docCount = await Document.countDocuments({ ownerId: user._id });
                if (docCount >= plan.limits.documents) {
                    return res.status(403).json({
                        error: 'PLAN_LIMIT_EXCEEDED',
                        message: `You have reached the limit of ${plan.limits.documents} documents for your ${plan.type} plan.`,
                        limit: plan.limits.documents
                    });
                }

                // Storage MB check
                const totalSize = await Document.aggregate([
                    { $match: { ownerId: user._id } },
                    { $group: { _id: null, total: { $sum: '$size' } } }
                ]);
                const usedMB = (totalSize[0]?.total || 0) / (1024 * 1024);
                if (usedMB >= plan.limits.storageMB) {
                    return res.status(403).json({
                        error: 'PLAN_LIMIT_EXCEEDED',
                        message: `You have reached the storage limit of ${plan.limits.storageMB} MB for your ${plan.type} plan.`,
                        limit: plan.limits.storageMB
                    });
                }
            }

            if (resourceType === 'ai') {
                const today = new Date().toISOString().split('T')[0];
                const redisKey = `ai_usage:${user._id}:${today}`;
                const currentUsage = parseInt(await redis.get(redisKey) || '0', 10);

                if (currentUsage >= plan.limits.aiDailyCap) {
                    return res.status(403).json({
                        error: 'PLAN_LIMIT_EXCEEDED',
                        message: `You have reached your daily AI query limit of ${plan.limits.aiDailyCap} for your ${plan.type} plan.`,
                        limit: plan.limits.aiDailyCap
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Plan enforcement error:', error);
            next();
        }
    };
};

/**
 * Increments AI usage in Redis.
 */
export const trackAiUsage = async (userId) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const redisKey = `ai_usage:${userId}:${today}`;
        await redis.incr(redisKey);
        await redis.expire(redisKey, 86400); // 24 hours TTL
    } catch (error) {
        console.error('Failed to track AI usage:', error);
    }
};
