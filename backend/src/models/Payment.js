import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  razorpayOrderId:     { type: String, required: true, unique: true, index: true },
  razorpayPaymentId:   { type: String, default: null },
  razorpaySignature:   { type: String, default: null },
  plan:                { type: String, enum: ['basic', 'pro', 'premium', 'elite'], required: true },
  billingCycle:        { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  amountPaise:         { type: Number, required: true },   // amount in paise (INR × 100)
  currency:            { type: String, default: 'INR' },
  status:              { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
  webhookProcessed:    { type: Boolean, default: false },   // idempotency guard
  webhookProcessedAt:  { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
