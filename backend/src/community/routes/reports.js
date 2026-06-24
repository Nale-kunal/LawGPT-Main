/**
 * community/routes/reports.js
 *
 * Report endpoints for community content and users.
 *
 * Security measures applied:
 *  - requireAuth enforced at the router index level (upstream)
 *  - checkNotBanned blocks banned users from submitting new reports
 *  - Rate limit: max 10 reports per user per hour (AuditLog-free, uses CommunityReport count)
 *  - Duplicate report guard: same reporter cannot report the same target within 24 h
 *  - Input validation: ObjectId format check, reason category enum, detail length cap
 *  - XSS sanitisation on all free-text fields (xss library)
 *  - reporterId always set server-side from req.user.userId — never from request body
 *  - Self-report guard on user reports
 *  - All writes persisted to CommunityReport for admin queue + audit trail
 *  - Message flag also set on Message document for real-time moderation signals
 *  - No PII (reporter identity) is returned in API responses
 */

import express from 'express';
import xss from 'xss';
import mongoose from 'mongoose';
import { checkNotBanned } from '../middleware/communityAccess.js';
import CommunityMessage from '../models/Message.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import CommunityReport, { REPORT_CATEGORIES } from '../models/CommunityReport.js';
import ModerationLog from '../models/ModerationLog.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Rate-limit check: max 10 reports per reporter per hour.
 * Uses CommunityReport count — no Redis dependency needed.
 */
const REPORT_RATE_LIMIT = 10;
const RATE_WINDOW_MS    = 60 * 60 * 1000; // 1 hour

async function isRateLimited(reporterId) {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS);
  const count = await CommunityReport.countDocuments({
    reporterId,
    createdAt: { $gte: windowStart },
  });
  return count >= REPORT_RATE_LIMIT;
}

/**
 * Duplicate-report guard: same reporter + same target within 24 h.
 * Prevents report-flooding a single post/user.
 */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

async function isDuplicate(reporterId, filter) {
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const existing = await CommunityReport.findOne({
    reporterId,
    ...filter,
    status:    { $ne: 'dismissed' }, // dismissed reports do not block re-report
    createdAt: { $gte: windowStart },
  }).lean();
  return !!existing;
}

/**
 * Sanitise and truncate a user-supplied free-text string.
 */
function sanitise(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return xss(str.trim()).slice(0, maxLen);
}

// ── POST /api/v1/community/reports/message ────────────────────────────────────
router.post('/message', checkNotBanned, async (req, res) => {
  try {
    const reporterId = req.user.userId; // always server-side — never from body

    // ── 1. Input validation ───────────────────────────────────────────────────
    const { messageId, category, detail } = req.body;

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ ok: false, error: 'Invalid or missing messageId' });
    }

    if (!category || !REPORT_CATEGORIES.includes(category)) {
      return res.status(400).json({
        ok: false,
        error: `category must be one of: ${REPORT_CATEGORIES.join(', ')}`,
      });
    }

    const sanitisedDetail = sanitise(detail || '');

    // ── 2. Verify target message exists ───────────────────────────────────────
    const message = await CommunityMessage.findById(messageId)
      .select('_id conversationId isDeleted')
      .lean();

    if (!message || message.isDeleted) {
      return res.status(404).json({ ok: false, error: 'Message not found or already removed' });
    }

    // Access control: reporter must be an active participant in this conversation
    const isParticipant = await ConversationParticipant.exists({
      conversationId: message.conversationId,
      userId: reporterId,
      isRemoved: false,
    });
    if (!isParticipant) {
      logger.warn({ reporterId, conversationId: message.conversationId, messageId }, 'Unauthorized attempt to report message in conversation');
      return res.status(403).json({ ok: false, error: 'ACCESS_DENIED', message: 'You are not a member of this conversation' });
    }

    // ── 3. Rate limit check ───────────────────────────────────────────────────
    if (await isRateLimited(reporterId)) {
      return res.status(429).json({
        ok: false,
        error: 'Too many reports submitted. Please wait before reporting again.',
      });
    }

    // ── 4. Duplicate report guard ─────────────────────────────────────────────
    if (await isDuplicate(reporterId, { targetMessageId: messageId })) {
      // Return 200 (not 409) to avoid leaking whether a report already exists
      return res.json({ ok: true, message: 'Report submitted. Thank you for keeping the community safe.' });
    }

    // ── 5. Persist report record ──────────────────────────────────────────────
    await CommunityReport.create({
      reporterId,
      targetType:      'message',
      targetMessageId: messageId,
      conversationId:  message.conversationId,
      category,
      detail:          sanitisedDetail,
      status:          'pending',
    });

    // ── 6. Flag the message document for real-time moderation signal ──────────
    await CommunityMessage.findByIdAndUpdate(messageId, {
      $set: { isFlagged: true, flagCategory: category },
    });

    logger.info({ reporterId, messageId, category }, 'community message report filed');
    return res.json({ ok: true, message: 'Report submitted. Our team will review it.' });
  } catch (err) {
    logger.error({ err }, 'reportMessage error');
    return res.status(500).json({ ok: false, error: 'Failed to submit report' });
  }
});

// ── POST /api/v1/community/reports/user ───────────────────────────────────────
router.post('/user', checkNotBanned, async (req, res) => {
  try {
    const reporterId = req.user.userId; // always server-side

    // ── 1. Input validation ───────────────────────────────────────────────────
    const { targetUserId, category, detail } = req.body;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ ok: false, error: 'Invalid or missing targetUserId' });
    }

    if (!category || !REPORT_CATEGORIES.includes(category)) {
      return res.status(400).json({
        ok: false,
        error: `category must be one of: ${REPORT_CATEGORIES.join(', ')}`,
      });
    }

    // ── 2. Self-report guard ──────────────────────────────────────────────────
    if (targetUserId === reporterId) {
      return res.status(400).json({ ok: false, error: 'Cannot report yourself' });
    }

    const sanitisedDetail = sanitise(detail || '');

    // ── 3. Rate limit check ───────────────────────────────────────────────────
    if (await isRateLimited(reporterId)) {
      return res.status(429).json({
        ok: false,
        error: 'Too many reports submitted. Please wait before reporting again.',
      });
    }

    // ── 4. Duplicate report guard ─────────────────────────────────────────────
    if (await isDuplicate(reporterId, { targetUserId })) {
      return res.json({ ok: true, message: 'Report submitted. Thank you for keeping the community safe.' });
    }

    // ── 5. Persist report record ──────────────────────────────────────────────
    await CommunityReport.create({
      reporterId,
      targetType:   'user',
      targetUserId,
      category,
      detail:       sanitisedDetail,
      status:       'pending',
    });

    // ── 6. Write to ModerationLog as a pending moderation signal ─────────────
    await ModerationLog.create({
      targetUserId,
      adminId: reporterId,
      action:  'report_resolved',
      reason:  `[PENDING] User report filed. Category: ${category}. Detail: ${sanitisedDetail || '(none)'}`,
      scope:   'global',
    });

    logger.info({ reporterId, targetUserId, category }, 'community user report filed');
    return res.json({ ok: true, message: 'User reported. Thank you for keeping the community safe.' });
  } catch (err) {
    logger.error({ err }, 'reportUser error');
    return res.status(500).json({ ok: false, error: 'Failed to submit report' });
  }
});

// ── POST /api/v1/community/reports/block ──────────────────────────────────────
import BlockedUser from '../models/BlockedUser.js';

router.post('/block', checkNotBanned, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ ok: false, error: 'Invalid targetUserId' });
    }
    if (targetUserId === userId) {
      return res.status(400).json({ ok: false, error: 'Cannot block yourself' });
    }

    await BlockedUser.findOneAndUpdate(
      { blockerId: userId, blockedUserId: targetUserId },
      { blockerId: userId, blockedUserId: targetUserId },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, blocked: true });
  } catch (err) {
    logger.error({ err }, 'blockUser error');
    return res.status(500).json({ ok: false, error: 'Failed to block user' });
  }
});

// ── DELETE /api/v1/community/reports/block/:targetUserId ─────────────────────
router.delete('/block/:targetUserId', async (req, res) => {
  try {
    const { targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ ok: false, error: 'Invalid targetUserId' });
    }

    await BlockedUser.deleteOne({
      blockerId:     req.user.userId,
      blockedUserId: targetUserId,
    });

    return res.json({ ok: true, blocked: false });
  } catch (err) {
    logger.error({ err }, 'unblockUser error');
    return res.status(500).json({ ok: false, error: 'Failed to unblock user' });
  }
});

// ── GET /api/v1/community/reports/admin — admin moderation queue ──────────────
// (requires admin role — applied in admin sub-router; kept here for completeness)
// This route is intentionally NOT mounted here; admin queue is served via admin.js

export default router;
