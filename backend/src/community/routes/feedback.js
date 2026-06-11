import express from 'express';
import { requireRole } from '../../middleware/rbac.js';
import { checkNotBanned } from '../middleware/communityAccess.js';
import { rateLimitRest } from '../middleware/rateLimitMiddleware.js';
import {
  submitFeedback,
  listFeedback,
  voteFeedback,
  adminReplyFeedback,
} from '../controllers/feedbackController.js';

const router = express.Router();

// Submit feedback
router.post('/', checkNotBanned, rateLimitRest('submitFeedback'), submitFeedback);

// List public feedback board
router.get('/', listFeedback);

// Vote on feedback
router.post('/:feedbackId/vote', checkNotBanned, voteFeedback);

// Admin: Reply and update status
router.patch('/:feedbackId', requireRole('admin'), adminReplyFeedback);

export default router;
