import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title:   { type: String, required: true, maxlength: 200, trim: true },
    content: { type: String, required: true, maxlength: 5000, trim: true },

    category: {
      type: String,
      enum: ['ui_ux', 'performance', 'ai', 'billing', 'community', 'mobile', 'security', 'integrations', 'other'],
      required: true,
      index: true,
    },

    // Visibility
    isPublic: { type: Boolean, default: true, index: true },

    // Community voting (user IDs who voted)
    upvotes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    voteScore: { type: Number, default: 0, index: true }, // upvotes - downvotes

    // Status
    status: {
      type: String,
      enum: ['open', 'under_review', 'planned', 'implemented', 'declined'],
      default: 'open',
      index: true,
    },

    // Admin reply
    adminReply: {
      content:    { type: String, maxlength: 2000, default: null },
      repliedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      repliedAt:  { type: Date, default: null },
    },

    // Linked conversation (for extended discussion)
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },

    // Tags
    tags: [{ type: String, maxlength: 50 }],
  },
  { timestamps: true }
);

feedbackSchema.index({ category: 1, voteScore: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ isPublic: 1, voteScore: -1 });

export default mongoose.model('Feedback', feedbackSchema);
