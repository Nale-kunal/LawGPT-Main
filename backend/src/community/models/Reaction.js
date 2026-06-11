import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityMessage',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10, // Limit to prevent abuse (emoji + variation selectors)
    },
  },
  { timestamps: true }
);

// One reaction per emoji per user per message
reactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });
// For aggregating reaction counts per message
reactionSchema.index({ messageId: 1, emoji: 1 });

export default mongoose.model('Reaction', reactionSchema);
