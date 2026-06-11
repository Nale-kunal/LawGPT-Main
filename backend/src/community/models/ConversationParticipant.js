import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
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
      index: true,
    },

    // Role within the conversation
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member',
    },

    // Read tracking — pointer to last read message
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityMessage',
      default: null,
    },
    lastReadAt: { type: Date, default: null },

    // Unread count (maintained by server on new message delivery)
    unreadCount: { type: Number, default: 0, min: 0 },

    // Mute settings
    isMuted:    { type: Boolean, default: false },
    mutedUntil: { type: Date, default: null }, // null = muted indefinitely

    // Archive / pin for this user
    isArchivedByUser: { type: Boolean, default: false, index: true },
    isPinnedByUser:   { type: Boolean, default: false },

    // State
    joinedAt:    { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: null },

    // Soft remove (left/kicked without destroying message history)
    isRemoved:    { type: Boolean, default: false },
    removedAt:    { type: Date, default: null },
    removedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Unique participant per conversation
participantSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
// Query: all conversations for a user sorted by activity
participantSchema.index({ userId: 1, isArchivedByUser: 1, lastReadAt: -1 });
// Query: unread counts
participantSchema.index({ userId: 1, unreadCount: -1 });

export default mongoose.model('ConversationParticipant', participantSchema);
