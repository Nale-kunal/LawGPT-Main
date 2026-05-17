/**
 * PaymentLog.js — Immutable audit trail for every Razorpay webhook event
 *
 * RULES:
 *  - Every webhook event (success, failure, duplicate, rejected) is logged here.
 *  - Raw payload is stored for forensic replay capability.
 *  - Documents are NEVER deleted (SOC2 / financial audit compliance).
 *  - Index on subscriptionId + eventType for fast admin queries.
 */

import mongoose from 'mongoose';

const paymentLogSchema = new mongoose.Schema(
  {
    // ── Link to subscription ─────────────────────────────────────────────────
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },

    // ── Who owns this event ──────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ── Razorpay identifiers ─────────────────────────────────────────────────
    razorpaySubscriptionId: { type: String, default: null, index: true },
    razorpayPaymentId:      { type: String, default: null },
    razorpayEventId:        { type: String, default: null, index: true },

    // ── Event metadata ───────────────────────────────────────────────────────
    eventType: {
      type: String,
      required: true,
      index: true,
      // e.g. subscription.charged, subscription.cancelled, payment.failed,
      //      webhook.signature_invalid, webhook.duplicate, webhook.unknown
    },

    // ── Processing result ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['processed', 'duplicate', 'rejected', 'error', 'ignored'],
      default: 'processed',
    },

    // ── Raw payload for forensic replay ─────────────────────────────────────
    // Stored as Mixed (not String) so it remains queryable.
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Rejection/error details ──────────────────────────────────────────────
    rejectionReason: { type: String, default: null },

    // ── Amount (for tamper-check audit trail) ────────────────────────────────
    amountPaise: { type: Number, default: null },
  },
  {
    timestamps: true,
    // Prevent updates — this is append-only
    versionKey: false,
  }
);

// TTL: keep payment logs forever (do NOT add expireAfterSeconds)
// If you want purging after N years, add a separate archival job.

export default mongoose.model('PaymentLog', paymentLogSchema);
