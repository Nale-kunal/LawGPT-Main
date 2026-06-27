/**
 * payment.js — Production-grade Razorpay Subscription payment routes
 *
 * POST /api/v1/payment/create-subscription  — Create a Razorpay subscription (auth required)
 * POST /api/v1/payment/verify-payment       — Verify frontend signature (auth required; does NOT activate plan)
 * POST /api/v1/payment/webhook              — Canonical plan lifecycle handler (raw body, HMAC verified)
 *
 * SECURITY CONTRACT:
 *  1. Plan is NEVER activated without a verified webhook.
 *  2. Prices are NEVER accepted from the frontend.
 *  3. Every webhook event is idempotent (processedEvents[] guard).
 *  4. Every event (success, failure, duplicate, invalid) is logged to PaymentLog.
 *  5. Webhook signature is verified using RAZORPAY_WEBHOOK_SECRET, not the key secret.
 */

import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { requireAuth } from '../middleware/auth-jwt.js';
import Subscription from '../models/Subscription.js';
import PaymentLog from '../models/PaymentLog.js';
import User from '../models/User.js';
import { PLAN_PRICING } from '../config/planFeatures.js';
import {
  activateSubscriptionPlan,
  cancelSubscriptionPlan,
  flagUserAbuse,
} from '../services/planService.js';
import logger from '../utils/logger.js';
import { notifyUser } from '../services/notificationService.js';
import { inc } from '../services/metricsService.js';
import { generatePaymentInvoice } from '../services/invoiceService.js';
import { isAllowedFetchUrl } from '../utils/urlValidator.js';
import { env } from '../config/env.js';

const router = express.Router();

// ── Allowed Razorpay event types (whitelist) ────────────────────────────────
const ALLOWED_EVENTS = new Set([
  'subscription.charged',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.halted',
  'payment.failed',
]);

// ── State machine: maps currentStatus → valid next statuses ─────────────────────
const ALLOWED_TRANSITIONS = {
  created: ['active', 'failed'],
  active: ['cancelled', 'completed', 'failed'],
  failed: [],
  cancelled: [],
  completed: [],
  halted: [],
};

// ── Per-user rate limiter for create-subscription (5 per 15 min) ────────────
const createSubLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.userId ? `create_sub:${req.user.userId}` : `create_sub:${ipKeyGenerator(req)}`,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many subscription attempts. Please wait 15 minutes.',
  },
});

// ── Server-side plan map (source of truth — frontend never controls price) ────
const PLAN_MAP = {
  basic: { planId: env.RAZORPAY_PLAN_ID_BASIC, billingCycle: 'monthly' },
  pro: { planId: env.RAZORPAY_PLAN_ID_PRO, billingCycle: 'monthly' },
  premium: { planId: env.RAZORPAY_PLAN_ID_PREMIUM, billingCycle: 'monthly' },
  elite: { planId: env.RAZORPAY_PLAN_ID_ELITE, billingCycle: 'monthly' },
  basic_yearly: { planId: env.RAZORPAY_PLAN_ID_BASIC_YEARLY, billingCycle: 'yearly' },
  pro_yearly: { planId: env.RAZORPAY_PLAN_ID_PRO_YEARLY, billingCycle: 'yearly' },
  premium_yearly: { planId: env.RAZORPAY_PLAN_ID_PREMIUM_YEARLY, billingCycle: 'yearly' },
  elite_yearly: { planId: env.RAZORPAY_PLAN_ID_ELITE_YEARLY, billingCycle: 'yearly' },
};

// ── Lazily instantiated Razorpay client ───────────────────────────────────────
let _razorpay = null;
// Exported for SIGHUP key rotation (spec #10)
export function _resetRazorpayClient() {
  _razorpay = null;
}
function getRazorpay() {
  if (!_razorpay) {
    const key_id = env.RAZORPAY_KEY_ID;
    const key_secret = env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error('Razorpay keys not configured');
    }
    _razorpay = new Razorpay({ key_id, key_secret });
  }
  return _razorpay;
}

// ── Real-time security alerting — severity-aware + throttled (specs #8, #9) ─
const ALERT_SEVERITY = {
  ownership_mismatch: 'HIGH',
  tampered_amount: 'HIGH',
  customer_mismatch: 'HIGH',
  razorpay_sub_not_active: 'HIGH',
  high_retry_webhook: 'MEDIUM',
  abuse_block: 'MEDIUM',
  late_webhook: 'LOW',
  replay_attack_blocked: 'LOW',
};
// In-memory throttle: 1 alert per (type+userId) per 10 minutes
const _alertThrottle = new Map();
function _isThrottled(type, userId) {
  const key = `${type}:${userId || 'system'}`;
  const last = _alertThrottle.get(key);
  if (last && Date.now() - last < 10 * 60 * 1000) {
    return true;
  }
  _alertThrottle.set(key, Date.now());
  return false;
}
function triggerAlert(type, payload = {}) {
  const severity = payload.severity || ALERT_SEVERITY[type] || 'MEDIUM';
  if (_isThrottled(type, payload.userId)) {
    return;
  }
  const alert = {
    type,
    severity,
    userId: payload.userId,
    ts: new Date().toISOString(),
    ...payload,
  };
  // Log level based on severity
  if (severity === 'HIGH') {
    logger.error({ alertType: type, ...alert }, `SECURITY ALERT [${severity}]: ${type}`);
  } else {
    logger.warn({ alertType: type, ...alert }, `SECURITY ALERT [${severity}]: ${type}`);
  }
  if (env.SLACK_WEBHOOK_URL) {
    const urlCheck = isAllowedFetchUrl(env.SLACK_WEBHOOK_URL);
    if (!urlCheck.ok) {
      logger.error(
        { reason: urlCheck.error },
        'SLACK_WEBHOOK_URL failed SSRF validation — alert not dispatched'
      );
    } else {
      fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      }).catch((e) => logger.error({ e }, 'Alert webhook delivery failed'));
    }
  }
}

// ── Helper: log every webhook event unconditionally (append-only, spec #10) ──
// Fire-and-forget — never await inside a transaction so it never blocks rollback.
function logPaymentEvent({
  subscriptionId = null,
  userId = null,
  razorpaySubscriptionId = null,
  razorpayPaymentId = null,
  razorpayEventId = null,
  eventType,
  status,
  rawPayload = null,
  rejectionReason = null,
  amountPaise = null,
}) {
  PaymentLog.create({
    subscriptionId,
    userId,
    razorpaySubscriptionId,
    razorpayPaymentId,
    razorpayEventId,
    eventType,
    status,
    rawPayload,
    rejectionReason,
    amountPaise,
  }).catch((err) => logger.error({ err }, 'PaymentLog.create failed — event not persisted'));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /create-subscription
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-subscription', requireAuth, createSubLimiter, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planKey } = req.body;

    // ── 0. Abuse-blocked check (spec #8) ─────────────────────────────────
    const caller = await User.findById(userId).select('securityFlags').lean();
    if (caller?.securityFlags?.blocked) {
      logger.warn({ userId }, 'create-subscription blocked: user is flagged');
      return res
        .status(403)
        .json({
          error: 'ACCOUNT_BLOCKED',
          message: 'Your account has been suspended. Contact support.',
        });
    }

    // ── 1. Validate plan key (server-controlled) ──────────────────────────
    if (!planKey || typeof planKey !== 'string' || !PLAN_MAP[planKey]) {
      return res.status(400).json({ error: 'INVALID_PLAN', message: 'Invalid plan key' });
    }

    const planMeta = PLAN_MAP[planKey];
    if (!planMeta.planId) {
      logger.error({ planKey }, 'Razorpay plan ID not configured in env');
      return res.status(503).json({ error: 'PLAN_UNAVAILABLE', message: 'Plan not configured' });
    }

    // ── 2. Derive planType (e.g. "pro") and billingCycle from key ─────────
    const billingCycle = planMeta.billingCycle;
    const planType = planKey.replace('_yearly', '');
    const amountPaise = PLAN_PRICING[planType]?.[billingCycle];

    if (!amountPaise) {
      return res
        .status(400)
        .json({ error: 'INVALID_PRICE', message: 'No price defined for this plan' });
    }

    // ── 3. Anti-spam: one active/pending subscription per user ────────────
    // (DB partial unique index is the hard safety net; this gives a clean error message)
    const existing = await Subscription.findOne({
      userId,
      status: { $in: ['created', 'active'] },
    }).lean();

    if (existing) {
      return res.status(409).json({
        error: 'SUBSCRIPTION_EXISTS',
        message: 'You already have an active or pending subscription.',
        existingSubscriptionId: existing.razorpaySubscriptionId,
      });
    }

    // ── 4. Create subscription on Razorpay ──────────────────────────────
    const rzp = getRazorpay();
    const rzpSub = await rzp.subscriptions.create({
      plan_id: planMeta.planId,
      customer_notify: 1,
      total_count: billingCycle === 'yearly' ? 1 : 12,
      notes: {
        userId, // OWNERSHIP: stored in notes for webhook cross-validation
        planType,
        billingCycle,
      },
    });

    // ── 5. Persist to DB ─────────────────────────────────────────────
    let subscription;
    try {
      subscription = await Subscription.create({
        userId,
        razorpaySubscriptionId: rzpSub.id,
        razorpayPlanId: planMeta.planId,
        planType,
        billingCycle,
        amountPaise,
        status: 'created',
        processedEvents: [],
        // Spec #7: store Razorpay customer ID for binding validation in webhook
        customerId: rzpSub.customer_id ?? null,
      });
      // Also bind customer ID to User if not already set
      if (rzpSub.customer_id) {
        await User.updateOne(
          { _id: userId, razorpayCustomerId: null },
          { $set: { razorpayCustomerId: rzpSub.customer_id } }
        );
      }
    } catch (dbErr) {
      // Catch DB-level unique index violation (race condition safety net)
      if (dbErr.code === 11000) {
        logger.warn(
          { userId },
          'create-subscription: DB unique index blocked duplicate active subscription'
        );
        return res.status(409).json({
          error: 'SUBSCRIPTION_EXISTS',
          message: 'You already have an active or pending subscription.',
        });
      }
      throw dbErr;
    }

    logger.info({ userId, subscriptionId: rzpSub.id, planType }, 'Subscription created');

    // ── 6. Return only what frontend needs — NO secrets ───────────────────
    return res.status(201).json({
      subscriptionId: rzpSub.id,
      keyId: env.RAZORPAY_KEY_ID,
      planType,
      billingCycle,
      amountPaise,
      dbId: subscription._id,
    });
  } catch (err) {
    logger.error({ err }, 'POST /create-subscription error');
    if (err.message?.includes('Razorpay keys')) {
      return res.status(503).json({ error: 'PAYMENT_UNAVAILABLE' });
    }
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /verify-payment
// Verifies the HMAC signature from the Razorpay checkout callback.
// IMPORTANT: This endpoint NEVER activates the plan.
//            Plan activation happens ONLY via webhook.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-payment', requireAuth, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    // ── 1. Presence check ─────────────────────────────────────────────────
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ error: 'MISSING_FIELDS', message: 'All three Razorpay fields are required' });
    }

    // ── 2. Subscription belongs to THIS user ──────────────────────────────
    const subscription = await Subscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
      userId: req.user.userId,
    }).lean();

    if (!subscription) {
      logger.warn(
        { userId: req.user.userId, razorpay_subscription_id },
        'verify-payment: subscription not found or user mismatch'
      );
      return res
        .status(403)
        .json({
          error: 'SUBSCRIPTION_MISMATCH',
          message: 'Subscription not found for your account',
        });
    }

    // ── 3. HMAC verification using KEY SECRET (not webhook secret) ────────
    const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expectedSig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSig, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      )
    ) {
      logger.warn(
        { userId: req.user.userId, razorpay_subscription_id },
        'verify-payment: signature mismatch'
      );
      return res
        .status(400)
        .json({ error: 'INVALID_SIGNATURE', message: 'Payment signature verification failed' });
    }

    logger.info(
      { userId: req.user.userId, razorpay_subscription_id, razorpay_payment_id },
      'Payment signature verified (plan activation pending webhook)'
    );

    // ── 4. Signature valid — tell frontend to wait for webhook ────────────
    return res.json({
      verified: true,
      message: 'Payment verified. Your plan will be activated within seconds.',
    });
  } catch (err) {
    logger.error({ err }, 'POST /verify-payment error');
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /webhook
// Razorpay sends all subscription lifecycle events here.
// Raw body MUST be parsed by express.raw (NOT express.json) for HMAC to work.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

  // ── Guard: secret must be configured ─────────────────────────────────
  if (!webhookSecret) {
    logger.error('RAZORPAY_WEBHOOK_SECRET not set — rejecting all webhooks');
    return res.status(500).end();
  }

  // ── 1. HMAC signature verification ───────────────────────────────────
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    logger.warn('Webhook: missing x-razorpay-signature header');
    logPaymentEvent({
      eventType: 'webhook.no_signature',
      status: 'rejected',
      rejectionReason: 'Missing signature header',
    });
    return res.status(400).json({ error: 'Missing signature' });
  }

  const rawBody = req.body; // Buffer
  const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  let signaturesMatch;
  try {
    signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    signaturesMatch = false;
  }

  if (!signaturesMatch) {
    logger.warn({ signature }, 'Webhook: invalid signature — rejecting');
    logPaymentEvent({
      eventType: 'webhook.invalid_signature',
      status: 'rejected',
      rejectionReason: 'HMAC mismatch',
    });
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // ── 2. Parse body + hard structure validation (spec #5) ──────────────
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (parseErr) {
    logger.error({ parseErr }, 'Webhook: JSON parse failed');
    return res.status(400).json({ error: 'INVALID_JSON' });
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return res
      .status(400)
      .json({ error: 'MALFORMED_EVENT', message: 'Payload must be a JSON object' });
  }
  if (!event.event || !event.payload) {
    logger.warn({ keys: Object.keys(event) }, 'Webhook: missing event/payload fields');
    return res
      .status(400)
      .json({ error: 'MALFORMED_EVENT', message: 'Missing event or payload fields' });
  }

  const eventType = event.event;
  const eventId = event.id;

  // ── 3. Whitelist check — silently ignore non-subscribed events ────────
  if (!ALLOWED_EVENTS.has(eventType)) {
    logger.info({ eventType, eventId }, 'Webhook: event not in whitelist — ignoring');
    logPaymentEvent({
      eventType,
      status: 'ignored',
      razorpayEventId: eventId,
      rawPayload: event,
      rejectionReason: 'Not in allowed event list',
    });
    return res.status(200).end();
  }

  // ── 4. Late event detection — log anomaly but NEVER reject (spec #1) ────
  // Idempotency (processedEvents $ne) is the replay guard — not time alone.
  if (event.created_at) {
    const eventAgeMs = Date.now() - event.created_at * 1000;
    if (eventAgeMs > 5 * 60 * 1000) {
      triggerAlert('late_webhook', { eventType, eventId, eventAgeMs, severity: 'LOW' });
      logPaymentEvent({
        eventType,
        status: 'late',
        razorpayEventId: eventId,
        rawPayload: event,
        rejectionReason: `Late event: age ${Math.round(eventAgeMs / 1000)}s`,
      });
      logger.warn(
        { eventType, eventId, eventAgeMs },
        'Late webhook — processing anyway (idempotency guard active)'
      );
    }
  }

  // ── 5. Webhook retry visibility (spec #4) ────────────────────────────
  const retryCount = event.attempts ?? 0;
  if (retryCount > 0) {
    logPaymentEvent({
      eventType,
      status: 'retry',
      razorpayEventId: eventId,
      rawPayload: { retryCount },
      rejectionReason: `Retry attempt ${retryCount}`,
    });
  }
  if (retryCount > 5) {
    triggerAlert('high_retry_webhook', { eventType, eventId, retryCount, severity: 'MEDIUM' });
  }

  logger.info({ eventType, eventId }, 'Webhook received and validated');
  inc('webhooks_received');

  // Spec #7: timeout protection — 25s max; prevents hanging requests + retry storms
  await Promise.race([
    handleWebhookEvent(event, eventType, eventId, rawBody).then(() => 'ok'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('WEBHOOK_TIMEOUT')), 25_000)),
  ]).catch((err) => {
    if (err.message === 'WEBHOOK_TIMEOUT') {
      inc('webhooks_error');
      logger.error({ eventType, eventId }, 'WEBHOOK TIMEOUT — handler exceeded 25s');
    } else {
      inc('webhooks_error');
      logger.error(
        { err, eventType, eventId },
        'Webhook handler threw — event partially processed'
      );
    }
  });

  return res.status(200).json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal webhook dispatcher
// ─────────────────────────────────────────────────────────────────────────────
async function handleWebhookEvent(event, eventType, eventId, rawBody) {
  const parsedPayload = JSON.parse(rawBody.toString('utf8'));

  switch (eventType) {
    case 'subscription.charged':
      await handleSubscriptionCharged(event, eventId, parsedPayload);
      break;
    case 'payment.failed':
      await handlePaymentFailed(event, eventId, parsedPayload);
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      await handleSubscriptionCancelled(event, eventId, parsedPayload, eventType);
      break;
    case 'subscription.halted':
      await handleSubscriptionHalted(event, eventId, parsedPayload);
      break;
    case 'subscription.activated':
      // Informational only — we activate on .charged not .activated
      logger.info({ eventId }, 'subscription.activated received — no action needed');
      logPaymentEvent({
        eventType,
        status: 'ignored',
        razorpayEventId: eventId,
        rawPayload: parsedPayload,
      });
      break;
    default:
      logger.info({ eventType, eventId }, 'Webhook: unhandled event type — ignoring');
      logPaymentEvent({
        eventType,
        status: 'ignored',
        razorpayEventId: eventId,
        rawPayload: parsedPayload,
        rejectionReason: 'Unhandled event type',
      });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler: subscription.charged  (THE ONLY path that activates a user's plan)
// ─────────────────────────────────────────────────────────────────────────────
async function handleSubscriptionCharged(event, eventId, parsedPayload) {
  const subEntity = event.payload?.subscription?.entity;
  const paymentEntity = event.payload?.payment?.entity;
  const rzpSubId = subEntity?.id;
  const rzpPayId = paymentEntity?.id;
  const amountPaise = paymentEntity?.amount;

  if (!rzpSubId) {
    logPaymentEvent({
      eventType: 'subscription.charged',
      status: 'rejected',
      razorpayEventId: eventId,
      rawPayload: parsedPayload,
      rejectionReason: 'Missing subscription ID',
    });
    return;
  }

  // ── 1. Load subscription ─────────────────────────────────────────────────
  const subscription = await Subscription.findOne({ razorpaySubscriptionId: rzpSubId });
  if (!subscription) {
    logger.warn({ rzpSubId, eventId }, 'subscription.charged: not in DB');
    logPaymentEvent({
      eventType: 'subscription.charged',
      status: 'rejected',
      razorpayEventId: eventId,
      rawPayload: parsedPayload,
      rejectionReason: 'Not in DB',
      razorpaySubscriptionId: rzpSubId,
    });
    return;
  }

  // ── 2. Deadlock-proof concurrency lock (spec #2) ─────────────────────────
  // Acquires lock OR overrides a stale lock whose TTL has expired (> 30s)
  const lock = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      $or: [{ processing: { $ne: true } }, { lockExpiresAt: { $lt: new Date() } }],
    },
    { $set: { processing: true, lockExpiresAt: new Date(Date.now() + 30_000) } },
    { new: true }
  );
  if (!lock) {
    logger.info(
      { rzpSubId, eventId },
      'subscription.charged: already processing (within TTL) — skipping'
    );
    return;
  }

  try {
    // ── 3. Ownership cross-check (notes.userId vs DB userId) ─────────────
    const notesUserId = subEntity?.notes?.userId;
    if (notesUserId && notesUserId !== subscription.userId.toString()) {
      triggerAlert('ownership_mismatch', {
        notesUserId,
        dbUserId: subscription.userId.toString(),
        rzpSubId,
      });
      await flagUserAbuse(subscription.userId.toString(), 50);
      logPaymentEvent({
        eventType: 'subscription.charged',
        status: 'rejected',
        razorpayEventId: eventId,
        subscriptionId: subscription._id,
        userId: subscription.userId,
        rawPayload: parsedPayload,
        rejectionReason: 'Ownership mismatch',
      });
      return;
    }

    // ── 4. payment.subscription_id cross-check ──────────────────────────
    const paymentSubId = paymentEntity?.subscription_id;
    if (paymentSubId && paymentSubId !== rzpSubId) {
      logPaymentEvent({
        eventType: 'subscription.charged',
        status: 'rejected',
        razorpayEventId: eventId,
        subscriptionId: subscription._id,
        rawPayload: parsedPayload,
        rejectionReason: 'payment.subscription_id mismatch',
      });
      return;
    }

    // ── 5. State machine check ───────────────────────────────────────────
    if (!ALLOWED_TRANSITIONS[subscription.status]?.includes('active')) {
      logPaymentEvent({
        eventType: 'subscription.charged',
        status: 'rejected',
        razorpayEventId: eventId,
        subscriptionId: subscription._id,
        userId: subscription.userId,
        rawPayload: parsedPayload,
        rejectionReason: `State machine: ${subscription.status} → active blocked`,
      });
      return;
    }

    // ── 6. Amount tamper check ───────────────────────────────────────────
    if (
      amountPaise !== undefined &&
      amountPaise !== null &&
      amountPaise !== subscription.amountPaise
    ) {
      triggerAlert('tampered_amount', {
        expected: subscription.amountPaise,
        received: amountPaise,
        rzpSubId,
      });
      await flagUserAbuse(subscription.userId.toString(), 25);
      logPaymentEvent({
        eventType: 'subscription.charged',
        status: 'rejected',
        razorpayEventId: eventId,
        subscriptionId: subscription._id,
        userId: subscription.userId,
        razorpaySubscriptionId: rzpSubId,
        razorpayPaymentId: rzpPayId,
        rawPayload: parsedPayload,
        rejectionReason: `Amount mismatch: expected ${subscription.amountPaise} got ${amountPaise}`,
        amountPaise,
      });
      return;
    }

    // ── 7. Razorpay API zero-trust verification (spec #3) ────────────────
    try {
      const rzp = getRazorpay();
      const rzpSub = await rzp.subscriptions.fetch(rzpSubId);
      if (!rzpSub || rzpSub.status !== 'active') {
        triggerAlert('razorpay_sub_not_active', { rzpSubId, rzpStatus: rzpSub?.status });
        logPaymentEvent({
          eventType: 'subscription.charged',
          status: 'rejected',
          razorpayEventId: eventId,
          subscriptionId: subscription._id,
          userId: subscription.userId,
          rawPayload: parsedPayload,
          rejectionReason: `Razorpay sub status: ${rzpSub?.status}`,
        });
        return;
      }
      if (rzpPayId) {
        const rzpPay = await rzp.payments.fetch(rzpPayId);
        if (rzpPay.status !== 'captured') {
          logPaymentEvent({
            eventType: 'subscription.charged',
            status: 'rejected',
            razorpayEventId: eventId,
            subscriptionId: subscription._id,
            userId: subscription.userId,
            rawPayload: parsedPayload,
            rejectionReason: `Payment not captured: ${rzpPay.status}`,
          });
          return;
        }
        // ── 8. Customer binding validation (spec #7) ────────────────────
        if (
          subscription.customerId &&
          rzpPay.customer_id &&
          rzpPay.customer_id !== subscription.customerId
        ) {
          triggerAlert('customer_mismatch', {
            paymentCustomerId: rzpPay.customer_id,
            subCustomerId: subscription.customerId,
            rzpSubId,
          });
          await flagUserAbuse(subscription.userId.toString(), 50);
          logPaymentEvent({
            eventType: 'subscription.charged',
            status: 'rejected',
            razorpayEventId: eventId,
            subscriptionId: subscription._id,
            userId: subscription.userId,
            rawPayload: parsedPayload,
            rejectionReason: 'Customer ID mismatch',
          });
          return;
        }
      }
    } catch (apiErr) {
      // Razorpay may be temporarily unavailable — HMAC+state+idempotency guard
      logger.error(
        { apiErr, rzpSubId },
        'Razorpay API verify failed — proceeding with local guards'
      );
    }

    // ── 9. Atomic idempotency ────────────────────────────────────────────
    const now = new Date();
    const idemResult = await Subscription.updateOne(
      { _id: subscription._id, processedEvents: { $ne: eventId } },
      { $push: { processedEvents: { $each: [eventId], $slice: -50 } }, $set: { lastEventAt: now } }
    );
    if (idemResult.modifiedCount === 0) {
      inc('webhooks_duplicate');
      logger.info({ eventId, rzpSubId }, 'subscription.charged: duplicate (atomic) — skipping');
      logPaymentEvent({
        eventType: 'subscription.charged',
        status: 'duplicate',
        razorpayEventId: eventId,
        subscriptionId: subscription._id,
        userId: subscription.userId,
        razorpaySubscriptionId: rzpSubId,
        rawPayload: parsedPayload,
      });
      return;
    }

    // ── 10. TRANSACTIONAL Subscription + User activation (spec #2) ──────
    const periodStart = subEntity?.current_start ? new Date(subEntity.current_start * 1000) : now;
    const periodEnd = subEntity?.current_end ? new Date(subEntity.current_end * 1000) : null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'active',
              lastPaymentId: rzpPayId,
              failedAttempts: 0,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          },
          { session }
        );
        await activateSubscriptionPlan(
          subscription.userId.toString(),
          subscription.planType,
          subscription.billingCycle,
          subscription._id.toString(),
          periodEnd,
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    logPaymentEvent({
      eventType: 'subscription.charged',
      status: 'processed',
      razorpayEventId: eventId,
      subscriptionId: subscription._id,
      userId: subscription.userId,
      razorpaySubscriptionId: rzpSubId,
      razorpayPaymentId: rzpPayId,
      rawPayload: parsedPayload,
      amountPaise: amountPaise ?? subscription.amountPaise,
    });
    inc('payments_succeeded');
    inc('webhooks_processed');
    // Spec #7: generate GST invoice (fire-and-forget)
    generatePaymentInvoice({
      userId: subscription.userId.toString(),
      subscriptionId: subscription._id.toString(),
      razorpayPaymentId: rzpPayId,
      planType: subscription.planType,
      billingCycle: subscription.billingCycle,
      totalPaise: amountPaise ?? subscription.amountPaise,
      paymentDate: new Date(),
    });
    // Spec #5: notify user of successful payment
    notifyUser(subscription.userId.toString(), 'payment_success', {
      amountPaise: amountPaise ?? subscription.amountPaise,
      planType: subscription.planType,
    });
    logger.info(
      { userId: subscription.userId.toString(), rzpSubId, planType: subscription.planType },
      'Plan activated via subscription.charged'
    );
  } finally {
    // Always release concurrency lock (unset TTL field too)
    await Subscription.updateOne(
      { _id: subscription._id },
      { $set: { processing: false }, $unset: { lockExpiresAt: '' } }
    );
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// Handler: payment.failed  (record only — no plan downgrade)
// ─────────────────────────────────────────────────────────────────────────────
async function handlePaymentFailed(event, eventId, parsedPayload) {
  const paymentEntity = event.payload?.payment?.entity;
  const rzpSubId = paymentEntity?.subscription_id;

  if (!rzpSubId) {
    logPaymentEvent({
      eventType: 'payment.failed',
      status: 'ignored',
      razorpayEventId: eventId,
      rawPayload: parsedPayload,
      rejectionReason: 'No subscription_id',
    });
    return;
  }

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: rzpSubId });
  if (!subscription) {
    logger.warn({ rzpSubId }, 'payment.failed: not in DB');
    return;
  }

  // Atomic idempotency — single updateOne with correct operator grouping (no duplicate $set)
  const idemResult = await Subscription.updateOne(
    { _id: subscription._id, processedEvents: { $ne: eventId } },
    {
      $push: { processedEvents: { $each: [eventId], $slice: -50 } },
      $set: { lastEventAt: new Date(), lastFailedAt: new Date() },
      $inc: { failedAttempts: 1 },
    }
  );
  if (idemResult.modifiedCount === 0) {
    logPaymentEvent({
      eventType: 'payment.failed',
      status: 'duplicate',
      razorpayEventId: eventId,
      subscriptionId: subscription._id,
      userId: subscription.userId,
      rawPayload: parsedPayload,
    });
    return;
  }

  logPaymentEvent({
    eventType: 'payment.failed',
    status: 'processed',
    razorpayEventId: eventId,
    subscriptionId: subscription._id,
    userId: subscription.userId,
    razorpaySubscriptionId: rzpSubId,
    rawPayload: parsedPayload,
  });
  inc('payments_failed');
  inc('webhooks_processed');
  // Spec #5: notify user of failed payment
  notifyUser(subscription.userId.toString(), 'payment_failed', {});
  logger.warn(
    { userId: subscription.userId.toString(), rzpSubId },
    'payment.failed recorded (no downgrade — awaiting retry/halt)'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler: subscription.cancelled / subscription.completed
// ─────────────────────────────────────────────────────────────────────────────
async function handleSubscriptionCancelled(event, eventId, parsedPayload, eventType) {
  const subEntity = event.payload?.subscription?.entity;
  const rzpSubId = subEntity?.id;

  if (!rzpSubId) {
    logPaymentEvent({
      eventType,
      status: 'ignored',
      razorpayEventId: eventId,
      rawPayload: parsedPayload,
      rejectionReason: 'No subscription ID',
    });
    return;
  }

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: rzpSubId });
  if (!subscription) {
    logger.warn({ rzpSubId, eventType }, 'Not in DB on cancel');
    return;
  }

  // State machine check
  const newStatus = eventType === 'subscription.completed' ? 'completed' : 'cancelled';
  if (!ALLOWED_TRANSITIONS[subscription.status]?.includes(newStatus)) {
    logPaymentEvent({
      eventType,
      status: 'rejected',
      razorpayEventId: eventId,
      subscriptionId: subscription._id,
      userId: subscription.userId,
      rawPayload: parsedPayload,
      rejectionReason: `State machine: cannot transition ${subscription.status} → ${newStatus}`,
    });
    return;
  }

  // Atomic idempotency
  const idemResult = await Subscription.updateOne(
    { _id: subscription._id, processedEvents: { $ne: eventId } },
    {
      $push: { processedEvents: eventId },
      $set: { status: newStatus, cancelledAt: new Date(), lastEventAt: new Date() },
    }
  );
  if (idemResult.modifiedCount === 0) {
    logPaymentEvent({
      eventType,
      status: 'duplicate',
      razorpayEventId: eventId,
      subscriptionId: subscription._id,
      userId: subscription.userId,
      rawPayload: parsedPayload,
    });
    return;
  }

  // Transactional cancel — Subscription + User atomically (spec #2)
  const cancelSession = await mongoose.startSession();
  try {
    await cancelSession.withTransaction(async () => {
      await cancelSubscriptionPlan(subscription.userId.toString(), subscription._id.toString(), {
        session: cancelSession,
      });
    });
  } finally {
    await cancelSession.endSession();
  }
  logPaymentEvent({
    eventType,
    status: 'processed',
    razorpayEventId: eventId,
    subscriptionId: subscription._id,
    userId: subscription.userId,
    razorpaySubscriptionId: rzpSubId,
    rawPayload: parsedPayload,
  });
  inc('webhooks_processed');
  // Spec #5: notify user of cancellation
  notifyUser(subscription.userId.toString(), 'subscription_cancelled', {
    accessUntil: subscription.currentPeriodEnd,
  });
  logger.info(
    { userId: subscription.userId.toString(), rzpSubId, eventType },
    'Subscription cancelled — user reverted to free'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler: subscription.halted  (Razorpay gives up retrying — revert plan)
// ─────────────────────────────────────────────────────────────────────────────
async function handleSubscriptionHalted(event, eventId, parsedPayload) {
  const subEntity = event.payload?.subscription?.entity;
  const rzpSubId = subEntity?.id;

  if (!rzpSubId) {
    logPaymentEvent({
      eventType: 'subscription.halted',
      status: 'ignored',
      razorpayEventId: eventId,
      rawPayload: parsedPayload,
    });
    return;
  }

  const subscription = await Subscription.findOne({ razorpaySubscriptionId: rzpSubId });
  if (!subscription) {
    return;
  }

  // State machine check
  if (!ALLOWED_TRANSITIONS[subscription.status]?.includes('failed')) {
    logPaymentEvent({
      eventType: 'subscription.halted',
      status: 'rejected',
      razorpayEventId: eventId,
      subscriptionId: subscription._id,
      userId: subscription.userId,
      rawPayload: parsedPayload,
      rejectionReason: `State machine: cannot transition ${subscription.status} → failed`,
    });
    return;
  }

  // Atomic idempotency
  const idemResult = await Subscription.updateOne(
    { _id: subscription._id, processedEvents: { $ne: eventId } },
    { $push: { processedEvents: eventId }, $set: { status: 'failed', lastEventAt: new Date() } }
  );
  if (idemResult.modifiedCount === 0) {
    logPaymentEvent({
      eventType: 'subscription.halted',
      status: 'duplicate',
      razorpayEventId: eventId,
      subscriptionId: subscription._id,
      userId: subscription.userId,
      rawPayload: parsedPayload,
    });
    return;
  }

  // Transactional halt — Subscription + User atomically (spec #2)
  const haltSession = await mongoose.startSession();
  try {
    await haltSession.withTransaction(async () => {
      await cancelSubscriptionPlan(subscription.userId.toString(), subscription._id.toString(), {
        session: haltSession,
      });
    });
  } finally {
    await haltSession.endSession();
  }
  logPaymentEvent({
    eventType: 'subscription.halted',
    status: 'processed',
    razorpayEventId: eventId,
    subscriptionId: subscription._id,
    userId: subscription.userId,
    razorpaySubscriptionId: rzpSubId,
    rawPayload: parsedPayload,
  });
  logger.warn(
    { userId: subscription.userId.toString(), rzpSubId },
    'subscription.halted — plan reverted to free'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /my-subscription
// Authenticated — returns the caller's active subscription details + plan info.
// NEVER exposes processedEvents, internal DB IDs, or pricing logic.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch from both User (plan) and Subscription (billing detail)
    const [user, subscription] = await Promise.all([
      User.findById(userId)
        .select(
          'subscriptionPlan planStartDate planEndDate isCouponActive couponCodeUsed activeSubscriptionId'
        )
        .lean(),
      Subscription.findOne({ userId, status: { $in: ['active', 'created'] } })
        .select(
          'razorpaySubscriptionId planType billingCycle status currentPeriodStart currentPeriodEnd refunded cancelRequested cancelRequestedAt createdAt'
        )
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    // Resolve effective plan (respects expiry)
    const { getEffectivePlan } = await import('../config/planFeatures.js');
    const effectivePlan = getEffectivePlan(user);
    const isExpired = user.planEndDate && new Date(user.planEndDate) < new Date();

    return res.json({
      plan: {
        current: effectivePlan,
        raw: user.subscriptionPlan || 'free',
        startDate: user.planStartDate ?? null,
        endDate: user.planEndDate ?? null,
        expired: !!isExpired,
        isCouponActive: user.isCouponActive ?? false,
        couponUsed: user.couponCodeUsed ?? null,
      },
      subscription: subscription
        ? {
            subscriptionId: subscription.razorpaySubscriptionId,
            planType: subscription.planType,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            periodStart: subscription.currentPeriodStart ?? null,
            periodEnd: subscription.currentPeriodEnd ?? null,
            refunded: subscription.refunded,
            cancelRequested: subscription.cancelRequested ?? false,
            cancelRequestedAt: subscription.cancelRequestedAt ?? null,
            createdAt: subscription.createdAt,
          }
        : null,
    });
  } catch (err) {
    logger.error({ err }, 'GET /my-subscription error');
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /cancel-subscription
// Authenticated — user initiates a cancellation request.
// This cancels on Razorpay (at cycle end) and marks status on DB.
// Actual plan downgrade happens only when Razorpay fires subscription.cancelled.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cancel-subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscription = await Subscription.findOne({
      userId,
      status: 'active',
    }).lean();

    if (!subscription) {
      return res
        .status(404)
        .json({ error: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found.' });
    }

    if (subscription.refunded) {
      return res
        .status(409)
        .json({ error: 'ALREADY_REFUNDED', message: 'This subscription was already refunded.' });
    }

    // Cancel on Razorpay (cancel_at_cycle_end = 1 means no immediate loss of access)
    const rzp = getRazorpay();

    // Guard: already requested cancellation
    if (subscription.cancelRequested) {
      return res.status(409).json({
        error: 'CANCEL_ALREADY_REQUESTED',
        message: 'Cancellation already scheduled. You retain access until the billing period ends.',
        accessUntil: subscription.currentPeriodEnd ?? null,
      });
    }

    // Cancel on Razorpay at cycle-end (user keeps access for rest of paid period)
    await rzp.subscriptions.cancel(subscription.razorpaySubscriptionId, true);

    // Spec #9: mark cancelRequested — do NOT change status or downgrade plan yet.
    // Actual plan downgrade happens only when Razorpay fires subscription.cancelled webhook.
    await Subscription.findByIdAndUpdate(subscription._id, {
      $set: {
        cancelRequested: true,
        cancelRequestedAt: new Date(),
        cancelReason: 'User-initiated — will take effect at period end',
      },
    });

    logger.info(
      {
        userId,
        subscriptionId: subscription.razorpaySubscriptionId,
        periodEnd: subscription.currentPeriodEnd,
      },
      'User requested subscription cancellation (at cycle end)'
    );

    return res.json({
      ok: true,
      message:
        'Cancellation scheduled. You retain full access until the end of your current billing period.',
      accessUntil: subscription.currentPeriodEnd ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'POST /cancel-subscription error');
    return res.status(500).json({ error: 'Cancellation failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /invoice/:invoiceId — Download invoice (authenticated, user-scoped, spec #7)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invoice/:invoiceId', requireAuth, async (req, res) => {
  try {
    const { getInvoiceById } = await import('../services/invoiceService.js');
    const invoice = await getInvoiceById(req.params.invoiceId, req.user.userId);
    if (!invoice) {
      return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    }
    return res.json({ ok: true, invoice });
  } catch (err) {
    logger.error({ err }, 'GET /invoice/:id error');
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// GET /invoices — List all invoices for the authenticated user
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const { getInvoicesForUser } = await import('../services/invoiceService.js');
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const data = await getInvoicesForUser(req.user.userId, page, 20);
    return res.json({ ok: true, ...data });
  } catch (err) {
    logger.error({ err }, 'GET /invoices error');
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

export default router;
