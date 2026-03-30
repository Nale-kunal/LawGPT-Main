import mongoose from 'mongoose';

const templateDocumentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  templateId: { 
    type: String, 
    required: true 
  },
  templateName: {
    type: String,
    required: true
  },
  filledData: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  finalHTML: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'completed'], 
    default: 'draft' 
  }
}, { timestamps: true });

// Index for user document retrieval
templateDocumentSchema.index({ userId: 1, templateId: 1 });
templateDocumentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('TemplateDocument', templateDocumentSchema);
