/**
 * RefundLog.js — Audit trail for all refund requests and actions
 *
 * RULES:
 *  - Every refund attempt (approved or rejected) is logged.
 *  - Admin userId is always captured.
 *  - Max one approved refund per subscriptionId (enforced in route).
 *  - Abuse pattern: multiple refund *attempts* from same user triggers flag.
 */

import mongoose from 'mongoose';

const refundLogSchema = new mongoose.Schema(
  {
    // ── Identifiers ──────────────────────────────────────────────────────────
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Razorpay payment being refunded ─────────────────────────────────────
    razorpayPaymentId: { type: String, required: true },

    // ── Decision ─────────────────────────────────────────────────────────────
    decision: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true,
    },

    // ── Refund details (if approved) ─────────────────────────────────────────
    razorpayRefundId: { type: String, default: null },   // from Razorpay response
    amountRefundedPaise: { type: Number, default: null },

    // ── Reason (mandatory for both approval and rejection) ───────────────────
    reason: { type: String, required: true, maxlength: 500 },

    // ── Rejection details ─────────────────────────────────────────────────────
    rejectionReason: { type: String, default: null },

    // ── Timestamps ────────────────────────────────────────────────────────────
    paymentCapturedAt: { type: Date, default: null },    // for 24-hour window check
  },
  { timestamps: true }
);

refundLogSchema.index({ subscriptionId: 1, decision: 1 });

export default mongoose.model('RefundLog', refundLogSchema);
