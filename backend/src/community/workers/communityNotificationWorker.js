/**
 * communityNotificationWorker.js
 *
 * BullMQ worker for asynchronous community notification processing.
 * Follows the same pattern as emailWorker.js.
 */

import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../../utils/logger.js';

const QUEUE_NAME = 'community-notifications';

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('Community notification worker: REDIS_URL not set — queue disabled');
    return null;
  }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
  });
}

let notifQueue = null;

export function getCommunityNotifQueue() {
  if (notifQueue) { return notifQueue; }
  const connection = getRedisConnection();
  if (!connection) { return null; }

  notifQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts:         3,
      backoff:          { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 200 },
      removeOnFail:     { count: 500 },
    },
  });

  return notifQueue;
}

async function processNotifJob(job) {
  const { type, payload } = job.data;
  logger.info({ jobId: job.id, type }, 'Community notification worker: processing job');

  switch (type) {
    case 'new_message_notification': {
      const { notifyNewMessage } = await import('../services/communityNotificationService.js');
      await notifyNewMessage(payload);
      break;
    }
    case 'push_notification': {
      // Web push notification (Phase 2: integrate FCM/APNS here)
      logger.info({ jobId: job.id }, 'Push notification — Phase 2 integration point');
      break;
    }
    case 'email_digest': {
      // Email digest for offline users with unread messages
      const { queueEmail } = await import('../../services/emailService.js');
      await queueEmail({
        to:      payload.email,
        subject: `You have ${payload.unreadCount} unread messages on Juriq`,
        html:    `<p>Hi ${payload.name}, you have ${payload.unreadCount} new messages waiting in your Juriq community. <a href="${process.env.FRONTEND_URL}/dashboard/community">View messages</a></p>`,
        text:    `You have ${payload.unreadCount} new messages on Juriq.`,
      });
      break;
    }
    default:
      logger.warn({ type, jobId: job.id }, 'Unknown community notification job type');
  }
}

export function startCommunityNotifWorker() {
  const connection = getRedisConnection();
  if (!connection) { return null; }

  const worker = new Worker(QUEUE_NAME, processNotifJob, {
    connection,
    concurrency: 10,
    limiter: { max: 50, duration: 1000 },
  });

  worker.on('completed', job => {
    logger.info({ jobId: job.id, type: job.data.type }, 'Community notification job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, type: job?.data?.type, err }, 'Community notification job failed');
  });
  worker.on('error', err => {
    logger.error({ err }, 'Community notification worker error');
  });

  logger.info('Community notification worker started');
  return worker;
}
