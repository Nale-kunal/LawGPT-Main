import mongoose from 'mongoose';

const hearingSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  hearingDate: { type: Date, required: true },
  hearingTime: { type: String },
  courtName: { type: String, required: true },
  judgeName: { type: String },
  hearingType: { 
    type: String, 
    enum: ['first_hearing', 'interim_hearing', 'final_hearing', 'evidence_hearing', 'argument_hearing', 'judgment_hearing', 'other'],
    default: 'interim_hearing'
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'adjourned', 'cancelled'],
    default: 'scheduled'
  },
  purpose: { type: String }, // Purpose of the hearing
  courtInstructions: { type: String }, // Instructions from court for next hearing
  documentsToBring: [{ type: String }], // Documents required for next hearing
  proceedings: { type: String }, // What happened during the hearing
  nextHearingDate: { type: Date }, // Next hearing date if adjourned
  nextHearingTime: { type: String },
  adjournmentReason: { type: String }, // Reason for adjournment if applicable
  attendance: {
    clientPresent: { type: Boolean, default: false },
    opposingPartyPresent: { type: Boolean, default: false },
    witnessesPresent: [{ type: String }], // Names of witnesses present
  },
  orders: [{ 
    orderType: { type: String }, // e.g., 'interim_order', 'final_order', 'direction'
    orderDetails: { type: String },
    orderDate: { type: Date, default: Date.now }
  }],
  notes: { type: String }, // Additional notes
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

// Index for efficient queries
hearingSchema.index({ caseId: 1, hearingDate: -1 });
hearingSchema.index({ owner: 1, hearingDate: -1 });

export default mongoose.model('Hearing', hearingSchema);

