import mongoose from 'mongoose';

const blockedUserSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: { type: String, maxlength: 500, default: null },
  },
  { timestamps: true }
);

// One block record per pair
blockedUserSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

export default mongoose.model('BlockedUser', blockedUserSchema);
