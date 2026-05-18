/**
 * requirePlan.js — Route-level plan gating middleware factory
 *
 * Spec #15 implementation:
 *   function requirePlan(plans) {
 *     return (req, res, next) => {
 *       if (!plans.includes(req.user.current_plan)) { return res.status(403) }
 *       next();
 *     }
 *   }
 *
 * This version is hardened beyond the spec:
 *  - Reads plan from DB (never from JWT — NEVER trust client)
 *  - Resolves effective plan (respects expiry)
 *  - Atomically reverts expired users to free in the background
 *
 * Usage:
 *   import { requirePlan } from '../middleware/requirePlan.js';
 *
 *   // Single plan:
 *   router.get('/pro-feature', requireAuth, requirePlan('pro'), handler);
 *
 *   // Multiple allowed plans (OR logic):
 *   router.get('/premium-plus', requireAuth, requirePlan(['premium', 'elite']), handler);
 *
 *   // Minimum tier (inclusive — all tiers at or above):
 *   router.get('/any-paid', requireAuth, requirePlan.atLeast('basic'), handler);
 */

import User   from '../models/User.js';
import logger from '../utils/logger.js';
import { PLAN_HIERARCHY, getEffectivePlan, planCanAccess } from '../config/planFeatures.js';

// ─── Internal: fetch + resolve effective plan from DB ─────────────────────────
async function resolveEffectivePlan(userId) {
  const user = await User.findById(userId)
    .select('subscriptionPlan planEndDate isCouponActive')
    .lean();

  if (!user) { return 'free'; }

  // Atomic expiry revert — condition in query prevents race conditions (spec #5)
  const now = new Date();
  if (user.planEndDate && new Date(user.planEndDate) < now) {
    User.updateOne(
      {
        _id: userId,
        planEndDate:      { $lt: now },    // guard: still expired at write time
        subscriptionPlan: { $ne: 'free' }, // guard: not already reverted
      },
      {
        $set: {
          subscriptionPlan:     'free',
          planEndDate:          null,
          planStartDate:        null,
          isCouponActive:       false,
          activeSubscriptionId: null,
        },
      }
    ).catch(err => logger.error({ err }, 'requirePlan: atomic expiry revert failed'));

    return 'free';
  }

  return getEffectivePlan(user);
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePlan(allowedPlans)
// allowedPlans: string | string[]
// ─────────────────────────────────────────────────────────────────────────────
export function requirePlan(allowedPlans) {
  const allowed = Array.isArray(allowedPlans) ? allowedPlans : [allowedPlans];

  // Validate plan names at startup time (fail loudly if mistyped in route)
  for (const p of allowed) {
    if (!PLAN_HIERARCHY.includes(p)) {
      throw new Error(`requirePlan: unknown plan "${p}". Valid plans: ${PLAN_HIERARCHY.join(', ')}`);
    }
  }

  return async (req, res, next) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required.' });
      }

      const effectivePlan = await resolveEffectivePlan(req.user.userId);

      if (!allowed.includes(effectivePlan)) {
        return res.status(403).json({
          error:        'UPGRADE_REQUIRED',
          message:      `This feature requires one of the following plans: ${allowed.join(', ')}. Your current plan is "${effectivePlan}".`,
          currentPlan:  effectivePlan,
          requiredPlans: allowed,
        });
      }

      req.effectivePlan = effectivePlan;
      return next();

    } catch (err) {
      logger.error({ err }, 'requirePlan: DB error — failing open');
      return next(); // fail-open to avoid false lockouts on DB hiccup
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePlan.atLeast(minimumPlan)
// Allows the minimum plan AND all plans above it in the hierarchy.
// ─────────────────────────────────────────────────────────────────────────────
requirePlan.atLeast = function atLeast(minimumPlan) {
  if (!PLAN_HIERARCHY.includes(minimumPlan)) {
    throw new Error(`requirePlan.atLeast: unknown plan "${minimumPlan}"`);
  }

  return async (req, res, next) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required.' });
      }

      const effectivePlan = await resolveEffectivePlan(req.user.userId);

      if (!planCanAccess(effectivePlan, minimumPlan)) {
        return res.status(403).json({
          error:        'UPGRADE_REQUIRED',
          message:      `This feature requires the "${minimumPlan}" plan or higher. Your current plan is "${effectivePlan}".`,
          currentPlan:  effectivePlan,
          minimumPlan,
        });
      }

      req.effectivePlan = effectivePlan;
      return next();

    } catch (err) {
      logger.error({ err }, 'requirePlan.atLeast: DB error — failing open');
      return next();
    }
  };
};

export default requirePlan;
