/**
 * AlertQueue.js — Persistent alert queue for reliable delivery with retries (spec #2)
 * Append-only: alerts are never deleted, only status-transitioned.
 */
import mongoose from 'mongoose';

const alertQueueSchema = new mongoose.Schema(
  {
    type:       { type: String, required: true, index: true },
    severity:   { type: String, default: 'MEDIUM' },
    payload:    { type: mongoose.Schema.Types.Mixed, default: {} },
    status:     { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending', index: true },
    retries:    { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt:{ type: Date,   default: Date.now, index: true },
    lastError:  { type: String, default: null },
    deliveredAt:{ type: Date,   default: null },
    failedAt:   { type: Date,   default: null },
  },
  { timestamps: true }
);

alertQueueSchema.index({ status: 1, nextRetryAt: 1 });

export default mongoose.model('AlertQueue', alertQueueSchema);
