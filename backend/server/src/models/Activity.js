import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'case_created', 'case_updated', 'case_closed',
      'client_registered', 'client_updated',
      'invoice_created', 'invoice_sent', 'payment_received',
      'time_logged', 'document_uploaded',
      'hearing_created', 'hearing_updated', 'hearing_deleted', 'hearing_scheduled', 
      'alert_created'
    ]
  },
  message: { type: String, required: true },
  entityType: { 
    type: String, 
    enum: ['case', 'client', 'invoice', 'time_entry', 'document', 'alert', 'hearing'],
    required: true
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  metadata: {
    caseNumber: String,
    clientName: String,
    invoiceNumber: String,
    amount: Number,
    currency: String,
    duration: Number,
    description: String,
    priority: String,
    status: String,
    fileName: String,
    billable: Boolean
  }
}, { 
  timestamps: true,
  // Auto-expire activities after 90 days to keep collection manageable
  expireAfterSeconds: 90 * 24 * 60 * 60
});

// Index for efficient querying
activitySchema.index({ owner: 1, createdAt: -1 });
activitySchema.index({ owner: 1, type: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
