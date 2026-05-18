/**
 * Cron worker — orchestrates repeatable background jobs using BullMQ.
 * 
 * Includes:
 * 1. Legal Data Refresh (daily)
 * 2. Token Cleanup (hourly)
 * 3. Log Cleanup (daily)
 * 4. Reconciliation (every 5 min)
 * 5. Sync Job (every 10 min)
 * 
 * Jobs are deduplicated globally via Redis, ensuring safe horizontal scaling.
 */

import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';
import { runLegalCron } from '../jobs/legalCron.js';
import { runCleanup } from '../jobs/tokenCleanup.js';
import { runReconciliationJob, runSyncJob } from '../services/reconciliation.js';

const QUEUE_NAME = 'cron_jobs';

function getRedisConnection() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) { return null; }
    return new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

// ── Job processor ─────────────────────────────────────────────────────────────
async function processCronJob(job) {
    const { name } = job;
    logger.info({ jobId: job.id, name }, 'Cron worker: processing job');

    try {
        switch (name) {
            case 'legal_refresh':
                await runLegalCron();
                break;
            case 'token_cleanup':
                await runCleanup();
                break;
            case 'reconciliation':
                await runReconciliationJob();
                break;
            case 'sync':
                await runSyncJob();
                break;
            case 'log_cleanup':
                try {
                    const { default: ClientErrorLog } = await import('../models/ClientErrorLog.js').catch(() => ({ default: null }));
                    if (ClientErrorLog) {
                        const cutoff = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));
                        const result = await ClientErrorLog.deleteMany({ createdAt: { $lt: cutoff } });
                        logger.info({ deleted: result.deletedCount }, 'Cron worker: cleaned up old ClientErrorLogs');
                    }
                } catch (err) {
                    logger.error({ err }, 'Cron worker: ClientErrorLog cleanup failed');
                }
                break;
            default:
                logger.warn({ name }, 'Cron worker: unknown job name');
        }
        return { success: true };
    } catch (err) {
        logger.error({ err, name }, 'Cron worker: job execution failed');
        throw err;
    }
}

// ── Worker ────────────────────────────────────────────────────────────────────
export function startCronWorker() {
    const connection = getRedisConnection();
    if (!connection) {
        logger.warn('Cron worker: REDIS_URL not set — cron jobs disabled');
        return null;
    }

    const worker = new Worker(QUEUE_NAME, processCronJob, {
        connection,
        concurrency: 1, // Run sequentially per worker instance to minimize load
    });

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, name: job?.name, err }, 'Cron job failed');
    });

    worker.on('error', (err) => {
        logger.error({ err }, 'Cron worker error');
    });

    logger.info('Cron worker started');
    
    // Ensure all repeatable jobs are added
    scheduleCronJobs(connection).catch(err => {
        logger.error({ err }, 'Failed to schedule cron jobs');
    });

    return worker;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
async function scheduleCronJobs(connection) {
    const cronQueue = new Queue(QUEUE_NAME, { connection });
    
    // Add repeatable jobs
    await cronQueue.add('legal_refresh', {}, {
        repeat: { pattern: '0 2 * * *' }, // 02:00 AM daily
        jobId: 'legal_refresh' // Idempotency key ensures exactly-once scheduling
    });

    await cronQueue.add('token_cleanup', {}, {
        repeat: { every: 60 * 60 * 1000 }, // every 1 hour
        jobId: 'token_cleanup'
    });

    await cronQueue.add('reconciliation', {}, {
        repeat: { every: 5 * 60 * 1000 }, // every 5 minutes
        jobId: 'reconciliation'
    });

    await cronQueue.add('sync', {}, {
        repeat: { every: 10 * 60 * 1000 }, // every 10 minutes
        jobId: 'sync'
    });

    await cronQueue.add('log_cleanup', {}, {
        repeat: { pattern: '0 0 * * *' }, // midnight daily
        jobId: 'log_cleanup'
    });
    
    logger.info('Cron jobs scheduled in BullMQ');
}
