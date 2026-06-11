import express from 'express';
import { requireRole } from '../../middleware/rbac.js';
import {
  getCommunityStats,
  getOnlineUsers,
} from '../controllers/adminCommunityController.js';
import {
  getAllTickets as getSupportTickets,
  updateTicketStatus as updateSupport,
} from '../controllers/supportController.js';
import {
  adminReplyFeedback,
} from '../controllers/feedbackController.js';

const router = express.Router();

// All admin community routes require admin role
router.use(requireRole('admin'));

// Dashboard stats
router.get('/stats', getCommunityStats);

// Online users
router.get('/online', getOnlineUsers);

// Support ticket management (admin view)
router.get('/tickets', getSupportTickets);
router.patch('/tickets/:ticketId/status', updateSupport);

// Feedback management
router.patch('/feedback/:feedbackId', adminReplyFeedback);

export default router;
