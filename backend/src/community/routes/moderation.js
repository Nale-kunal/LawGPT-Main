import express from 'express';
import { requireRole } from '../../middleware/rbac.js';
import {
  banUser,
  unbanUser,
  getModerationLogs,
  resolveFlaggedMessage,
  getFlaggedMessages,
} from '../controllers/adminCommunityController.js';

const router = express.Router();

// All moderation routes require admin role
router.use(requireRole('admin'));

// Ban a user (temporary or permanent)
router.post('/ban', banUser);

// Unban a user
router.delete('/ban/:targetUserId', unbanUser);

// Get moderation logs
router.get('/logs', getModerationLogs);

// Get flagged message queue
router.get('/flagged', getFlaggedMessages);

// Resolve a flagged message (keep or delete)
router.patch('/flagged/:messageId', resolveFlaggedMessage);

export default router;
