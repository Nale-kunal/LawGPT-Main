# Incident Debugging Guide

## Quick Triage

### 1. User Reports "Can't Login"
```
Check order:
1. Sentry → filter by "auth" tag → look for 401/500 errors
2. Railway logs → grep "auth" or "jwt" or "refresh"
3. MongoDB Atlas → check connection health
4. Redis → check if rate limiter is blocking (too many failed attempts)
```

**Common causes**:
- Redis down → rate limiter fails open (should degrade gracefully)
- JWT_SECRET rotated without restart → all tokens invalid
- Account locked after 5 failed attempts → check `AbuseSignalLog`

### 2. Payment Failed
```
Check order:
1. PaymentLog collection → filter by userId
2. Razorpay Dashboard → check order/payment status
3. Backend logs → grep razorpay_payment_id
4. Webhook logs → check if webhook was received and processed
```

**Common causes**:
- Razorpay key mismatch → webhook signature verification fails
- Duplicate webhook → idempotency check should prevent double-processing
- Network timeout → reconciliation cron should self-heal within 24h

### 3. Slow API Response
```
Check order:
1. MongoDB Atlas → Performance Advisor → slow queries
2. Backend logs → filter by response time > 1s
3. Redis → check memory usage and eviction rate
4. Container metrics → check CPU and memory
```

**Common causes**:
- Missing index → add compound index for the query pattern
- Large payload → implement pagination if missing
- Redis memory full → increase `maxmemory` or reduce TTLs

### 4. Worker Not Processing Jobs
```
Check order:
1. Redis → LLEN on BullMQ queue keys
2. Worker container → check if running
3. Worker logs → look for connection errors
4. REDIS_URL → verify connectivity
```

**Common causes**:
- Worker container crashed → restart policy should recover
- Redis OOM → clear old jobs, increase memory
- Network partition → Redis reconnect handler should recover

## Log Correlation
All requests include a `requestId` header. Use it to trace a single request across logs:
```bash
# Find all logs for a specific request
grep "requestId=abc123" railway-logs.txt
```

## Escalation Path
1. **L1**: Check Sentry dashboard, restart container if needed
2. **L2**: Check MongoDB Atlas, Redis, worker health
3. **L3**: Code-level debugging with request traces
