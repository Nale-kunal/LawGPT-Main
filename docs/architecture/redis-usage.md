# Redis Usage

## Connection Strategy

Juriq uses `ioredis` with a **graceful in-memory fallback**. If `REDIS_URL` is not set, all Redis operations silently use an in-memory `Map`-based store, allowing the application to function in development without Redis.

File: `backend/src/utils/redis.js`

## Usage Patterns

| Purpose | Key Pattern | TTL | Notes |
|---------|-------------|-----|-------|
| Rate limiting | `rl:{limiter}:{identifier}` | Window-based | Via `rate-limit-redis` |
| IP escalation tracking | `rl_hits:{ip}` | 10 min | Tracks repeated rate limit violations |
| IP blocking | `block:{ip}` | 1–10 min | Progressive: 1min after 5 hits, 10min after 10 |
| Plan cache | `plan:{userId}` | Configurable | Caches subscription plan for fast middleware checks |
| Refund locks | `refund_lock:{paymentId}` | 60s | Prevents duplicate refund processing |
| BullMQ queues | `bull:{queueName}:*` | Job-dependent | Email, admin, cleanup job queues |

## Fallback Behavior

The `redis` export wraps every operation in try/catch and falls back to the in-memory `noop` store:

```javascript
export const redis = {
  get: async (key) => {
    if (!redisClient || !isConnected) return noop.get(key);
    try { return await redisClient.get(key); }
    catch { return noop.get(key); }
  },
  // ... same pattern for set, del, exists, expire, lpush, lrange, incr, ping
};
```

## Production Requirements

- `REDIS_URL` is required in production (startup validation warns if missing)
- Used by BullMQ workers (workers will not start without Redis)
- Used by `RedisStore` for persistent rate limiting across server restarts
- Used for refund idempotency locks

## Monitoring

- `redis.isAvailable()` — Returns true if connected
- `redis.ping()` — Returns "PONG" or "PONG (in-memory fallback)"
- Exposed via `/api/v1/health` endpoint
