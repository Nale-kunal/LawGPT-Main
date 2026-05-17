# ADR-0003: Payment System

## Status: Accepted

## Context
Indian legal SaaS platform needs subscription billing integrated with an Indian payment gateway supporting recurring payments.

## Decision
Razorpay for subscription management. Webhook-driven state machine for subscription lifecycle. HMAC-verified webhooks. Redis-locked refund idempotency. Daily reconciliation cron for self-healing.

## Consequences
- Native INR support (no currency conversion fees)
- Webhook-driven: server state always eventually consistent with Razorpay
- HMAC prevents webhook spoofing
- Redis locks prevent duplicate refund processing
- Reconciliation cron catches missed webhooks
- Hot key rotation via SIGHUP avoids downtime during credential changes
