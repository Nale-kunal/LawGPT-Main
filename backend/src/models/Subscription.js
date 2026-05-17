/**
 * Subscription.js — Razorpay Subscription record
 *
 * Each row tracks a single Razorpay subscription for a user.
 * processed_events stores the Razorpay event IDs we have already handled
 * so duplicate webhook deliveries are silently idempotent.
 *
 * STATUS MACHINE:
 *   created → active  (subscription.charged)
 *   active  → cancelled (subscription.cancelled / subscription.completed)
 *   active  → failed  (subscription.halted / payment.failed repeatedly)
 *   created → failed  (payment.failed before first charge)
 */

import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    // ── Ownership ────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Razorpay identifiers ─────────────────────────────────────────────────
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPlanId: {
      type: String,
      required: true,
    },

    // ── Plan metadata (server-controlled — NEVER from frontend) ──────────────
    planType: {
      type: String,
      enum: ['basic', 'pro', 'premium', 'elite'],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    amountPaise: {
      type: Number,
      required: true,
    },

    // ── Subscription lifecycle ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['created', 'active', 'cancelled', 'failed', 'halted', 'completed'],
      default: 'created',
      index: true,
    },

    // ── Idempotency — stores Razorpay event IDs we have processed ────────────
    // CRITICAL: Checked atomically via $ne query — no in-memory check.
    processedEvents: {
      type: [String],
      default: [],
    },

    // Timestamp of last successfully processed event (set atomically with $push)
    lastEventAt: { type: Date, default: null },

    // ── Concurrency safety — webhook processing lock (spec #6) ──────────────
    // Set to true atomically before processing; released after.
    // lockExpiresAt prevents deadlocks: stale locks older than 30s are overrideable.
    processing:    { type: Boolean, default: false, index: true },
    lockExpiresAt: { type: Date,    default: null  },  // TTL for the processing lock

    // ── Razorpay customer binding (spec #7) ───────────────────────────────
    // Stored at creation from rzpSub.customer_id; validated in webhook against payment.customer_id.
    customerId: { type: String, default: null },

    // ── Payment tracking ─────────────────────────────────────────────────────
    lastPaymentId:   { type: String, default: null },     // last successful razorpay payment_id
    failedAttempts:  { type: Number, default: 0 },        // consecutive payment failures
    lastFailedAt:    { type: Date,   default: null },

    // ── Expiry (set by server on each successful charge) ─────────────────────
    currentPeriodEnd:   { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },

    // ── Refund tracking ──────────────────────────────────────────────────────
    refunded:          { type: Boolean, default: false },    // one refund max
    refundedAt:        { type: Date,    default: null },
    refundReason:      { type: String,  default: null },
    refundPaymentId:   { type: String,  default: null },     // razorpay refund ID
    // Idempotency lock: set true before Razorpay call, unset after. Prevents race conditions (spec #1)
    refundInProgress:  { type: Boolean, default: false },

    // ── Cancellation ─────────────────────────────────────────────────────────
    cancelledAt:      { type: Date,    default: null },
    cancelReason:     { type: String,  default: null },
    // cancelRequested: user asked to cancel at period-end (spec #9).
    // Access continues until currentPeriodEnd; plan downgrade happens on webhook.
    cancelRequested:  { type: Boolean, default: false },
    cancelRequestedAt:{ type: Date,    default: null },
  },
  { timestamps: true }
);

// Compound index for fast status queries per user
subscriptionSchema.index({ userId: 1, status: 1 });

// ── DB-level enforcement: at most ONE document per user in created/active state ─
// This prevents race conditions where two concurrent requests both pass the
// application-level duplicate check simultaneously.
subscriptionSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['created', 'active'] } },
    name: 'unique_active_subscription_per_user',
  }
);

export default mongoose.model('Subscription', subscriptionSchema);
