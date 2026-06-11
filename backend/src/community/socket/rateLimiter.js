/**
 * rateLimiter.js (Socket & REST)
 *
 * Per-user sliding window rate limiting using Redis sorted sets (ZSET).
 * Implements strict event throttling to protect resources from bot flooding and spam.
 */

import { redis } from '../../utils/redis.js';
import logger from '../../utils/logger.js';

// Define enterprise rate limits
const LIMITS = {
  // Websocket real-time events
  sendMessage:     { max: 30,  windowMs: 60 * 1000  }, // 30 msg/min
  typingStart:     { max: 60,  windowMs: 60 * 1000  }, // 60 typing events/min
  messageReaction: { max: 60,  windowMs: 60 * 1000  }, // 60 reactions/min
  joinConversation:{ max: 20,  windowMs: 60 * 1000  }, // 20 joins/min

  // REST and Media upload operations
  fileUpload:      { max: 5,   windowMs: 60 * 1000  }, // 5 uploads/min
  createTicket:    { max: 3,   windowMs: 60 * 1000  }, // 3 tickets/min
  submitFeedback:  { max: 5,   windowMs: 60 * 1000  }, // 5 ideas/min

  default:         { max: 100, windowMs: 60 * 1000  },
};

/**
 * Check and increment rate limit for a given key.
 *
 * @param {string} userId   - User ID or IP address
 * @param {string} action   - The action rate-limited (e.g. 'sendMessage', 'fileUpload')
 * @returns {Promise<boolean>} - true if allowed, false if limited
 */
export async function checkRateLimit(userId, action) {
  const limit = LIMITS[action] || LIMITS.default;
  const key = `rl:${action}:${userId}`;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  try {
    if (!redis.isAvailable()) {
      return true; // Fail open if Redis is offline
    }

    const raw = redis.raw();
    if (!raw) { return true; }

    const pipe = raw.pipeline();
    // Remove expired entries out of current window
    pipe.zremrangebyscore(key, 0, windowStart);
    // Add current entry with unique score member
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    // Count active items in the window
    pipe.zcard(key);
    // Set cache expiration time slightly longer than the window
    pipe.expire(key, Math.ceil(limit.windowMs / 1000) + 1);

    const results = await pipe.exec();
    const count = results?.[2]?.[1] ?? 0;

    if (count > limit.max) {
      logger.warn({ userId, action, count, max: limit.max }, 'Rate limit exceeded');
      return false;
    }

    return true;
  } catch (err) {
    logger.warn({ err, userId, action }, 'Rate limiter check error — allowing request');
    return true;
  }
}

/**
 * Socket compatibility wrapper for eventHandlers.js
 */
export async function checkSocketRateLimit(userId, event) {
  return checkRateLimit(userId, event);
}

/**
 * Emit rate limit error to socket and disconnect repeat offenders.
 */
export async function handleRateLimitViolation(socket, event) {
  socket.emit('error', {
    code: 'RATE_LIMIT_EXCEEDED',
    message: `Too many ${event} events. Please slow down.`,
    event,
  });

  const violationKey = `rl:violations:${socket.user?.userId}`;
  try {
    if (redis.isAvailable()) {
      const raw = redis.raw();
      const count = await raw?.incr(violationKey);
      if (count === 1) { await raw?.expire(violationKey, 60); }

      if (count >= 5) {
        logger.warn({ userId: socket.user?.userId, socketId: socket.id }, 'Socket disconnected for repeated rate limit violations');
        socket.disconnect(true);
      }
    }
  } catch (err) {
    logger.error({ err }, 'handleRateLimitViolation error');
  }
}

export default {
  checkRateLimit,
  checkSocketRateLimit,
  handleRateLimitViolation
};
