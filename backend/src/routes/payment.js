/**
 * payment.js — Razorpay payment routes
 *
 * POST /api/v1/payment/create-order   — Create a Razorpay order
 * POST /api/v1/payment/verify         — Optional: frontend verify (NOT the final authority)
 * POST /api/v1/payment/webhook        — Razorpay webhook (CANONICAL plan upgrade trigger)
 */

import express            from 'express';
import Razorpay           from 'razorpay';
import crypto             from 'crypto';
import { requireAuth }    from '../middleware/auth-jwt.js';
import Payment            from '../models/Payment.js';
import { PLAN_PRICING, PLAN_HIERARCHY } from '../config/planFeatures.js';
import { updateUserPlan } from '../services/planService.js';
import logger             from '../utils/logger.js';

const router = express.Router();

// ── Razorpay client (instantiated lazily so missing keys don't crash startup) ─
let razorpay = null;
function getRazorpay() {
  if (!razorpay) {
    const key_id     = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    razorpay = new Razorpay({ key_id, key_secret });
  }
  return razorpay;
}

// ─── POST /create-order ───────────────────────────────────────────────────────
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;

    // Validate plan
    if (!plan || !PLAN_HIERARCHY.includes(plan) || plan === 'free') {
      return res.status(400).json({ error: 'INVALID_PLAN', message: 'Invalid or non-upgradable plan' });
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'INVALID_CYCLE', message: 'billingCycle must be monthly or yearly' });
    }

    const pricing = PLAN_PRICING[plan];
    if (!pricing) {
      return res.status(400).json({ error: 'PLAN_NOT_FOUND', message: 'Plan pricing not found' });
    }

    const amountPaise = pricing[billingCycle];
    if (!amountPaise || amountPaise === 0) {
      return res.status(400).json({ error: 'INVALID_PRICE', message: 'No price defined for this plan/cycle' });
    }

    // Create Razorpay order
    const rzp = getRazorpay();
    const rpOrder = await rzp.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      notes: {
        userId:      req.user.userId,
        plan,
        billingCycle,
      },
    });

    // Persist order in DB (status: created)
    const payment = await Payment.create({
      userId:          req.user.userId,
      razorpayOrderId: rpOrder.id,
      plan,
      billingCycle,
      amountPaise,
      status:          'created',
    });

    logger.info({ userId: req.user.userId, orderId: rpOrder.id, plan }, 'Razorpay order created');

    return res.json({
      orderId:  rpOrder.id,
      amount:   amountPaise,
      currency: 'INR',
      keyId:    process.env.RAZORPAY_KEY_ID,
      plan,
      billingCycle,
      paymentDbId: payment._id,
    });

  } catch (err) {
    logger.error({ err }, 'POST /create-order error');
    if (err.message?.includes('Razorpay keys')) {
      return res.status(503).json({ error: 'PAYMENT_UNAVAILABLE', message: 'Payment service not configured' });
    }
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ─── POST /verify ─────────────────────────────────────────────────────────────
// Optional endpoint: frontend calls this after RZP checkout success.
// This does NOT upgrade the plan — only the webhook does.
// Purpose: give immediate UI feedback while webhook processes asynchronously.
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const webhookSecret = process.env.RAZORPAY_KEY_SECRET;
    const body          = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig   = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    if (expectedSig !== razorpay_signature) {
      logger.warn({ razorpay_order_id }, 'Signature mismatch on /verify');
      return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Payment signature verification failed' });
    }

    // Signature valid — record payment details (plan update happens via webhook)
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, userId: req.user.userId },
      { $set: { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } }
    );

    return res.json({
      success: true,
      message: 'Payment verified. Your plan will be activated shortly.',
    });

  } catch (err) {
    logger.error({ err }, 'POST /verify error');
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /webhook ────────────────────────────────────────────────────────────
// Razorpay sends events here. This is the CANONICAL trigger for plan upgrades.
// Must be mounted BEFORE the JSON body parser, with raw body access.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
    return res.status(500).end();
  }

  try {
    // ── Signature verification ────────────────────────────────────────────
    const signature   = req.headers['x-razorpay-signature'];
    const rawBody     = req.body; // raw Buffer (express.raw middleware)
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!signature || expectedSig !== signature) {
      logger.warn({ signature }, 'Webhook: invalid signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString());
    logger.info({ event: event.event }, 'Webhook received');

    // ── Handle payment.captured ───────────────────────────────────────────
    if (event.event === 'payment.captured') {
      const payload   = event.payload?.payment?.entity;
      const orderId   = payload?.order_id;
      const paymentId = payload?.id;

      if (!orderId) {
        logger.warn('Webhook: payment.captured missing order_id');
        return res.status(200).end(); // ack but skip
      }

      // ── Idempotency: skip if already processed ────────────────────────
      const existing = await Payment.findOne({ razorpayOrderId: orderId });
      if (!existing) {
        logger.warn({ orderId }, 'Webhook: order not found in DB');
        return res.status(200).end();
      }

      if (existing.webhookProcessed) {
        logger.info({ orderId }, 'Webhook: already processed — skipping');
        return res.status(200).end();
      }

      // ── Amount tamper check ───────────────────────────────────────────
      const expectedAmount = existing.amountPaise;
      if (payload.amount !== expectedAmount) {
        logger.error({ orderId, expected: expectedAmount, received: payload.amount }, 'Webhook: amount mismatch!');
        await Payment.findByIdAndUpdate(existing._id, { status: 'failed' });
        return res.status(200).end(); // ack but don't upgrade
      }

      // ── Mark payment paid (before upgrading plan — for audit trail) ───
      await Payment.findByIdAndUpdate(existing._id, {
        $set: {
          razorpayPaymentId:   paymentId,
          status:              'paid',
          webhookProcessed:    true,
          webhookProcessedAt:  new Date(),
        },
      });

      // ── Upgrade user plan (THE ONLY PATH) ─────────────────────────────
      await updateUserPlan(existing.userId.toString(), existing.plan, existing.billingCycle);

      logger.info({
        userId:  existing.userId.toString(),
        plan:    existing.plan,
        orderId,
      }, 'Plan upgraded via webhook');
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    logger.error({ err }, 'Webhook processing error');
    return res.status(500).end();
  }
});

export default router;
