import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Cloudinary storage
    cloudinaryPublicId: { type: String, default: null },
    secureUrl:          { type: String, default: null },
    resourceType:       { type: String, enum: ['image', 'video', 'raw', 'auto'], default: 'raw' },

    // File metadata
    originalFilename: { type: String, default: null },
    mimeType:         { type: String, required: true },
    sizeBytes:        { type: Number, required: true },

    // Encrypted metadata (AES-256-GCM via conversation key)
    encryptedUrl:      { type: String, default: null },
    encryptedFilename: { type: String, default: null },
    iv:                { type: String, default: null },
    authTag:           { type: String, default: null },

    // Thumbnail (for images/videos)
    thumbnailUrl: { type: String, default: null },
    width:        { type: Number, default: null },
    height:       { type: Number, default: null },
    duration:     { type: Number, default: null }, // seconds for audio/video

    // Security
    isMalwareScanned: { type: Boolean, default: false },
    malwareScanResult: { type: String, enum: ['clean', 'infected', 'pending', 'skipped'], default: 'pending' },
    isAllowed:        { type: Boolean, default: true }, // set false if malware detected

    // Signed URL expiry (for private resources)
    signedUrlExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attachmentSchema.index({ messageId: 1 });
attachmentSchema.index({ conversationId: 1, createdAt: -1 });
attachmentSchema.index({ uploadedBy: 1, createdAt: -1 });

export default mongoose.model('MessageAttachment', attachmentSchema);
