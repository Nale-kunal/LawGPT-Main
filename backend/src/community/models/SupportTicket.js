import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    // Linked conversation where the support chat happens
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    // Ticket submitter
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Ticket details
    title:       { type: String, required: true, maxlength: 200, trim: true },
    description: { type: String, required: true, maxlength: 5000, trim: true },

    // Classification
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    category: {
      type: String,
      enum: ['billing', 'technical', 'account', 'feature_request', 'bug', 'legal', 'other'],
      default: 'other',
      index: true,
    },
    tags: [{ type: String, maxlength: 50 }],

    // Status lifecycle
    status: {
      type: String,
      enum: [
        'open',
        'investigating',
        'resolved',
        'closed',
        'duplicate',
        'pending_user_response',
      ],
      default: 'open',
      index: true,
    },

    // Admin assignment
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAt: { type: Date, default: null },

    // Resolution
    resolvedAt:    { type: Date, default: null },
    resolvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, maxlength: 2000, default: null },

    // Escalation
    isEscalated:   { type: Boolean, default: false },
    escalatedAt:   { type: Date, default: null },
    escalatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // SLA tracking
    firstResponseAt: { type: Date, default: null },
    slaBreached:     { type: Boolean, default: false },

    // Client info captured at creation
    userAgent:   { type: String, maxlength: 500, default: null },
    platform:    { type: String, enum: ['web', 'mobile', 'unknown'], default: 'web' },
  },
  { timestamps: true }
);

supportTicketSchema.index({ userId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ assignedAdminId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
