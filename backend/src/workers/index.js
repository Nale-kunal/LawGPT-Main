/**
 * Worker coordinator — starts all BullMQ workers in a separate process.
 *
 * Usage:
 *   node src/workers/index.js
 *
 * - Can run on a separate Dyno / Railway container
 * - API server runs independently
 * - All workers share the same Redis connection
 */

import dotenv from 'dotenv';
dotenv.config();

import logger from '../utils/logger.js';
import { startEmailWorker } from './emailWorker.js';
import { startCleanupWorker } from './cleanupWorker.js';
import { startAdminWorker } from './adminWorker.js';
import { startCronWorker } from './cronWorker.js';
import { startCommunityNotifWorker } from '../community/workers/communityNotificationWorker.js';
import { startModerationWorker } from '../community/workers/moderationWorker.js';
import { startMalwareWorker } from '../community/workers/malwareWorker.js';

if (!process.env.REDIS_URL) {
  logger.error('REDIS_URL is required to run workers. Exiting.');
  process.exit(1);
}

logger.info('Starting Juriq background workers...');

const emailWorker = startEmailWorker();
const cleanupWorker = startCleanupWorker();
const adminWorker = startAdminWorker();
const cronWorker = startCronWorker();
const communityNotifWorker = startCommunityNotifWorker();
const moderationWorker = startModerationWorker();
const malwareWorker = startMalwareWorker();

const workers = [
  emailWorker,
  cleanupWorker,
  adminWorker,
  cronWorker,
  communityNotifWorker,
  moderationWorker,
  malwareWorker,
].filter(Boolean);
logger.info({ count: workers.length }, 'Workers started');

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, 'Workers shutting down...');
  try {
    await Promise.allSettled(workers.map((w) => w?.close()));
  } catch (err) {
    logger.error({ err }, 'Error closing workers during shutdown');
  }
  logger.info('All workers closed');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Workers ARE allowed to exit on uncaughtException.
// Unlike the API server (which can recover per-request), a corrupted
// BullMQ worker state (bad job processor state, broken DB cursor, etc.)
// is genuinely unrecoverable — the job will be retried by BullMQ once
// the worker process restarts via the process manager.
process.on('uncaughtException', (err, origin) => {
  logger.error(
    { err, origin, stack: err?.stack },
    'Worker uncaughtException — shutting down worker process'
  );
  // Attempt graceful BullMQ close before exit so jobs are not left in processing state
  Promise.allSettled(workers.map((w) => w?.close()))
    .catch(() => {
      /* ignore close errors during crash */
    })
    .finally(() => process.exit(1));
});

// unhandledRejection from async job processors must also be caught
process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    {
      reason,
      stack: reason?.stack,
      promise: String(promise),
    },
    'Worker unhandledRejection — shutting down worker process'
  );
  Promise.allSettled(workers.map((w) => w?.close()))
    .catch(() => {
      /* ignore */
    })
    .finally(() => process.exit(1));
});
