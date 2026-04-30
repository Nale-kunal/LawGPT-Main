import mongoose from 'mongoose';

const couponUsageLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  couponCode: { type: String, required: true, uppercase: true },
  usedAt:     { type: Date, default: Date.now },
  ipAddress:  { type: String, default: null },
  success:    { type: Boolean, default: true },
  reason:     { type: String, default: null },  // failure reason if !success
}, { timestamps: false });

couponUsageLogSchema.index({ userId: 1, couponCode: 1 });
couponUsageLogSchema.index({ userId: 1, usedAt: -1 });

export default mongoose.model('CouponUsageLog', couponUsageLogSchema);
