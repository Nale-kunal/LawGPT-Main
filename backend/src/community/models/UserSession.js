import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    socketId: {
      type: String,
      default: null,
      index: true,
    },
    // Device profile
    deviceFingerprint: { type: String, default: null },
    browser:           { type: String, default: null },
    os:                { type: String, default: null },
    platform:          { type: String, default: 'web' },
    userAgent:         { type: String, default: null },

    // Geolocation / Network profile
    ipAddress:      { type: String, default: null },
    approxLocation: { type: String, default: 'Unknown' }, // City, Country

    // Lifecyle tracking
    isActive:  { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSessionSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model('UserSession', userSessionSchema);
