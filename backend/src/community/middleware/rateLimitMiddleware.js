/**
 * rateLimitMiddleware.js
 *
 * Express middleware that uses our Redis sliding-window rate limiter.
 * Protects REST endpoints from denial of service and resource exhaustion.
 */

import { checkRateLimit } from '../socket/rateLimiter.js';
import logger from '../../utils/logger.js';

/**
 * Express middleware factory for sliding window rate limiting.
 *
 * @param {string} action - Action identifier (e.g. 'fileUpload', 'createTicket', 'submitFeedback')
 */
export function rateLimitRest(action) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(); // Skip if user is not authenticated yet
      }

      const allowed = await checkRateLimit(userId, action);
      if (!allowed) {
        logger.warn({ userId, action, ip: req.ip }, 'REST rate limit exceeded');
        return res.status(429).json({
          error: `Too many requests for ${action}. Please slow down and try again later.`
        });
      }

      next();
    } catch (err) {
      logger.error({ err, action }, 'REST rate limit middleware error — allowing');
      next(); // Fail open in case of Redis or unexpected issues
    }
  };
}

export default rateLimitRest;
