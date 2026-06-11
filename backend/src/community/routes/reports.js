import express from 'express';
import xss from 'xss';
import mongoose from 'mongoose';
import { checkNotBanned } from '../middleware/communityAccess.js';
import CommunityMessage from '../models/Message.js';
import BlockedUser from '../models/BlockedUser.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// ── Report a message ──────────────────────────────────────────────────────────
router.post('/message', checkNotBanned, async (req, res) => {
  try {
    const { messageId, reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(messageId) || !reason?.trim()) {
      return res.status(400).json({ error: 'messageId and reason are required' });
    }

    await CommunityMessage.findByIdAndUpdate(messageId, {
      $set: { isFlagged: true, flagReason: xss(reason.trim()).slice(0, 500) },
    });

    res.json({ ok: true, message: 'Report submitted. Our team will review it.' });
  } catch (err) {
    logger.error({ err }, 'reportMessage error');
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// ── Report a user ─────────────────────────────────────────────────────────────
router.post('/user', checkNotBanned, async (req, res) => {
  try {
    const { targetUserId, reason } = req.body;
    const reporterId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId) || !reason?.trim()) {
      return res.status(400).json({ error: 'targetUserId and reason are required' });
    }
    if (targetUserId === reporterId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    // Log the report as a moderation signal
    const ModerationLog = (await import('../models/ModerationLog.js')).default;
    await ModerationLog.create({
      targetUserId,
      adminId:  reporterId, // reporter acts as initiator
      action:   'report_resolved', // treated as a pending report
      reason:   `User reported: ${xss(reason.trim()).slice(0, 500)}`,
      scope:    'global',
    });

    res.json({ ok: true, message: 'User reported. Thank you for keeping the community safe.' });
  } catch (err) {
    logger.error({ err }, 'reportUser error');
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// ── Block/unblock a user ──────────────────────────────────────────────────────
router.post('/block', checkNotBanned, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid targetUserId' });
    }
    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    await BlockedUser.findOneAndUpdate(
      { blockerId: userId, blockedUserId: targetUserId },
      { blockerId: userId, blockedUserId: targetUserId },
      { upsert: true, new: true }
    );

    res.json({ ok: true, blocked: true });
  } catch (err) {
    logger.error({ err }, 'blockUser error');
    res.status(500).json({ error: 'Failed to block user' });
  }
});

router.delete('/block/:targetUserId', async (req, res) => {
  try {
    await BlockedUser.deleteOne({
      blockerId:     req.user.userId,
      blockedUserId: req.params.targetUserId,
    });
    res.json({ ok: true, blocked: false });
  } catch (err) {
    logger.error({ err }, 'unblockUser error');
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

export default router;
