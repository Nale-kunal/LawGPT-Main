import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'new_message',
        'mention',
        'reaction',
        'reply',
        'support_reply',
        'support_status_change',
        'feedback_reply',
        'feedback_vote',
        'channel_announcement',
        'member_joined',
        'member_removed',
        'system',
      ],
      required: true,
      index: true,
    },

    // Notification content (plain text — NOT encrypted)
    title:   { type: String, maxlength: 200, required: true },
    body:    { type: String, maxlength: 500, default: '' },

    // Deep-link references
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityMessage',
      default: null,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Read state
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },

    // Additional payload
    payload: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
// TTL: auto-delete read notifications after 30 days
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600, sparse: true });

export default mongoose.model('CommunityNotification', notificationSchema);
