import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
  type: { type: String, enum: ['hearing', 'deadline', 'payment', 'document'], required: true },
  message: { type: String, required: true },
  alertTime: { type: Date, required: true },
  isRead: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Alert', alertSchema);



