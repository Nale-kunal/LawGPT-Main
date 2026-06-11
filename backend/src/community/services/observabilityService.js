/**
 * observabilityService.js
 *
 * Enterprise observability and logging client.
 * Integrates Pino structured logs with Sentry captureException,
 * automatically enriching telemetry scopes with user contexts.
 */

import * as Sentry from '@sentry/node';
import logger from '../../utils/logger.js';

// Initialize Sentry if DSN is set in the environment
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // Sample 10% of operations
  });
  logger.info('Sentry telemetry tracking initialized for community services');
} else {
  logger.warn('SENTRY_DSN not set — running without active Sentry reporting');
}

export const observability = {
  debug: (meta, msg) => {
    logger.debug(meta, msg);
  },

  info: (meta, msg) => {
    logger.info(meta, msg);
  },

  warn: (meta, msg) => {
    logger.warn(meta, msg);
  },

  /**
   * Log error and capture in Sentry.
   *
   * @param {Error|object} err - Error object
   * @param {string} msg       - Log message descriptive context
   * @param {object} meta      - Optional metadata parameters (userId, conversationId)
   */
  error: (err, msg = 'An unexpected error occurred', meta = {}) => {
    logger.error({ err: err?.message || err, ...meta }, msg);

    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (meta.userId) {
          scope.setUser({ id: String(meta.userId) });
        }
        if (meta.conversationId) {
          scope.setTag('conversationId', String(meta.conversationId));
        }
        if (meta.action) {
          scope.setTag('action', String(meta.action));
        }
        scope.setExtra('metadata', meta);
        
        Sentry.captureException(err instanceof Error ? err : new Error(msg));
      });
    }
  }
};

export default observability;
