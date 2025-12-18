import mongoose from 'mongoose';

const timeEntrySchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  hourlyRate: { type: Number, required: true },
  date: { type: Date, required: true },
  billable: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

export default mongoose.model('TimeEntry', timeEntrySchema);



