import mongoose from 'mongoose';

const presenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['online', 'away', 'offline'],
      default: 'offline',
    },

    lastSeen: { type: Date, default: Date.now },

    // Active socket IDs across devices (for multi-device support)
    activeSocketIds: [{ type: String }],

    // Current device / platform metadata (optional)
    devices: [
      {
        socketId:   { type: String },
        platform:   { type: String, enum: ['web', 'mobile', 'desktop', 'unknown'], default: 'web' },
        userAgent:  { type: String, maxlength: 500 },
        connectedAt: { type: Date, default: Date.now },
      },
    ],

    // Custom status message (optional)
    statusMessage: { type: String, maxlength: 100, default: null },
  },
  {
    timestamps: true,
    // MongoDB TTL: automatically remove documents for users offline >7 days
    // (presence is re-created on next connect)
  }
);

// TTL index: removes presence doc 7 days after lastSeen if still offline
presenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export default mongoose.model('UserPresence', presenceSchema);
