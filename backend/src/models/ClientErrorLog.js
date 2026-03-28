import mongoose from 'mongoose';

const clientErrorLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  source: String,
  line: Number,
  col: Number,
  stack: String,
  level: { type: String, enum: ['error', 'warn', 'info'], default: 'error' },
  userId: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

// ── Indexes ──────────────────────────────────────────────────────────────────
clientErrorLogSchema.index({ createdAt: 1 });
const ClientErrorLog = mongoose.models.ClientErrorLog || mongoose.model('ClientErrorLog', clientErrorLogSchema);
export default ClientErrorLog;
