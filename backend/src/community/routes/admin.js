import express from 'express';
import xss from 'xss';
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
import CommunityReport from '../models/CommunityReport.js';
import logger from '../../utils/logger.js';

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

// ── Moderation Queue — Community Reports ──────────────────────────────────────

/**
 * GET /api/v1/community/admin/reports
 * Returns the moderation queue, newest first.
 * Query params: status (pending|under_review|actioned|dismissed|duplicate), targetType (message|user), page, limit
 */
router.get('/reports', async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 30 } = req.query;

    const filter = {};
    const VALID_STATUSES = ['pending', 'under_review', 'actioned', 'dismissed', 'duplicate'];
    if (status && VALID_STATUSES.includes(status)) filter.status = status;
    else if (!status) filter.status = { $in: ['pending', 'under_review'] }; // default: open queue

    const VALID_TYPES = ['message', 'user'];
    if (targetType && VALID_TYPES.includes(targetType)) filter.targetType = targetType;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

    const [reports, total] = await Promise.all([
      CommunityReport.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('reporterId',      'name email role')
        .populate('targetMessageId', 'content senderId createdAt')
        .populate('targetUserId',    'name email role')
        .lean(),
      CommunityReport.countDocuments(filter),
    ]);

    return res.json({ ok: true, reports, total, page: pageNum, limit: limitNum });
  } catch (err) {
    logger.error({ err }, 'admin getReports error');
    return res.status(500).json({ ok: false, error: 'Failed to fetch reports' });
  }
});

/**
 * PATCH /api/v1/community/admin/reports/:reportId
 * Update a report's status (admin resolution action).
 * Body: { status: string, adminNote?: string }
 */
router.patch('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNote } = req.body;

    const VALID_STATUSES = ['under_review', 'actioned', 'dismissed', 'duplicate'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const report = await CommunityReport.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          reviewedBy: req.user.userId,
          reviewedAt: new Date(),
          adminNote:  adminNote ? xss(String(adminNote).trim()).slice(0, 1000) : '',
        },
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ ok: false, error: 'Report not found' });
    }

    logger.info({ adminId: req.user.userId, reportId, status }, 'community report resolved');
    return res.json({ ok: true, report });
  } catch (err) {
    logger.error({ err }, 'admin updateReport error');
    return res.status(500).json({ ok: false, error: 'Failed to update report' });
  }
});

export default router;

