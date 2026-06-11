/**
 * community/routes/index.js
 *
 * Aggregates all community sub-routers.
 * Mounted at /api/v1/community in index.js
 */

import express from 'express';
import conversationRoutes from './conversations.js';
import messageRoutes from './messages.js';
import channelRoutes from './channels.js';
import supportRoutes from './support.js';
import feedbackRoutes from './feedback.js';
import reportRoutes from './reports.js';
import moderationRoutes from './moderation.js';
import adminRoutes from './admin.js';
import notificationRoutes from './notifications.js';
import uploadRoutes from './uploads.js';
import sessionRoutes from './sessions.js';
import { requireAuth } from '../../middleware/auth-jwt.js';
import { checkNotBanned } from '../middleware/communityAccess.js';

const router = express.Router();

// ── All community routes require authentication ──────────────────────────────
router.use(requireAuth);

// ── Ban check on write operations (not needed for read-only admin routes) ────
// Applied selectively inside sub-routers for write endpoints

router.use('/conversations',  conversationRoutes);
router.use('/messages',       messageRoutes);
router.use('/channels',       channelRoutes);
router.use('/support',        supportRoutes);
router.use('/feedback',       feedbackRoutes);
router.use('/reports',        reportRoutes);
router.use('/moderation',     moderationRoutes);
router.use('/admin',          adminRoutes);
router.use('/notifications',  notificationRoutes);
router.use('/uploads',        uploadRoutes);
router.use('/sessions',       sessionRoutes);

export default router;
