# Payment Architecture

## Provider: Razorpay

Juriq integrates with Razorpay for subscription-based billing, one-time payments, refunds, and settlement tracking.

## Key Components

| File | Purpose |
|------|---------|
| `src/routes/payment.js` | Payment route handlers + webhook endpoint |
| `src/routes/subscription.js` | Subscription management routes |
| `src/routes/adminPayment.js` | Admin payment operations (refunds, logs) |
| `src/services/reconciliation.js` | Daily reconciliation cron |
| `src/services/settlementService.js` | Settlement tracking |
| `src/models/Payment.js` | Payment records |
| `src/models/Subscription.js` | Subscription state |
| `src/models/PaymentInvoice.js` | Invoice records |
| `src/models/RefundLog.js` | Refund audit trail |
| `src/models/SettlementLog.js` | Settlement tracking |
| `src/models/CouponUsageLog.js` | Coupon usage audit |

## Webhook Security

1. All webhooks arrive at `POST /api/v1/payment/webhook`
2. Exempt from rate limiting (Razorpay must always reach it)
3. Exempt from CSRF (server-to-server)
4. `X-Razorpay-Signature` header is HMAC-SHA256 verified using `RAZORPAY_WEBHOOK_SECRET`
5. Events are processed idempotently (duplicate events are safely ignored)

## Refund Safety

- Refund operations acquire a Redis lock (`refund_lock:{paymentId}`)
- Lock TTL: 60 seconds
- Prevents duplicate refund processing from concurrent webhook/admin requests
- Lock is released after operation completes

## Key Rotation

- Razorpay credentials can be hot-reloaded via `SIGHUP` signal
- No server restart required
- Process: `kill -HUP <pid>` → `payment.js._resetRazorpayClient()` → new keys active

## Reconciliation

`reconciliation.js` runs periodic jobs to:
- Detect payment status mismatches between Razorpay and local DB
- Sync settlement data from Razorpay Settlements API
- Log discrepancies for manual review
- Auto-heal recoverable mismatches

## Rate Limiting

- Payment endpoints: 20 requests per 15 minutes per IP
- Webhook endpoint: exempt (HMAC is the guard)
- Admin payment endpoints: 50 requests per hour per IP
