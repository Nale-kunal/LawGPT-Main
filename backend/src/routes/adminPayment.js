/**
 * adminPayment.js — Admin-only payment management routes
 *
 * POST /api/v1/admin/payment/refund/:subscriptionId  — Issue a refund (admin only)
 * GET  /api/v1/admin/payment/logs                    — Query PaymentLog
 * GET  /api/v1/admin/payment/subscriptions           — Query all subscriptions
 *
 * SECURITY CONTRACT:
 *  - Requires requireAuth + requireRole('admin') on every route.
 *  - Refund requires explicit reason (mandatory).
 *  - Max one refund per subscription.
 *  - 24-hour window enforced: payment older than 24h cannot be refunded.
 *  - Every action logged to RefundLog.
 *  - Multiple refund *attempts* on same userId flags securityFlags.
 */

import express      from 'express';
import mongoose     from 'mongoose';
import Razorpay     from 'razorpay';
import { requireAuth } from '../middleware/auth-jwt.js';
import { requireRole } from '../middleware/rbac.js';
import Subscription from '../models/Subscription.js';
import PaymentLog   from '../models/PaymentLog.js';
import RefundLog    from '../models/RefundLog.js';
import User         from '../models/User.js';
import { cancelSubscriptionPlan } from '../services/planService.js';
import logger          from '../utils/logger.js';
import { notifyUser }   from '../services/notificationService.js';
import { inc }          from '../services/metricsService.js';
import SettlementLog    from '../models/SettlementLog.js';

const router = express.Router();

// All routes: must be authenticated AND be an admin
router.use(requireAuth, requireRole('admin'));

// ── Razorpay client (lazy) ────────────────────────────────────────────────────
let _rzp = null;
function getRazorpay() {
  if (!_rzp) {
    const key_id     = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error('Razorpay keys not configured');
    _rzp = new Razorpay({ key_id, key_secret });
  }
  return _rzp;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /refund/:subscriptionId
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refund/:subscriptionId', async (req, res) => {
  const adminUserId      = req.user.userId;
  const { subscriptionId } = req.params;
  const { reason, amount } = req.body;  // amount in paise (optional — defaults to full)

  // ── 1. Validate inputs ─────────────────────────────────────────────────────
  if (!reason || typeof reason !== 'string' || reason.trim().length < 15) {
    return res.status(400).json({ error: 'REASON_REQUIRED', message: 'A reason of at least 15 characters is required for refunds.' });
  }

  // ── 2. Load subscription ──────────────────────────────────────────────────
  const subscription = await Subscription.findById(subscriptionId).lean();
  if (!subscription) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Subscription not found.' });
  }

  // ── 3. Already refunded guard (one refund max) ─────────────────────────────
  if (subscription.refunded) {
    return res.status(409).json({ error: 'ALREADY_REFUNDED', message: 'This subscription has already been refunded.' });
  }

  // ── 3b. Refund-in-progress idempotency lock (spec #1) ──────────────────────
  // Atomic: only one admin can issue a refund at a time for this subscription.
  const refundLock = await Subscription.findOneAndUpdate(
    { _id: subscriptionId, refundInProgress: { $ne: true } },
    { $set: { refundInProgress: true } },
    { new: true }
  );
  if (!refundLock) {
    return res.status(409).json({ error: 'REFUND_IN_PROGRESS', message: 'A refund is already in progress for this subscription. Please wait.' });
  }

  // ── 4. Subscription must be in 'active' state to refund (spec #8) ──────────
  if (subscription.status !== 'active') {
    await _logRefundAttempt({ subscription, adminUserId, paymentId: subscription.lastPaymentId || 'unknown', decision: 'rejected', reason: reason.trim(), rejectionReason: `Cannot refund subscription in state: ${subscription.status}`, capturedAt: null });
    return res.status(400).json({
      error:   'INVALID_STATE',
      message: `Refunds are only allowed on active subscriptions. Current status: "${subscription.status}".`,
    });
  }

  // ── 4. Must have a captured payment ID to refund ──────────────────────────
  const paymentId = subscription.lastPaymentId;
  if (!paymentId) {
    return res.status(400).json({ error: 'NO_PAYMENT', message: 'No captured payment found on this subscription.' });
  }

  // ── 5. 24-hour window check — fetch payment from Razorpay ────────────────
  let rzpPayment;
  try {
    const rzp  = getRazorpay();
    rzpPayment = await rzp.payments.fetch(paymentId);
  } catch (fetchErr) {
    logger.error({ fetchErr, paymentId }, 'Admin refund: failed to fetch payment from Razorpay');
    return res.status(502).json({ error: 'RZP_FETCH_FAILED', message: 'Could not fetch payment details from Razorpay.' });
  }

  const capturedAt = rzpPayment.created_at ? new Date(rzpPayment.created_at * 1000) : null;
  const ageMs      = capturedAt ? Date.now() - capturedAt.getTime() : Infinity;
  const HOURS_24   = 24 * 60 * 60 * 1000;

  if (ageMs > HOURS_24) {
    logger.warn({ adminUserId, subscriptionId, ageMs }, 'Admin refund: payment older than 24h — blocked');
    // Log rejected attempt; multiple attempts on same userId triggers flag
    await _logRefundAttempt({ subscription, adminUserId, paymentId, decision: 'rejected', reason: reason.trim(), rejectionReason: 'Payment older than 24 hours', capturedAt });
    await _trackRefundAbuse(subscription.userId);
    return res.status(403).json({
      error:   'REFUND_WINDOW_EXPIRED',
      message: 'Refunds are only allowed within 24 hours of payment capture.',
      capturedAt,
    });
  }

  // ── 6. Payment must be captured ───────────────────────────────────────────
  if (rzpPayment.status !== 'captured') {
    return res.status(400).json({ error: 'PAYMENT_NOT_CAPTURED', message: `Payment status is "${rzpPayment.status}" — only captured payments can be refunded.` });
  }

  // ── 7. Determine refund amount ────────────────────────────────────────────
  const refundAmount = (amount && Number.isInteger(amount) && amount > 0 && amount <= rzpPayment.amount)
    ? amount
    : rzpPayment.amount;  // default: full refund

  // ── 8. Issue refund via Razorpay ──────────────────────────────────────────
  let refundResponse;
  try {
    const rzp      = getRazorpay();
    refundResponse = await rzp.payments.refund(paymentId, {
      amount: refundAmount,
      notes:  { reason: reason.trim(), adminUserId },
    });
  } catch (refundErr) {
    // Release lock on Razorpay failure
    await Subscription.updateOne({ _id: subscriptionId }, { $unset: { refundInProgress: '' } });
    logger.error({ refundErr, paymentId }, 'Admin refund: Razorpay refund call failed');
    await _logRefundAttempt({ subscription, adminUserId, paymentId, decision: 'rejected', reason: reason.trim(), rejectionReason: `Razorpay error: ${refundErr.message}`, capturedAt });
    return res.status(502).json({ error: 'REFUND_FAILED', message: 'Razorpay refund request failed. Please try again.' });
  }

  // ── 9. TRANSACTIONAL: Mark refunded + revert user atomically (specs #2, #4) ─
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          $set: {
            refunded:        true,
            refundedAt:      new Date(),
            refundReason:    reason.trim(),
            refundPaymentId: refundResponse.id,
            status:          'cancelled',
            cancelledAt:     new Date(),
            cancelReason:    `Refunded by admin ${adminUserId}`,
          },
        },
        { session }
      );
      await cancelSubscriptionPlan(subscription.userId.toString(), subscriptionId, { session });
    });
  } catch (txErr) {
    // Razorpay refund was already issued — log the DB failure for manual reconciliation
    logger.error({ txErr, paymentId, subscriptionId }, 'CRITICAL: Razorpay refunded but DB transaction failed — manual reconciliation required');
    await RefundLog.create({
      subscriptionId: subscription._id,
      userId:         subscription.userId,
      adminUserId,
      razorpayPaymentId: paymentId,
      decision:       'db_failed_after_refund',
      reason:         reason.trim(),
      rejectionReason: txErr.message,
      razorpayRefundId: refundResponse.id,
      amountRefundedPaise: refundAmount,
      paymentCapturedAt: capturedAt,
    });
    return res.status(500).json({ error: 'DB_SYNC_FAILED', message: 'Refund issued on Razorpay but DB update failed. Contact engineering.' });
  } finally {
    // Always release refund lock (spec #1)
    await Subscription.updateOne({ _id: subscriptionId }, { $unset: { refundInProgress: '' } });
    await session.endSession();
  }

  // ── 10. Audit log (immutable — spec #10) ─────────────────────────────────
  await _logRefundAttempt({
    subscription,
    adminUserId,
    paymentId,
    decision: 'approved',
    reason:   reason.trim(),
    razorpayRefundId:     refundResponse.id,
    amountRefundedPaise:  refundAmount,
    capturedAt,
  });

  inc('refunds_issued');
  // Spec #5: notify user of refund
  notifyUser(subscription.userId.toString(), 'refund_processed', {
    amountPaise: refundAmount,
    refundId:    refundResponse.id,
  });
  logger.info(
    { adminUserId, subscriptionId, userId: subscription.userId, refundId: refundResponse.id, amountRefundedPaise: refundAmount },
    'Admin refund issued successfully'
  );

  return res.json({
    ok:              true,
    refundId:        refundResponse.id,
    amountRefunded:  refundAmount,
    message:         'Refund issued. User plan reverted to free.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /logs — Query PaymentLog (with pagination + filters)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const page  = Math.max(1,   parseInt(req.query.page  || '1',   10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.eventType)   filter.eventType = req.query.eventType;
    if (req.query.userId)      filter.userId    = req.query.userId;
    if (req.query.status)      filter.status    = req.query.status;
    if (req.query.rzpSubId)    filter.razorpaySubscriptionId = req.query.rzpSubId;

    const [logs, total] = await Promise.all([
      PaymentLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PaymentLog.countDocuments(filter),
    ]);

    return res.json({ ok: true, data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err }, 'Admin: GET /payment/logs failed');
    return res.status(500).json({ error: 'Query failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /subscriptions — Query all subscriptions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/subscriptions', async (req, res) => {
  try {
    const page  = Math.max(1,   parseInt(req.query.page  || '1',  10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status)  filter.status = req.query.status;
    if (req.query.userId)  filter.userId = req.query.userId;
    if (req.query.planType) filter.planType = req.query.planType;

    const [subs, total] = await Promise.all([
      Subscription.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-processedEvents')  // omit large idempotency array
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    return res.json({ ok: true, data: subs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err }, 'Admin: GET /payment/subscriptions failed');
    return res.status(500).json({ error: 'Query failed' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /refunds — Query RefundLog (spec #11)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/refunds', async (req, res) => {
  try {
    const page  = Math.max(1,   parseInt(req.query.page  || '1',   10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.userId)   filter.userId   = req.query.userId;
    if (req.query.decision) filter.decision = req.query.decision;

    const [refunds, total] = await Promise.all([
      RefundLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RefundLog.countDocuments(filter),
    ]);

    return res.json({ ok: true, data: refunds, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err }, 'Admin: GET /payment/refunds failed');
    return res.status(500).json({ error: 'Query failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /settlements — Query SettlementLog (spec #11)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/settlements', async (req, res) => {
  try {
    const page  = Math.max(1,   parseInt(req.query.page  || '1',   10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [settlements, total] = await Promise.all([
      SettlementLog.find(filter).sort({ razorpayCreatedAt: -1 }).skip(skip).limit(limit).lean(),
      SettlementLog.countDocuments(filter),
    ]);

    return res.json({ ok: true, data: settlements, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err }, 'Admin: GET /payment/settlements failed');
    return res.status(500).json({ error: 'Query failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /metrics?range=24h|7d|30d — Persistent payment metrics (specs #1, #8)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/metrics', async (req, res) => {
  try {
    const RANGES = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 };
    const rangeMs = RANGES[req.query.range] ?? RANGES['24h'];
    const { getSnapshot } = await import('../services/metricsService.js');
    const data = await getSnapshot(rangeMs);
    return res.json({ ok: true, range: req.query.range || '24h', data });
  } catch (err) {
    logger.error({ err }, 'Admin: GET /payment/metrics failed');
    return res.status(500).json({ error: 'Metrics unavailable' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function _logRefundAttempt({
  subscription, adminUserId, paymentId, decision,
  reason, rejectionReason = null, razorpayRefundId = null,
  amountRefundedPaise = null, capturedAt = null,
}) {
  try {
    await RefundLog.create({
      subscriptionId:      subscription._id,
      userId:              subscription.userId,
      adminUserId,
      razorpayPaymentId:   paymentId,
      decision,
      reason,
      rejectionReason,
      razorpayRefundId,
      amountRefundedPaise,
      paymentCapturedAt:   capturedAt,
    });
  } catch (err) {
    logger.error({ err }, 'RefundLog.create failed');
  }
}

async function _trackRefundAbuse(userId) {
  try {
    const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff    = new Date(Date.now() - WINDOW_MS);
    const attempts  = await RefundLog.countDocuments({
      userId,
      decision:  'rejected',
      createdAt: { $gte: cutoff },
    });

    if (attempts >= 3) {
      await User.findByIdAndUpdate(userId, {
        $set: { 'securityFlags.isSuspicious': true },
        $inc: { 'securityFlags.abuseScore': 15 },
      });
      logger.warn({ userId, attempts }, 'Refund abuse flag triggered on user');
    }
  } catch (err) {
    logger.error({ err }, '_trackRefundAbuse failed');
  }
}

export default router;
