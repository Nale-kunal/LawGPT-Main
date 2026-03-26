/* eslint-env node */
/**
 * Token / session cleanup job.
 * Runs every hour via setInterval — no external cron dependency.
 *
 * Responsibilities:
 *  1. Purge ActivityEvent documents older than the configured TTL
 *     (falls back gracefully if model not available)
 *  2. Log a summary so the cleanup is visible in production logs
 *
 * Note: Rate-limit counters in Redis expire automatically via Redis TTL —
 * no manual cleanup needed there.
 */

import logger from '../utils/logger.js';

const ACTIVITY_EVENT_TTL_DAYS = parseInt(process.env.ACTIVITY_EVENT_TTL_DAYS || '90', 10);
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runCleanup() {
  const startedAt = Date.now();
  logger.info('Token cleanup job: starting');

  let purgedActivity = 0;

  try {
    // Dynamic import — avoids forcing a DB connection before MongoDB is ready
    const { default: ActivityEvent } = await import('../models/ActivityEvent.js').catch(() => ({ default: null }));

    if (ActivityEvent) {
      const cutoff = new Date(Date.now() - ACTIVITY_EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
      const result = await ActivityEvent.deleteMany({ createdAt: { $lt: cutoff } });
      purgedActivity = result.deletedCount || 0;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Token cleanup: ActivityEvent purge failed (non-fatal)');
  }

  const durationMs = Date.now() - startedAt;
  logger.info({ purgedActivity, durationMs }, 'Token cleanup job: complete');
}

/**
 * Start the hourly cleanup loop.
 * Call once from server bootstrap (after MongoDB is connected).
 */
export function startTokenCleanup() {
  // Run once immediately (non-blocking — don't await)
  runCleanup().catch(err => logger.warn({ err: err.message }, 'Token cleanup: initial run failed (non-fatal)'));

  // Then hourly
  const interval = setInterval(() => {
    runCleanup().catch(err => logger.warn({ err: err.message }, 'Token cleanup: scheduled run failed (non-fatal)'));
  }, CLEANUP_INTERVAL_MS);

  // Prevent the interval from keeping the process alive during test teardown
  if (interval?.unref) {
    interval.unref();
  }

  logger.info({ intervalHours: 1, ttlDays: ACTIVITY_EVENT_TTL_DAYS }, 'Token cleanup job: scheduled');
}
