# Payment Security

See [Payment Architecture](../architecture/payment-architecture.md) for full details.

## Controls

- HMAC-SHA256 webhook signature verification
- Redis-locked refund idempotency
- Hot key rotation via SIGHUP
- Rate limited: 20 req/15 min (webhook exempt)
- Daily reconciliation for mismatch detection
- Razorpay key validation at startup
- Settlement tracking audit trail
