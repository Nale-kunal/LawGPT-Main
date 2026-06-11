import express from 'express';
import { requireRole } from '../../middleware/rbac.js';
import { checkNotBanned } from '../middleware/communityAccess.js';
import { rateLimitRest } from '../middleware/rateLimitMiddleware.js';
import {
  createSupportTicket,
  getUserTickets,
  getAllTickets,
  updateTicketStatus,
} from '../controllers/supportController.js';

const router = express.Router();

// User: Create support ticket
router.post('/', checkNotBanned, rateLimitRest('createTicket'), createSupportTicket);

// User: Get own tickets
router.get('/my', getUserTickets);

// Admin: Get all tickets
router.get('/all', requireRole('admin'), getAllTickets);

// Admin: Update ticket status / assign
router.patch('/:ticketId/status', requireRole('admin'), updateTicketStatus);

export default router;
