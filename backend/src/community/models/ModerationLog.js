import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
  {
    // Who was acted on
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Who performed the action (admin/moderator)
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Action taken
    action: {
      type: String,
      enum: [
        'ban',
        'unban',
        'temp_ban',
        'mute',
        'unmute',
        'warn',
        'report_resolved',
        'message_deleted',
        'message_flagged',
        'channel_kick',
      ],
      required: true,
      index: true,
    },

    // Scope
    scope: {
      type: String,
      enum: ['global', 'channel', 'conversation'],
      default: 'global',
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityMessage',
      default: null,
    },

    reason:    { type: String, maxlength: 1000, required: true },
    duration:  { type: Number, default: null }, // seconds (null = permanent)
    expiresAt: { type: Date,   default: null },  // for temp bans / mutes

    // Was the action reversed?
    isReversed: { type: Boolean, default: false },
    reversedAt: { type: Date,   default: null },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

moderationLogSchema.index({ targetUserId: 1, createdAt: -1 });
moderationLogSchema.index({ adminId: 1, createdAt: -1 });
moderationLogSchema.index({ action: 1, createdAt: -1 });
moderationLogSchema.index({ expiresAt: 1 }, { sparse: true }); // for cleanup cron

export default mongoose.model('ModerationLog', moderationLogSchema);
