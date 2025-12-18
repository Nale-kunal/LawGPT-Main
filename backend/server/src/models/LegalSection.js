import mongoose from 'mongoose';

const legalSectionSchema = new mongoose.Schema({
  actName: { type: String, required: true },
  sectionNumber: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  punishment: { type: String },
  keywords: [{ type: String }],
}, { timestamps: true });

export default mongoose.model('LegalSection', legalSectionSchema);



