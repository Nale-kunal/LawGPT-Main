/**
 * planService.js — Server-only plan mutation functions
 *
 * RULE: This is the ONLY place in the codebase that may raise a user's
 * subscriptionPlan.  No route, controller, or API handler may call
 * User.findByIdAndUpdate({ subscriptionPlan: ... }) directly.
 */

import User from '../models/User.js';
import logger from '../utils/logger.js';
import { PLAN_HIERARCHY, PLAN_DURATION_DAYS, getEffectivePlan } from '../config/planFeatures.js';

/**
 * updateUserPlan
 * ──────────────
 * Atomically set a user's subscription plan with a duration.
 *
 * @param {string} userId          MongoDB ObjectId string
 * @param {string} plan            One of PLAN_HIERARCHY values (not 'free' from here)
 * @param {string} billingCycle    'monthly' | 'yearly' | 'coupon'
 * @param {number} [overrideDays]  If set, use this instead of PLAN_DURATION_DAYS
 * @returns {Promise<object>}      Updated user document (lean)
 */
export async function updateUserPlan(userId, plan, billingCycle = 'monthly', overrideDays = null) {
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
    { new: true, lean: true }
  );

  if (!updated) throw new Error(`User ${userId} not found`);

  logger.info({ userId, plan, billingCycle, planEndDate }, 'Plan updated successfully');
  return updated;
}

/**
 * revertToFree
 * ─────────────
 * Revert a user to the free tier (plan expiry / cancellation).
 */
export async function revertToFree(userId) {
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        subscriptionPlan: 'free',
        planStartDate:    null,
        planEndDate:      null,
        isCouponActive:   false,
      },
    },
    { new: true, lean: true }
  );
  logger.info({ userId }, 'Plan reverted to free');
  return updated;
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
