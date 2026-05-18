/**
 * reconciliation.js — Subscription reconciliation cron (specs #3, #6, #11)
 *
 * Job 1 (every 5 min): Fix subscriptions stuck in "created/failed" that Razorpay
 *   considers active — catches missed subscription.charged webhooks.
 *
 * Job 2 (every 10 min): Sync active subscriptions — cancel any that Razorpay has
 *   cancelled/halted but whose webhook was missed.
 *
 * Both jobs are fail-safe: errors are caught and logged; they never crash the process.
 *
 * Usage: call startReconciliationJobs() from index.js after DB connects.
 */

import Razorpay  from 'razorpay';
import Subscription from '../models/Subscription.js';
import logger    from '../utils/logger.js';
import { activateSubscriptionPlan, cancelSubscriptionPlan } from './planService.js';
import mongoose  from 'mongoose';

// ── Razorpay client ───────────────────────────────────────────────────────────
let _rzp = null;
function getRzp() {
  if (!_rzp) {
    const key_id     = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) { throw new Error('Razorpay keys not configured'); }
    _rzp = new Razorpay({ key_id, key_secret });
  }
  return _rzp;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 1: Reconciliation — activate subscriptions that were missed (spec #3)
// Runs every 5 minutes.
// ─────────────────────────────────────────────────────────────────────────────
async function runReconciliationJob() {
  try {
    logger.info('Reconciliation job: starting');

    const rzp     = getRzp();
    // Find subs that are pending/failed in DB but may be active on Razorpay
    const pending = await Subscription.find({
      status: { $in: ['created', 'failed'] },
    }).lean();

    logger.info({ count: pending.length }, 'Reconciliation: checking pending subscriptions');

    for (const sub of pending) {
      try {
        const rzpSub = await rzp.subscriptions.fetch(sub.razorpaySubscriptionId);

        if (rzpSub.status === 'active') {
          // Razorpay says active — we missed the webhook. Activate now.
          logger.warn({ subId: sub._id, rzpSubId: sub.razorpaySubscriptionId }, 'Reconciliation: activating missed subscription');

          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await Subscription.updateOne(
                { _id: sub._id },
                { $set: { status: 'active', reconciliationSource: 'cron', reconciledAt: new Date() } },
                { session }
              );
              await activateSubscriptionPlan(
                sub.userId.toString(), sub.planType, sub.billingCycle,
                sub._id.toString(), null, { session }
              );
            });
          } finally {
            await session.endSession();
          }
        } else if (['cancelled', 'completed', 'halted', 'expired'].includes(rzpSub.status)) {
          // Terminal state on Razorpay — mark as failed in DB
          await Subscription.updateOne(
            { _id: sub._id },
            { $set: { status: 'cancelled', cancelReason: `Reconciliation: Razorpay status=${rzpSub.status}`, cancelledAt: new Date() } }
          );
          logger.info({ subId: sub._id, rzpStatus: rzpSub.status }, 'Reconciliation: marked terminal subscription cancelled');
        }
      } catch (subErr) {
        logger.error({ subErr, subId: sub._id }, 'Reconciliation job: error processing subscription — skipping');
      }
    }

    logger.info('Reconciliation job: complete');
  } catch (err) {
    // Spec #11: never crash; always log
    logger.error({ err }, 'Reconciliation job: FATAL error in job — cron continues');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 2: Active subscription sync — cancel if Razorpay disagrees (spec #6)
// Runs every 10 minutes.
// ─────────────────────────────────────────────────────────────────────────────
async function runSyncJob() {
  try {
    logger.info('Subscription sync job: starting');

    const rzp        = getRzp();
    const activeSubs = await Subscription.find({ status: 'active' }).lean();

    logger.info({ count: activeSubs.length }, 'Sync job: checking active subscriptions');

    for (const sub of activeSubs) {
      try {
        const rzpSub = await rzp.subscriptions.fetch(sub.razorpaySubscriptionId);

        if (!['active', 'authenticated'].includes(rzpSub.status)) {
          // Razorpay says NOT active — we missed a cancel/halt/complete webhook
          logger.warn({ subId: sub._id, rzpStatus: rzpSub.status }, 'Sync job: active in DB but not on Razorpay — cancelling');

          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await Subscription.updateOne(
                { _id: sub._id },
                { $set: { status: 'cancelled', cancelReason: `Sync: Razorpay status=${rzpSub.status}`, cancelledAt: new Date() } },
                { session }
              );
              await cancelSubscriptionPlan(sub.userId.toString(), sub._id.toString(), { session });
            });
          } finally {
            await session.endSession();
          }
        }
      } catch (subErr) {
        logger.error({ subErr, subId: sub._id }, 'Sync job: error processing subscription — skipping');
      }
    }

    logger.info('Subscription sync job: complete');
  } catch (err) {
    logger.error({ err }, 'Subscription sync job: FATAL error — cron continues');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cold-start recovery (spec #10)
// Clears any processing locks that survived a server crash.
// Called once on startup BEFORE jobs begin.
// ─────────────────────────────────────────────────────────────────────────────
export async function clearStaleLocks() {
  try {
    const result = await Subscription.updateMany(
      { processing: true },
      { $set: { processing: false }, $unset: { lockExpiresAt: '' } }
    );
    if (result.modifiedCount > 0) {
      logger.warn({ count: result.modifiedCount }, 'Cold-start: cleared stale processing locks from previous crash');
    } else {
      logger.info('Cold-start: no stale locks found');
    }
  } catch (err) {
    logger.error({ err }, 'Cold-start: clearStaleLocks failed');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Start all background jobs
// ─────────────────────────────────────────────────────────────────────────────
export function startReconciliationJobs() {
  // Spec #10: clear stale locks on startup
  clearStaleLocks();

  // Job 1: every 5 minutes
  setInterval(runReconciliationJob, 5 * 60 * 1000);
  // Job 2: every 10 minutes
  setInterval(runSyncJob, 10 * 60 * 1000);

  // Run immediately on startup to catch any drift from downtime
  setTimeout(runReconciliationJob, 10_000);
  setTimeout(runSyncJob, 30_000);

  logger.info('Reconciliation and sync cron jobs started (5min / 10min intervals)');
}
