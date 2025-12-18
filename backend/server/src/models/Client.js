import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  panNumber: { type: String },
  aadharNumber: { type: String },
  cases: [{ type: String }],
  documents: [{ type: String }],
  notes: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

export default mongoose.model('Client', clientSchema);



