import User from '../models/User.js';
import logger from '../utils/logger.js';
import { FEATURE_MAP, planCanAccess, getEffectivePlan } from '../config/planFeatures.js';

/**
 * checkPlanAccess(featureName)
 * ─────────────────────────────
 * Middleware factory — place AFTER requireAuth on any route that needs gating.
 *
 * Behaviour:
 *  1. Read subscriptionPlan from DB (authoritative — no frontend trust).
 *  2. If planEndDate has passed → atomically revert user to free.
 *  3. If effective plan cannot access the feature → 403 ACCESS_DENIED.
 *  4. On any internal error → fail-open (call next()) to avoid false lockouts.
 *
 * Usage:
 *   router.use(requireAuth);
 *   router.use(checkPlanAccess('documents'));
 */
export const checkPlanAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.userId) return next(); // requireAuth guards this already

      // Always read from DB — never trust JWT claim for plan
      const user = await User.findById(req.user.userId).select(
        'subscriptionPlan planEndDate isCouponActive'
      ).lean();

      if (!user) return next();

      // ── Expiry check + atomic revert ─────────────────────────────────────
      const now = new Date();
      if (user.planEndDate && new Date(user.planEndDate) < now) {
        // Write-through: revert in DB (fire-and-forget, non-blocking)
        User.findByIdAndUpdate(req.user.userId, {
          $set: {
            subscriptionPlan: 'free',
            planEndDate:      null,
            planStartDate:    null,
            isCouponActive:   false,
          },
        }).catch(err => logger.error({ err }, 'plan-expiry revert failed'));

        user.subscriptionPlan = 'free';
      }

      const effectivePlan  = getEffectivePlan(user);
      const requiredPlan   = FEATURE_MAP[featureName] ?? 'free';

      if (!planCanAccess(effectivePlan, requiredPlan)) {
        return res.status(403).json({
          error:        'ACCESS_DENIED',
          message:      `Your ${effectivePlan} plan does not include access to "${featureName}". Upgrade to ${requiredPlan} or higher.`,
          featureName,
          requiredPlan,
          currentPlan:  effectivePlan,
        });
      }

      // Attach effective plan to request for downstream use
      req.effectivePlan = effectivePlan;
      return next();

    } catch (err) {
      logger.error({ err }, 'checkPlanAccess error — failing open');
      return next(); // fail-open: don't crash the app
    }
  };
};
