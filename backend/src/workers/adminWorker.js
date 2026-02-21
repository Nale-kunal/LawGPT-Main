import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import Case from '../models/Case.js';
import Document from '../models/Document.js';
import UserUsageSnapshot from '../models/UserUsageSnapshot.js';
import AnalyticsDaily from '../models/AnalyticsDaily.js';
import ActivityEvent from '../models/ActivityEvent.js';
import AbuseSignalLog from '../models/AbuseSignalLog.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import redis from '../utils/redis.js';

const QUEUE_NAME = 'admin-tasks';

function getRedisConnection() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return null;
    return new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

async function aggregateUsage() {
    logger.info('Starting 5m usage aggregation...');
    const users = await User.find({ 'accountStatus.status': { $ne: 'deleted' } });

    for (const user of users) {
        const caseCount = await Case.countDocuments({ owner: user._id });
        const docs = await Document.aggregate([
            { $match: { ownerId: user._id } },
            { $group: { _id: null, count: { $sum: 1 }, size: { $sum: '$size' } } }
        ]);

        const today = new Date().toISOString().split('T')[0];
        const aiQueries = parseInt(await redis.get(`ai_usage:${user._id}:${today}`) || '0', 10);

        await UserUsageSnapshot.create({
            userId: user._id,
            metrics: {
                caseCount,
                documentCount: docs[0]?.count || 0,
                storageUsedMB: (docs[0]?.size || 0) / (1024 * 1024),
                aiQueriesUsedToday: aiQueries
            }
        });
    }
    logger.info(`Aggregated usage for ${users.length} users`);
}

async function aggregateDailyAnalytics() {
    logger.info('Starting hourly daily analytics update...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [caseCount, docCount, eventStats] = await Promise.all([
        Case.countDocuments({ createdAt: { $gte: today } }),
        Document.countDocuments({ createdAt: { $gte: today } }),
        ActivityEvent.aggregate([
            { $match: { timestamp: { $gte: today } } },
            { $group: { _id: '$eventType', count: { $sum: 1 }, users: { $addToSet: '$userId' } } }
        ])
    ]);

    const dau = new Set();
    let totalAi = 0;
    eventStats.forEach(stat => {
        stat.users.forEach(u => dau.add(u.toString()));
        if (stat._id === 'ai_query') totalAi = stat.count;
    });

    await AnalyticsDaily.findOneAndUpdate(
        { date: today },
        {
            $set: {
                'metrics.dau': dau.size,
                'metrics.totalCasesCreated': caseCount,
                'metrics.totalDocumentsUploaded': docCount,
                'metrics.totalAiQueries': totalAi
            }
        },
        { upsert: true, new: true }
    );
    logger.info('Daily analytics updated');
}

async function runCleanup() {
    logger.info('Starting 24h cleanup...');
    const now = new Date();

    const results = await Promise.all([
        ActivityEvent.deleteMany({ expiresAt: { $lt: now } }),
        AbuseSignalLog.deleteMany({ timestamp: { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) } }),
        AdminAuditLog.deleteMany({ expiresAt: { $lt: now } })
    ]);

    logger.info({
        activityEvents: results[0].deletedCount,
        abuseLogs: results[1].deletedCount,
        adminLogs: results[2].deletedCount
    }, 'Cleanup complete');
}

async function processAdminJob(job) {
    const { type } = job.data;
    try {
        if (type === 'aggregate-usage') await aggregateUsage();
        else if (type === 'aggregate-daily') await aggregateDailyAnalytics();
        else if (type === 'cleanup') await runCleanup();
    } catch (error) {
        logger.error({ type, error }, 'Admin job failed');
        throw error;
    }
}

export function startAdminWorker() {
    const connection = getRedisConnection();
    if (!connection) return null;

    const worker = new Worker(QUEUE_NAME, processAdminJob, { connection });

    // Schedule repeatable jobs
    const adminQueue = new Queue(QUEUE_NAME, { connection });

    adminQueue.add('aggregate-usage', { type: 'aggregate-usage' }, {
        repeat: { every: 5 * 60 * 1000 } // every 5 mins
    });

    adminQueue.add('aggregate-daily', { type: 'aggregate-daily' }, {
        repeat: { every: 60 * 60 * 1000 } // every hour
    });

    adminQueue.add('cleanup', { type: 'cleanup' }, {
        repeat: { cron: '0 2 * * *' } // every day at 2 AM
    });

    logger.info('Admin background worker started and jobs scheduled');
    return worker;
}
