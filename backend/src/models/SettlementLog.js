/**
 * SettlementLog.js — Tracks Razorpay settlements (money reaching bank)
 *
 * Append-only: no deletes, no updates to existing records.
 */

import mongoose from 'mongoose';

const settlementLogSchema = new mongoose.Schema(
  {
    settlementId:  { type: String, required: true, unique: true, index: true },
    amount:        { type: Number, required: true },   // in paise
    feePaise:      { type: Number, default: 0 },
    taxPaise:      { type: Number, default: 0 },
    status:        { type: String, required: true },   // e.g. 'processed', 'pending'
    utrNo:         { type: String, default: null },    // bank UTR reference
    razorpayCreatedAt: { type: Date, default: null },  // from Razorpay's created_at
    syncedAt:      { type: Date, default: Date.now },  // when we synced this record
  },
  {
    timestamps: true,
    // Prevent any update or delete — immutable audit record
  }
);

export default mongoose.model('SettlementLog', settlementLogSchema);
