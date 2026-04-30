/**
 * subscription.js — Coupon + Plan Info routes
 *
 * POST /api/v1/subscription/apply-coupon
 * GET  /api/v1/subscription/plan
 */

import express from 'express';
import { requireAuth }      from '../middleware/auth-jwt.js';
import { rateLimit }        from 'express-rate-limit';
import User                 from '../models/User.js';
import CouponUsageLog       from '../models/CouponUsageLog.js';
import { COUPONS }          from '../config/planFeatures.js';
import { updateUserPlan, getUserPlanInfo } from '../services/planService.js';
import logger               from '../utils/logger.js';

const router = express.Router();
router.use(requireAuth);

// ─── Coupon rate-limiter: max 5 attempts per user per hour ────────────────────
const couponLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max:      5,
  keyGenerator: (req) => `coupon:${req.user.userId}`,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many coupon attempts. Please wait before trying again.' },
});

// ─── GET /plan ────────────────────────────────────────────────────────────────
router.get('/plan', async (req, res) => {
  try {
    const info = await getUserPlanInfo(req.user.userId);
    return res.json(info);
  } catch (err) {
    logger.error({ err }, 'GET /plan error');
    return res.status(500).json({ error: 'Failed to fetch plan info' });
  }
});

// ─── POST /apply-coupon ───────────────────────────────────────────────────────
router.post('/apply-coupon', couponLimiter, async (req, res) => {
  const ip = req.ip;
  try {
    const { couponCode } = req.body;

    if (!couponCode || typeof couponCode !== 'string') {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'couponCode is required' });
    }

    const code       = couponCode.trim().toUpperCase();
    const couponDef  = COUPONS[code];

    // ── Log attempt (success=false until proven) ──────────────────────────
    const logEntry = { userId: req.user.userId, couponCode: code, ipAddress: ip, success: false };

    if (!couponDef) {
      await CouponUsageLog.create({ ...logEntry, reason: 'Invalid coupon code' });
      return res.status(400).json({ error: 'INVALID_COUPON', message: 'Invalid coupon code' });
    }

    // ── Max daily abuse check ─────────────────────────────────────────────
    const dayAgo = new Date(Date.now() - 86_400_000);
    const recentAttempts = await CouponUsageLog.countDocuments({
      userId: req.user.userId,
      usedAt: { $gte: dayAgo },
    });

    if (recentAttempts >= 5) {
      await CouponUsageLog.create({ ...logEntry, reason: 'Daily attempt limit reached' });
      return res.status(429).json({
        error:   'TOO_MANY_ATTEMPTS',
        message: 'You have exceeded the daily coupon attempt limit.',
      });
    }

    // ── Per-user one-time use check ───────────────────────────────────────
    const user = await User.findById(req.user.userId).select('couponCodeUsed subscriptionPlan planEndDate isCouponActive').lean();

    if (user.couponCodeUsed === code) {
      await CouponUsageLog.create({ ...logEntry, reason: 'Coupon already used by this user' });
      return res.status(409).json({
        error:   'COUPON_ALREADY_USED',
        message: 'You have already used this coupon code.',
      });
    }

    // ── Apply coupon ──────────────────────────────────────────────────────
    await updateUserPlan(req.user.userId, couponDef.grantPlan, 'coupon', couponDef.durationDays);

    // Mark coupon used on user document
    await User.findByIdAndUpdate(req.user.userId, {
      $set: { couponCodeUsed: code, isCouponActive: true },
    });

    // Log success
    await CouponUsageLog.create({ ...logEntry, success: true, reason: null });

    const planInfo = await getUserPlanInfo(req.user.userId);
    logger.info({ userId: req.user.userId, code }, 'Coupon applied successfully');

    return res.json({
      success: true,
      message: `Coupon applied! You now have ${couponDef.grantPlan} access for ${couponDef.durationDays} days.`,
      plan: planInfo,
    });

  } catch (err) {
    logger.error({ err }, 'POST /apply-coupon error');
    return res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

export default router;
