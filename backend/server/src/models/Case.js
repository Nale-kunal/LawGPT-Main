import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
  caseNumber: { type: String, required: true },
  clientName: { type: String, required: true },
  opposingParty: { type: String },
  courtName: { type: String },
  judgeName: { type: String },
  hearingDate: { type: Date },
  hearingTime: { type: String },
  status: { type: String, enum: ['active', 'pending', 'closed', 'won', 'lost'], default: 'active' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  caseType: { type: String },
  description: { type: String },
  nextHearing: { type: Date },
  documents: [{ type: String }],
  notes: { type: String },
  alerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

export default mongoose.model('Case', caseSchema);



