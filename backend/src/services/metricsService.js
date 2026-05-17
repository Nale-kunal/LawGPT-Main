/**
 * metricsService.js — Persistent Redis-backed payment metrics (spec #1)
 *
 * Uses Redis INCR/INCRBY for atomic counters that survive restarts.
 * Falls back to in-process counters if Redis is unavailable.
 *
 * Timeline events are stored in a Redis Sorted Set keyed by timestamp,
 * enabling time-range queries (24h, 7d, etc.).
 *
 * Exported:
 *   inc(metric, by?)        — increment counter
 *   dec(metric, by?)        — decrement counter
 *   getSnapshot(rangeMs?)   — returns current metrics snapshot
 *   resetMetrics()          — dev/test only
 */

import logger from '../utils/logger.js';

// ── Metric key list ───────────────────────────────────────────────────────────
const METRIC_KEYS = [
  'webhooks_received',
  'webhooks_processed',
  'webhooks_duplicate',
  'webhooks_rejected',
  'webhooks_error',
  'webhooks_late',
  'active_subscriptions',
  'payments_succeeded',
  'payments_failed',
  'refunds_issued',
  'refund_errors',
  'reconciliation_activations',
  'reconciliation_cancels',
  'security_alerts',
  'abuse_blocks',
  'settlement_mismatches',
];

const REDIS_PREFIX  = 'metrics:juriq:';
const TIMELINE_KEY  = 'metrics:juriq:timeline';

// ── In-process fallback (used if Redis unavailable) ───────────────────────────
const _fallback = Object.fromEntries(METRIC_KEYS.map(k => [k, 0]));

// ── Get Redis client (lazy import to avoid circular deps) ─────────────────────
let _redis = null;
async function _getRedis() {
  if (_redis) return _redis;
  try {
    const { redis } = await import('../utils/redis.js');
    if (redis && redis.status === 'ready') {
      _redis = redis;
      return _redis;
    }
  } catch {}
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// inc — increment a metric (Redis INCR or fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function inc(metric, by = 1) {
  if (!METRIC_KEYS.includes(metric)) return;

  // Always update fallback so getSnapshot() works if Redis is down
  _fallback[metric] = (_fallback[metric] || 0) + by;

  try {
    const redis = await _getRedis();
    if (redis) {
      await redis.incrby(`${REDIS_PREFIX}${metric}`, by);
      // Timeline event for time-range queries
      await redis.zadd(TIMELINE_KEY, Date.now(), JSON.stringify({ metric, by, ts: Date.now() }));
      // Keep timeline to last 10000 events
      await redis.zremrangebyrank(TIMELINE_KEY, 0, -10001);
    }
  } catch (err) {
    logger.warn({ err, metric }, 'metricsService.inc: Redis error — using fallback');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// dec — decrement a metric (floor 0)
// ─────────────────────────────────────────────────────────────────────────────
export async function dec(metric, by = 1) {
  if (!METRIC_KEYS.includes(metric)) return;
  _fallback[metric] = Math.max(0, (_fallback[metric] || 0) - by);

  try {
    const redis = await _getRedis();
    if (redis) {
      await redis.decrby(`${REDIS_PREFIX}${metric}`, by);
    }
  } catch (err) {
    logger.warn({ err, metric }, 'metricsService.dec: Redis error — using fallback');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getSnapshot — returns all counters + optional timeline events
// @param {number} rangeMs  — how far back to include timeline events (default 24h)
// ─────────────────────────────────────────────────────────────────────────────
export async function getSnapshot(rangeMs = 24 * 60 * 60 * 1000) {
  const counters = { ...Object.fromEntries(METRIC_KEYS.map(k => [k, _fallback[k] || 0])) };

  try {
    const redis = await _getRedis();
    if (redis) {
      // Fetch all counter values from Redis in one pipeline
      const pipeline = redis.pipeline();
      for (const key of METRIC_KEYS) pipeline.get(`${REDIS_PREFIX}${key}`);
      const results = await pipeline.exec();

      METRIC_KEYS.forEach((key, i) => {
        const val = results[i]?.[1];
        if (val !== null && val !== undefined) {
          counters[key] = parseInt(val, 10) || 0;
        }
      });

      // Timeline events for the requested range
      const since    = Date.now() - rangeMs;
      const timeline = await redis.zrangebyscore(TIMELINE_KEY, since, '+inf');
      counters._timeline = timeline.map(e => { try { return JSON.parse(e); } catch { return null; } }).filter(Boolean);
    }
  } catch (err) {
    logger.warn({ err }, 'metricsService.getSnapshot: Redis error — using fallback values');
  }

  return {
    ...counters,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMB:      Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    ts:            new Date().toISOString(),
    source:        _redis ? 'redis' : 'fallback',
  };
}

// Dev/test only — resets both Redis and in-process counters
export async function resetMetrics() {
  for (const k of METRIC_KEYS) _fallback[k] = 0;
  try {
    const redis = await _getRedis();
    if (redis) {
      const pipeline = redis.pipeline();
      for (const key of METRIC_KEYS) pipeline.del(`${REDIS_PREFIX}${key}`);
      pipeline.del(TIMELINE_KEY);
      await pipeline.exec();
    }
  } catch {}
}
