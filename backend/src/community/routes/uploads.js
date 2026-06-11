/**
 * uploads.js — Community media upload signing and registration
 *
 * Server issues Cloudinary signed upload parameters.
 * The client uploads directly to Cloudinary — the server never receives the binary.
 * After upload, the client registers the attachment, triggering async malware signature scans.
 */

import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { checkNotBanned } from '../middleware/communityAccess.js';
import MessageAttachment from '../models/MessageAttachment.js';
import { getMalwareScanningQueue } from '../workers/malwareWorker.js';
import { encryptAttachmentMetadata } from '../services/encryptionService.js';
import { checkRateLimit } from '../socket/rateLimiter.js';
import logger from '../../utils/logger.js';

const router = express.Router();

const ALLOWED_RESOURCE_TYPES = ['image', 'raw', 'video'];
const ALLOWED_MIMETYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Audio
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4',
  // Video
  'video/mp4', 'video/webm',
];

// Max sizes
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,  // 10MB
  audio: 50 * 1024 * 1024,  // 50MB for voice messages
  video: 100 * 1024 * 1024, // 100MB
  raw:   25 * 1024 * 1024,  // 25MB for documents
};

// ── Generate Cloudinary signed upload params ──────────────────────────────────
router.post('/sign', checkNotBanned, async (req, res) => {
  try {
    const { folder = 'community', resourceType = 'image', mimeType } = req.body;

    if (!ALLOWED_RESOURCE_TYPES.includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    if (mimeType && !ALLOWED_MIMETYPES.includes(mimeType)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    const cloudName   = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey      = process.env.CLOUDINARY_API_KEY;
    const apiSecret   = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      logger.error('Cloudinary not configured');
      return res.status(503).json({ error: 'File uploads not configured' });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const publicId  = `${folder}/${req.user.userId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const params = {
      folder:      `juriq/${folder}`,
      public_id:   publicId,
      timestamp,
      resource_type: resourceType,
      allowed_formats: resourceType === 'image' ? 'jpg,jpeg,png,gif,webp' : undefined,
    };

    // Build the Cloudinary signature string
    const sortedParams = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const signature = crypto
      .createHash('sha256')
      .update(sortedParams + apiSecret)
      .digest('hex');

    res.json({
      ok:        true,
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder:    `juriq/${folder}`,
      publicId,
      resourceType,
    });
  } catch (err) {
    logger.error({ err }, 'Upload sign error');
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

// ── Register direct upload & trigger malware scan ─────────────────────────────
router.post('/register', checkNotBanned, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Direct Upload Rate Limiter Check
    const allowed = await checkRateLimit(userId, 'fileUpload');
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded: too many file uploads. Please slow down.' });
    }

    const {
      conversationId,
      messageId,
      secureUrl,
      originalFilename,
      mimeType,
      sizeBytes,
      resourceType = 'raw',
      thumbnailUrl = null,
      cloudinaryPublicId = null
    } = req.body;

    if (!conversationId || !secureUrl || !mimeType || !sizeBytes) {
      return res.status(400).json({ error: 'Missing required registration parameters' });
    }

    // Cryptographic Isolation: encrypt sensitive file URL and name
    const { encryptedData: encryptedUrl, iv, authTag, keyVersion } = encryptAttachmentMetadata(
      originalFilename || 'unnamed',
      secureUrl,
      conversationId
    );

    const attachment = await MessageAttachment.create({
      messageId:          messageId && mongoose.Types.ObjectId.isValid(messageId) ? messageId : new mongoose.Types.ObjectId(),
      conversationId,
      uploadedBy:         userId,
      cloudinaryPublicId: cloudinaryPublicId || 'pending',
      secureUrl:          '[ENCRYPTED]', // Never persist raw URLs
      encryptedUrl,
      encryptedFilename:  originalFilename ? encryptAttachmentMetadata(originalFilename, '', conversationId).encryptedData : null,
      iv,
      authTag,
      keyVersion,
      mimeType,
      sizeBytes,
      resourceType,
      thumbnailUrl,
      isMalwareScanned:   false,
      malwareScanResult:  'pending',
      isAllowed:          true,
    });

    // Queue background scanning job
    const scanQueue = getMalwareScanningQueue();
    if (scanQueue) {
      await scanQueue.add('scan_attachment', {
        attachmentId: attachment._id.toString(),
        conversationId
      }).catch(err => logger.error({ err }, 'Failed to queue malware scan job'));
    }

    res.status(201).json({
      ok:           true,
      attachmentId: attachment._id,
      status:       'pending_scan',
    });
  } catch (err) {
    logger.error({ err }, 'Attachment registration error');
    res.status(500).json({ error: 'Failed to register attachment' });
  }
});

export default router;
