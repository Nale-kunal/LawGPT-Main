/**
 * subscriptionReminders.js — Daily subscription lifecycle reminder job
 *
 * Runs daily at 09:00 AM via cronWorker.js.
 *
 * Sends reminders for:
 *  1. Subscriptions expiring in 7, 3, or 1 days  → renewal_reminder
 *  2. Subscriptions in grace_period               → grace_period_warning
 *
 * Idempotent: uses Redis to prevent duplicate sends within the same day.
 */

import User    from '../models/User.js';
import logger  from '../utils/logger.js';
import { notifyUser } from '../services/notificationService.js';
import { PLAN_PRICING } from '../config/planFeatures.js';

const REMINDER_DAYS = [7, 3, 1]; // days before expiry to remind

/**
 * getDedupKey — Redis dedup key for a user+reminder combo.
 * Prevents the same reminder from firing twice in the same calendar day.
 */
function getDedupKey(userId, type, daysLeft) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `reminder:${type}:${userId}:${daysLeft}:${today}`;
}

/**
 * checkAndSetDedup — returns true if reminder was already sent today.
 */
async function checkAndSetDedup(redis, key) {
  try {
    if (!redis?.isAvailable()) {return false;} // no Redis → always send
    const existing = await redis.raw()?.get(key);
    if (existing) {return true;}
    await redis.raw()?.set(key, '1', 'EX', 86400); // TTL: 24h
    return false;
  } catch {
    return false; // fail open — send the email
  }
}

// ── Main runner ────────────────────────────────────────────────────────────────
export async function runSubscriptionReminders() {
  logger.info('Subscription reminders: starting daily run');

  // Lazily import redis wrapper
  const { redis } = await import('../utils/redis.js').catch(() => ({ redis: null }));

  const now     = new Date();
  let sent      = 0;
  let skipped   = 0;

  // ── 1. Renewal reminders ───────────────────────────────────────────────────
  for (const days of REMINDER_DAYS) {
    // Window: users whose planEndDate is within [days-0.5d, days+0.5d]
    const windowStart = new Date(now.getTime() + (days - 0.5) * 86_400_000);
    const windowEnd   = new Date(now.getTime() + (days + 0.5) * 86_400_000);

    const users = await User.find({
      subscriptionPlan: { $ne: 'free' },
      planEndDate: { $gte: windowStart, $lt: windowEnd },
      'securityFlags.blocked': { $ne: true },
    })
      .select('_id email name subscriptionPlan planEndDate')
      .lean();

    for (const user of users) {
      const key = getDedupKey(user._id.toString(), 'renewal', days);
      const alreadySent = await checkAndSetDedup(redis, key);
      if (alreadySent) { skipped++; continue; }

      const plan = user.subscriptionPlan;
      const pricing = PLAN_PRICING[plan] || {};
      const billingCycle = 'monthly'; // default; could be stored on user
      const amount = pricing[billingCycle] || 0;

      await notifyUser(user._id.toString(), 'renewal_reminder', {
        planType:    plan,
        renewalDate: user.planEndDate?.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        amount,
        daysLeft:    days,
      });

      sent++;
      logger.info({ userId: user._id, plan, daysLeft: days }, 'Renewal reminder sent');
    }
  }

  // ── 2. Grace period warnings (plan expired but within 3-day grace window) ──
  const graceCutoff = new Date(now.getTime() - 3 * 86_400_000); // expired up to 3 days ago
  const expiredUsers = await User.find({
    subscriptionPlan: { $ne: 'free' },
    planEndDate: { $gte: graceCutoff, $lt: now },
    'securityFlags.blocked': { $ne: true },
  })
    .select('_id email name subscriptionPlan planEndDate')
    .lean();

  for (const user of expiredUsers) {
    const key = getDedupKey(user._id.toString(), 'grace', 0);
    const alreadySent = await checkAndSetDedup(redis, key);
    if (alreadySent) { skipped++; continue; }

    const gracePeriodEnds = new Date(user.planEndDate.getTime() + 3 * 86_400_000)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    await notifyUser(user._id.toString(), 'grace_period_warning', {
      planType:        user.subscriptionPlan,
      gracePeriodEnds,
    });

    sent++;
    logger.info({ userId: user._id }, 'Grace period warning sent');
  }

  logger.info({ sent, skipped }, 'Subscription reminders: daily run complete');
  return { sent, skipped };
}
