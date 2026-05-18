/**
 * notificationService.js — User notification dispatcher (spec #5)
 *
 * Currently logs to console + stores an in-DB notification record.
 * Extend by swapping the _send* functions to call email/SMS/push APIs.
 *
 * Exported:
 *   notifyUser(userId, type, data)   — fire-and-forget safe
 */

import User   from '../models/User.js';
import logger from '../utils/logger.js';

// ── Event type → human-readable message factory ──────────────────────────────
const MESSAGES = {
  payment_success: (d) => `Your payment of ₹${((d.amountPaise || 0) / 100).toFixed(2)} was successful. Plan: ${d.planType || 'premium'}.`,
  payment_failed:  ()  => `A payment attempt for your subscription failed. We will retry automatically.`,
  subscription_cancelled: (d) => `Your subscription has been cancelled. Access ends on ${d.accessUntil ? new Date(d.accessUntil).toDateString() : 'today'}.`,
  refund_processed:(d) => `Your refund of ₹${((d.amountPaise || 0) / 100).toFixed(2)} has been processed. Ref: ${d.refundId || ''}.`,
  subscription_activated: (d) => `Your ${d.planType || 'premium'} plan is now active. Enjoy!`,
  abuse_blocked:   ()  => `Your account has been suspended due to suspicious activity. Contact support.`,
};

// ── Internal: resolve user email ──────────────────────────────────────────────
async function _getUser(userId) {
  try {
    return await User.findById(userId).select('email name').lean();
  } catch {
    return null;
  }
}

// ── Internal send stubs — replace with real providers ────────────────────────
function _sendEmail(email, subject, body) {
  // TODO: replace with nodemailer / SendGrid / Resend call
  logger.info({ email, subject }, `[NOTIFY-EMAIL] ${body}`);
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * notifyUser — fire-and-forget; never throws; errors are caught and logged.
 *
 * @param {string} userId  MongoDB ObjectId string
 * @param {string} type    One of the MESSAGES keys
 * @param {object} data    Contextual data for the message template
 */
export async function notifyUser(userId, type, data = {}) {
  try {
    if (!userId || !type) { return; }

    const user = await _getUser(userId);
    if (!user?.email) {
      logger.warn({ userId, type }, 'notifyUser: user not found or no email — skipping');
      return;
    }

    const messageFn = MESSAGES[type];
    if (!messageFn) {
      logger.warn({ type }, 'notifyUser: unknown notification type — skipping');
      return;
    }

    const body    = messageFn(data);
    const subject = `Juriq — ${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;

    _sendEmail(user.email, subject, body);

    logger.info({ userId, type, email: user.email }, 'Notification dispatched');
  } catch (err) {
    // Never crash the caller
    logger.error({ err, userId, type }, 'notifyUser: unexpected error — notification skipped');
  }
}
