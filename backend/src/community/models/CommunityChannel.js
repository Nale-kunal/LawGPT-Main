import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
      index: true,
    },
    name:        { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, maxlength: 500, default: '', trim: true },
    avatarUrl:   { type: String, default: null },

    type: {
      type: String,
      enum: ['general', 'announcement', 'support', 'feedback', 'legal_updates', 'feature_requests', 'bug_reports'],
      default: 'general',
      index: true,
    },

    // Linked Conversation document (the actual message store)
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      unique: true,
    },

    // Access control
    isPublic:    { type: Boolean, default: true, index: true },
    isReadOnly:  { type: Boolean, default: false }, // only admins can post
    isArchived:  { type: Boolean, default: false, index: true },

    // Channel settings
    allowReactions: { type: Boolean, default: true },
    allowReplies:   { type: Boolean, default: true },
    allowFiles:     { type: Boolean, default: true },

    // Moderators (user IDs with mod privileges)
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Created by
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Stats (denormalized for fast reads)
    memberCount:  { type: Number, default: 0, min: 0 },
    messageCount: { type: Number, default: 0, min: 0 },
    lastActivityAt: { type: Date, default: Date.now, index: true },

    // Display order (lower = higher up in channel list)
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

channelSchema.index({ isPublic: 1, isArchived: 1, sortOrder: 1 });

export default mongoose.model('CommunityChannel', channelSchema);
