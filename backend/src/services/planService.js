/**
 * planService.js — Server-only plan mutation functions
 *
 * RULE: This is the ONLY place in the codebase that may raise a user's
 * subscriptionPlan.  No route, controller, or API handler may call
 * User.findByIdAndUpdate({ subscriptionPlan: ... }) directly.
 *
 * Functions exported:
 *  - updateUserPlan            (legacy order/coupon flow)
 *  - activateSubscriptionPlan  (new subscription webhook flow — session-aware)
 *  - cancelSubscriptionPlan    (cancellation / halt / refund — session-aware)
 *  - revertToFree
 *  - getUserPlanInfo
 *
 * Session-aware functions accept an optional { session } object so callers can
 * wrap them inside a mongoose.startSession() / withTransaction() block for
 * full ACID consistency (spec #2).
 */

import User     from '../models/User.js';
import logger   from '../utils/logger.js';
import mongoose from 'mongoose';
import { PLAN_HIERARCHY, PLAN_DURATION_DAYS, getEffectivePlan } from '../config/planFeatures.js';

// Internal: auto-block user if abuseScore >= 50 and cancel their active sub (specs #7, #8)
async function _enforceAbuseThreshold(userId, session = null) {
  try {
    const opts = session ? { session } : {};
    const user = await User.findById(userId)
      .select('securityFlags activeSubscriptionId subscriptionPlan')
      .lean(opts);
    if (!user || user.securityFlags?.abuseScore < 50 || user.securityFlags?.blocked) return;

    // Block the user
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'securityFlags.blocked':       true,
          'securityFlags.blockedAt':     new Date(),
          'securityFlags.blockedReason': `Auto-blocked: abuseScore ${user.securityFlags.abuseScore} >= 50`,
        },
      },
      opts
    );
    logger.warn({ userId, abuseScore: user.securityFlags.abuseScore }, 'User auto-blocked due to abuse threshold');

    // Spec #7: cancel their active Razorpay subscription immediately
    if (user.activeSubscriptionId && user.subscriptionPlan !== 'free') {
      try {
        const Subscription = (await import('../models/Subscription.js')).default;
        const Razorpay     = (await import('razorpay')).default;
        const sub = await Subscription.findById(user.activeSubscriptionId).lean();
        if (sub?.razorpaySubscriptionId) {
          const rzp = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
          });
          await rzp.subscriptions.cancel(sub.razorpaySubscriptionId, { cancel_at_cycle_end: 0 });
          logger.warn({ userId, rzpSubId: sub.razorpaySubscriptionId }, 'Abuse block: Razorpay subscription cancelled');
        }
      } catch (cancelErr) {
        // Non-fatal: webhook will eventually reconcile; log for manual review
        logger.error({ cancelErr, userId }, 'Abuse block: failed to cancel Razorpay subscription — manual reconciliation needed');
      }
      // Immediately downgrade plan in DB
      await User.updateOne(
        { _id: userId },
        { $set: { subscriptionPlan: 'free', planEndDate: null, planStartDate: null, activeSubscriptionId: null } },
        opts
      );
    }
  } catch (err) {
    logger.error({ err }, '_enforceAbuseThreshold failed');
  }
}

/**
 * updateUserPlan
 * ──────────────
 * Atomically set a user's subscription plan with a duration.
 *
 * @param {string} userId          MongoDB ObjectId string
 * @param {string} plan            One of PLAN_HIERARCHY values (not 'free' from here)
 * @param {string} billingCycle    'monthly' | 'yearly' | 'coupon'
 * @param {number} [overrideDays]  If set, use this instead of PLAN_DURATION_DAYS
 * @param {object} [opts]          { session? } for transactional callers
 */
export async function updateUserPlan(userId, plan, billingCycle = 'monthly', overrideDays = null, opts = {}) {
  if (!PLAN_HIERARCHY.includes(plan)) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const durationDays = overrideDays ?? PLAN_DURATION_DAYS[billingCycle] ?? 30;
  const now          = new Date();
  const planEndDate  = new Date(now.getTime() + durationDays * 86_400_000);

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        subscriptionPlan: plan,
        planStartDate:    now,
        planEndDate,
      },
    },
    { new: true, lean: true, ...opts }
  );

  if (!updated) throw new Error(`User ${userId} not found`);

  logger.info({ userId, plan, billingCycle, planEndDate }, 'Plan updated successfully');
  return updated;
}

/**
 * activateSubscriptionPlan
 * ─────────────────────────
 * Called EXCLUSIVELY from the subscription.charged webhook handler.
 * Sets the user's plan to the subscription's planType and records the
 * active subscription ID.
 *
 * @param {string}    userId             MongoDB ObjectId string
 * @param {string}    planType           e.g. 'pro', 'elite'
 * @param {string}    billingCycle       'monthly' | 'yearly'
 * @param {string}    subscriptionDbId   Subscription._id (string)
 * @param {Date|null} periodEnd          Razorpay period end date (nullable)
 * @param {object}    [opts]             { session? } for transactional callers
 */
export async function activateSubscriptionPlan(userId, planType, billingCycle, subscriptionDbId, periodEnd = null, opts = {}) {
  if (!PLAN_HIERARCHY.includes(planType)) {
    throw new Error(`activateSubscriptionPlan: invalid plan "${planType}"`);
  }

  const now         = new Date();
  const durationMs  = PLAN_DURATION_DAYS[billingCycle] ?? 30;
  const planEndDate = periodEnd ?? new Date(now.getTime() + durationMs * 86_400_000);

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        subscriptionPlan:     planType,
        planStartDate:        now,
        planEndDate,
        activeSubscriptionId: new mongoose.Types.ObjectId(subscriptionDbId),
      },
    },
    { new: true, lean: true, ...opts }
  );

  if (!updated) throw new Error(`activateSubscriptionPlan: user ${userId} not found`);

  logger.info({ userId, planType, billingCycle, planEndDate, subscriptionDbId }, 'Subscription plan activated');
  return updated;
}

/**
 * revertToFree
 * ─────────────
 * Revert a user to the free tier (plan expiry / cancellation).
 *
 * @param {string} userId
 * @param {object} [opts]  { session? }
 */
export async function revertToFree(userId, opts = {}) {
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        subscriptionPlan:     'free',
        planStartDate:        null,
        planEndDate:          null,
        isCouponActive:       false,
        activeSubscriptionId: null,
      },
    },
    { new: true, lean: true, ...opts }
  );
  logger.info({ userId }, 'Plan reverted to free');
  return updated;
}

/**
 * cancelSubscriptionPlan
 * ───────────────────────
 * Called on subscription.cancelled, subscription.halted, or admin refund.
 * Reverts the user to free and clears the active subscription link.
 *
 * @param {string} userId              MongoDB ObjectId string
 * @param {string} subscriptionDbId    Subscription._id to validate ownership
 * @param {object} [opts]              { session? } for transactional callers
 */
export async function cancelSubscriptionPlan(userId, subscriptionDbId, opts = {}) {
  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      // Only clear if the cancelled sub is the one currently active
      $or: [
        { activeSubscriptionId: new mongoose.Types.ObjectId(subscriptionDbId) },
        { activeSubscriptionId: null },
      ],
    },
    {
      $set: {
        subscriptionPlan:     'free',
        planStartDate:        null,
        planEndDate:          null,
        isCouponActive:       false,
        activeSubscriptionId: null,
      },
    },
    { new: true, lean: true, ...opts }
  );

  if (updated) {
    logger.info({ userId, subscriptionDbId }, 'Subscription cancelled — user reverted to free');
  } else {
    logger.warn({ userId, subscriptionDbId }, 'cancelSubscriptionPlan: no matching user/subscription (may already be on different sub)');
  }
  return updated;
}

/**
 * flagUserAbuse
 * ─────────────
 * Increment abuseScore + set isSuspicious, then auto-block if threshold reached.
 * Always fire-and-forget safe (errors are caught internally).
 *
 * @param {string} userId
 * @param {number} [scoreIncrement=25]
 * @param {object} [opts]             { session? }
 */
export async function flagUserAbuse(userId, scoreIncrement = 25, opts = {}) {
  try {
    await User.updateOne(
      { _id: userId },
      {
        $set:  { 'securityFlags.isSuspicious': true, 'securityFlags.lastAbuseSignalAt': new Date() },
        $inc:  { 'securityFlags.abuseScore': scoreIncrement },
      },
      opts
    );
    await _enforceAbuseThreshold(userId, opts.session);
  } catch (err) {
    logger.error({ err, userId }, 'flagUserAbuse failed');
  }
}

/**
 * getUserPlanInfo
 * ───────────────
 * Returns a clean plan info object to send to the frontend.
 */
export async function getUserPlanInfo(userId) {
  const user = await User.findById(userId)
    .select('subscriptionPlan planStartDate planEndDate isCouponActive couponCodeUsed')
    .lean();

  if (!user) throw new Error('User not found');

  const effectivePlan = getEffectivePlan(user);
  const expired       = user.planEndDate && new Date(user.planEndDate) < new Date();

  return {
    plan:           effectivePlan,
    rawPlan:        user.subscriptionPlan || 'free',
    planStartDate:  user.planStartDate  ?? null,
    planEndDate:    user.planEndDate    ?? null,
    isCouponActive: user.isCouponActive ?? false,
    couponCodeUsed: user.couponCodeUsed ?? null,
    expired:        !!expired,
  };
}
