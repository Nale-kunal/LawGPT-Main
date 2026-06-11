/**
 * emailService.js — Production email service with Resend
 *
 * Abstraction layer over Resend API (swap provider here if needed).
 * All emails are queued through BullMQ for retry-safe delivery.
 *
 * Exported:
 *   sendEmail({ to, subject, html, text })   — low-level send
 *   queueEmail(params)                        — enqueue for async sending
 */

import logger from '../utils/logger.js';

// ── Lazy Resend client ────────────────────────────────────────────────────────
let _resend = null;
function getResend() {
  if (_resend) {return _resend;}
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not set — emails will be logged only (dev mode)');
    return null;
  }
  // Dynamically import resend so the app boots even without the package in dev
  return import('resend').then(({ Resend }) => {
    _resend = new Resend(apiKey);
    return _resend;
  }).catch(() => {
    logger.warn('resend package not installed — emails logged only. Run: npm install resend');
    return null;
  });
}

// ── From address ──────────────────────────────────────────────────────────────
const FROM_ADDRESS = process.env.EMAIL_FROM || 'Juriq <noreply@juriq.app>';

// ── Low-level send ────────────────────────────────────────────────────────────
/**
 * sendEmail — sends one transactional email.
 * Returns { success, messageId? } — never throws.
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const client = await getResend();

    if (!client) {
      // Dev-mode fallback: log the email
      logger.info({ to, subject, body: text || '(html only)' }, '[EMAIL-DEV] Would send email');
      return { success: true, messageId: 'dev-mode' };
    }

    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (error) {
      logger.error({ error, to, subject }, 'Resend API error');
      return { success: false, error: error.message };
    }

    logger.info({ messageId: data?.id, to, subject }, 'Email sent successfully');
    return { success: true, messageId: data?.id };

  } catch (err) {
    logger.error({ err, to, subject }, 'sendEmail: unexpected error');
    return { success: false, error: err.message };
  }
}

// ── Queue-based send (preferred — retry-safe) ─────────────────────────────────
/**
 * queueEmail — adds an email job to BullMQ email queue.
 * Falls back to direct send if Redis/queue not available.
 */
export async function queueEmail(params) {
  try {
    // Try to use BullMQ queue if available
    const { getEmailQueue } = await import('../workers/emailWorker.js').catch(() => ({ getEmailQueue: null }));
    if (getEmailQueue) {
      const queue = getEmailQueue();
      if (queue) {
        await queue.add('send_email', params, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        });
        return;
      }
    }
    // Fallback: send directly
    await sendEmail(params);
  } catch (err) {
    logger.error({ err }, 'queueEmail failed — sending directly');
    await sendEmail(params);
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
