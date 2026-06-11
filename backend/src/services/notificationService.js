/**
 * notificationService.js — User notification dispatcher
 *
 * Dispatches typed notifications via queueEmail (BullMQ → Resend).
 * All calls are fire-and-forget safe — errors are caught and logged.
 *
 * Exported:
 *   notifyUser(userId, type, data)   — fire-and-forget
 */

import User   from '../models/User.js';
import logger from '../utils/logger.js';
import { queueEmail } from './emailService.js';
import {
  paymentSuccessEmail,
  paymentFailedEmail,
  subscriptionCancelledEmail,
  renewalReminderEmail,
  trialEndingEmail,
  invoiceGeneratedEmail,
  gracePeriodWarningEmail,
} from './emailTemplates.js';

// ── Event → template factory map ─────────────────────────────────────────────
const TEMPLATE_MAP = {
  payment_success:           paymentSuccessEmail,
  payment_failed:            paymentFailedEmail,
  subscription_cancelled:    subscriptionCancelledEmail,
  renewal_reminder:          renewalReminderEmail,
  trial_ending:              trialEndingEmail,
  invoice_generated:         invoiceGeneratedEmail,
  grace_period_warning:      gracePeriodWarningEmail,
  subscription_activated:    (d) => paymentSuccessEmail(d),
  refund_processed:          (d) => ({
    subject: 'Refund Processed — Juriq',
    html: `<p>Hi ${d.name || 'there'},<br>Your refund of ₹${((d.amountPaise || 0) / 100).toFixed(2)} has been processed. Ref: ${d.refundId || ''}.<br>It may take 5-7 business days to reflect in your account.</p>`,
    text:  `Refund of ₹${((d.amountPaise || 0) / 100).toFixed(2)} processed. Ref: ${d.refundId || ''}.`,
  }),
  abuse_blocked:             () => ({
    subject: 'Account Suspended — Juriq',
    html: '<p>Your account has been suspended due to suspicious activity. Please contact support.</p>',
    text: 'Your account has been suspended. Contact support@juriq.app.',
  }),
};

// ── Internal: resolve user info ───────────────────────────────────────────────
async function _getUser(userId) {
  try {
    return await User.findById(userId).select('email name').lean();
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * notifyUser — fire-and-forget; never throws; errors are caught and logged.
 *
 * @param {string} userId  MongoDB ObjectId string
 * @param {string} type    One of TEMPLATE_MAP keys
 * @param {object} data    Contextual data passed to the template
 */
export async function notifyUser(userId, type, data = {}) {
  try {
    if (!userId || !type) {return;}

    const user = await _getUser(userId);
    if (!user?.email) {
      logger.warn({ userId, type }, 'notifyUser: user not found or no email — skipping');
      return;
    }

    const templateFn = TEMPLATE_MAP[type];
    if (!templateFn) {
      logger.warn({ type }, 'notifyUser: unknown notification type — skipping');
      return;
    }

    const enrichedData = { ...data, name: user.name };
    const { subject, html, text } = templateFn(enrichedData);

    await queueEmail({ to: user.email, subject, html, text });

    logger.info({ userId, type, email: user.email }, 'Notification queued');
  } catch (err) {
    // Never crash the caller
    logger.error({ err, userId, type }, 'notifyUser: unexpected error — notification skipped');
  }
}
