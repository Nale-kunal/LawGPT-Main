# Webhook Flow

## Razorpay Webhooks

### Endpoint
```
POST /api/v1/payment/webhook
```

### Security
- **No rate limiting** — Razorpay must always reach this endpoint
- **No CSRF** — Server-to-server communication
- **HMAC verification** — `X-Razorpay-Signature` header validated against `RAZORPAY_WEBHOOK_SECRET`

### Event Processing

```
Razorpay Event → POST /webhook
                     │
                     ▼
              ┌─ HMAC Verify ──┐
              │  Valid?         │
              ├─ Yes ──────────┤
              │                │
              ▼                ▼
         Process Event    403 Reject
              │
              ├─ subscription.activated → Activate user subscription
              ├─ subscription.charged   → Record payment, update billing period
              ├─ subscription.halted    → Mark subscription as halted
              ├─ subscription.cancelled → Cancel subscription, update plan to Free
              ├─ payment.authorized     → Log payment authorization
              ├─ payment.captured       → Update payment status to captured
              ├─ payment.failed         → Log failure, notify user
              └─ refund.processed       → Update RefundLog, adjust balance
```

### Idempotency

Each webhook event includes a unique event ID. The handler:
1. Checks if the event ID has already been processed
2. If duplicate → returns 200 (no-op)
3. If new → processes event, marks as handled
4. All state changes are wrapped in try/catch with audit logging

### Failure Handling

- If webhook processing fails, Razorpay will retry (exponential backoff)
- Failed events are logged with full payload for manual review
- Reconciliation cron (`reconciliation.js`) catches any missed events daily
