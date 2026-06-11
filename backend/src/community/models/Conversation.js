import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    // private | channel | support | announcement | group
    type: {
      type: String,
      enum: ['private', 'channel', 'support', 'announcement', 'group'],
      required: true,
      index: true,
    },

    // Human readable name (channels/groups only)
    name: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },
    avatarUrl: { type: String, default: null },

    // Channel slug — unique identifier for channels/announcements
    channelSlug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Participants (private/group/support chats)
    // Channels use ConversationParticipant model for membership
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Encryption metadata
    isEncrypted: { type: Boolean, default: true },
    encryptionVersion: { type: String, default: 'aes-256-gcm-v1' },
    isPrivileged: { type: Boolean, default: false, index: true },

    // State
    isArchived: { type: Boolean, default: false, index: true },
    isReadOnly: { type: Boolean, default: false },

    // Last message snapshot (denormalized for list views)
    lastMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityMessage' },
      senderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      preview:   { type: String, default: '' }, // "[Image]", "[Voice]", or truncated text
      sentAt:    { type: Date, default: null },
    },

    // Pinned message IDs
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CommunityMessage' }],

    // Who created this conversation
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Soft-delete
    deletedAt: { type: Date, default: null },

    // Group/channel settings
    settings: {
      allowMemberInvite: { type: Boolean, default: false },
      allowReactions:    { type: Boolean, default: true },
      allowReplies:      { type: Boolean, default: true },
      muteNotifications: { type: Boolean, default: false },
      maxMembers:        { type: Number, default: 1000 },
    },

    // Support ticket ref
    supportTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      default: null,
    },

    // Metadata
    metadata: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
conversationSchema.index({ participants: 1, type: 1 });
conversationSchema.index({ type: 1, isArchived: 1, createdAt: -1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });

export default mongoose.model('Conversation', conversationSchema);
