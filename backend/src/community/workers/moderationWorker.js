/**
 * moderationWorker.js
 *
 * BullMQ worker for async content moderation analysis.
 * Scores messages for spam/abuse after delivery to avoid blocking real-time flow.
 */

import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../../utils/logger.js';

const QUEUE_NAME = 'community-moderation';

// Basic profanity/spam patterns (extend with a proper library in production)
const SPAM_PATTERNS = [
  /\b(buy now|click here|free money|make money fast|earn \$\d+)\b/gi,
  /https?:\/\/[^\s]+/g, // Links (flag for review, not auto-block)
  /(.)\1{10,}/,          // Excessive repetition (aaaaaaaaaa...)
];

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) { return null; }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
  });
}

let modQueue = null;

export function getModerationQueue() {
  if (modQueue) { return modQueue; }
  const connection = getRedisConnection();
  if (!connection) { return null; }

  modQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts:         2,
      backoff:          { type: 'fixed', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail:     { count: 500 },
    },
  });

  return modQueue;
}

async function processModerationJob(job) {
  const { type, payload } = job.data;

  if (type === 'analyze_message') {
    const { messageId, content, conversationId, senderId } = payload;
    if (!content || !messageId) { return; }

    let spamScore = 0;
    const flags = [];

    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        spamScore += 20;
        flags.push(pattern.source);
      }
    }

    // Very long messages (potential flood)
    if (content.length > 5000) { spamScore += 10; }

    // If spam detected, flag for admin review
    if (spamScore >= 40) {
      const CommunityMessage = (await import('../models/Message.js')).default;
      await CommunityMessage.findByIdAndUpdate(messageId, {
        $set: {
          isFlagged:   true,
          flagReason:  `Automated: spam score ${spamScore}. Patterns: ${flags.join(', ')}`,
        },
      });
      logger.warn({ messageId, senderId, spamScore }, 'Message auto-flagged for spam');

      // Update user's abuse score in main User model
      const User = (await import('../../models/User.js')).default;
      await User.findByIdAndUpdate(senderId, {
        $inc: { 'securityFlags.abuseScore': Math.min(spamScore / 10, 5) },
      });
    }

    logger.debug({ messageId, spamScore }, 'Moderation analysis complete');
  }
}

export function startModerationWorker() {
  const connection = getRedisConnection();
  if (!connection) { return null; }

  const worker = new Worker(QUEUE_NAME, processModerationJob, {
    connection,
    concurrency: 20,
  });

  worker.on('completed', job => {
    logger.debug({ jobId: job.id }, 'Moderation job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Moderation job failed');
  });
  worker.on('error', err => {
    logger.error({ err }, 'Moderation worker error');
  });

  logger.info('Moderation worker started');
  return worker;
}
