/**
 * adminCommunityController.js
 *
 * Admin community dashboard: analytics, moderation, announcements.
 */

import Conversation from '../models/Conversation.js';
import CommunityMessage from '../models/Message.js';
import SupportTicket from '../models/SupportTicket.js';
import Feedback from '../models/Feedback.js';
import ModerationLog from '../models/ModerationLog.js';
import CommunityChannel from '../models/CommunityChannel.js';
import BlockedUser from '../models/BlockedUser.js';
import UserPresence from '../models/UserPresence.js';
import xss from 'xss';
import { emitToUser, getIO } from '../socket/socketServer.js';
import logger from '../../utils/logger.js';

// ── Community analytics dashboard ────────────────────────────────────────────
export async function getCommunityStats(req, res) {
  try {
    const [
      totalConversations,
      totalMessages,
      openTickets,
      resolvedTickets,
      totalFeedback,
      onlineUsers,
      totalChannels,
      flaggedMessages,
    ] = await Promise.all([
      Conversation.countDocuments({ deletedAt: null }),
      CommunityMessage.countDocuments({ isDeleted: false }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'investigating'] } }),
      SupportTicket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      Feedback.countDocuments({ isPublic: true }),
      UserPresence.countDocuments({ status: 'online' }),
      CommunityChannel.countDocuments({ isArchived: false }),
      CommunityMessage.countDocuments({ isFlagged: true, isModerated: false }),
    ]);

    // Messages in last 24h
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const messagesLast24h = await CommunityMessage.countDocuments({
      isDeleted: false,
      createdAt: { $gte: since24h },
    });

    res.json({
      ok: true,
      stats: {
        totalConversations,
        totalMessages,
        messagesLast24h,
        openTickets,
        resolvedTickets,
        onlineUsers,
        totalChannels,
        flaggedMessages,
        totalFeedback,
      },
    });
  } catch (err) {
    logger.error({ err }, 'getCommunityStats error');
    res.status(500).json({ error: 'Failed to load stats' });
  }
}

// ── Get online users ──────────────────────────────────────────────────────────
export async function getOnlineUsers(req, res) {
  try {
    const onlineUsers = await UserPresence.find({ status: 'online' })
      .populate('userId', 'name email role')
      .limit(200)
      .lean();
    res.json({ ok: true, users: onlineUsers, count: onlineUsers.length });
  } catch (err) {
    logger.error({ err }, 'getOnlineUsers error');
    res.status(500).json({ error: 'Failed to load online users' });
  }
}

// ── Get flagged/reported messages queue ───────────────────────────────────────
export async function getFlaggedMessages(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await CommunityMessage.find({
      isFlagged:   true,
      isModerated: false,
      isDeleted:   false,
    })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 100))
      .populate('senderId', 'name email')
      .populate('conversationId', 'name type')
      .lean();

    // Don't expose encrypted content in admin view — just metadata
    const sanitized = messages.map(({ encryptedContent, iv, authTag, ...rest }) => rest);

    const total = await CommunityMessage.countDocuments({ isFlagged: true, isModerated: false });
    res.json({ ok: true, messages: sanitized, total, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'getFlaggedMessages error');
    res.status(500).json({ error: 'Failed to load flagged messages' });
  }
}

// ── Resolve flagged message ───────────────────────────────────────────────────
export async function resolveFlaggedMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { action }    = req.body; // 'keep' | 'delete'

    if (!['keep', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'action must be keep or delete' });
    }

    const update = { $set: { isModerated: true, moderatedBy: req.user.userId } };
    if (action === 'delete') {
      update.$set.isDeleted        = true;
      update.$set.deletedAt        = new Date();
      update.$set.deletedBy        = req.user.userId;
      update.$set.encryptedContent = null;
      update.$set.iv               = null;
      update.$set.authTag          = null;
    }

    const msg = await CommunityMessage.findByIdAndUpdate(messageId, update, { new: true }).lean();
    if (!msg) { return res.status(404).json({ error: 'Message not found' }); }

    if (action === 'delete') {
      const io = getIO();
      if (io) {
        io.to(`conv:${msg.conversationId}`).emit('message:deleted', {
          messageId,
          deletedBy: req.user.userId,
        });
      }
    }

    res.json({ ok: true, action });
  } catch (err) {
    logger.error({ err }, 'resolveFlaggedMessage error');
    res.status(500).json({ error: 'Failed to resolve flagged message' });
  }
}

// ── Ban user ───────────────────────────────────────────────────────────────────
export async function banUser(req, res) {
  try {
    const { targetUserId, reason, duration } = req.body;

    if (!targetUserId || !reason?.trim()) {
      return res.status(400).json({ error: 'targetUserId and reason are required' });
    }

    const expiresAt = duration
      ? new Date(Date.now() + Number(duration) * 1000)
      : null;

    await ModerationLog.create({
      targetUserId,
      adminId:   req.user.userId,
      action:    duration ? 'temp_ban' : 'ban',
      reason:    xss(reason.trim()),
      duration:  duration || null,
      expiresAt,
    });

    // Force disconnect any active sockets for this user
    const io = getIO();
    if (io) {
      io.in(`user:${targetUserId}`).disconnectSockets(true);
    }

    // Notify user
    emitToUser(targetUserId, 'account:banned', {
      reason: xss(reason.trim()),
      expiresAt,
    });

    res.json({ ok: true, banned: true, expiresAt });
  } catch (err) {
    logger.error({ err }, 'banUser error');
    res.status(500).json({ error: 'Failed to ban user' });
  }
}

// ── Unban user ────────────────────────────────────────────────────────────────
export async function unbanUser(req, res) {
  try {
    const { targetUserId } = req.params;

    await ModerationLog.updateMany(
      {
        targetUserId,
        action: { $in: ['ban', 'temp_ban'] },
        isReversed: false,
      },
      {
        $set: {
          isReversed: true,
          reversedAt: new Date(),
          reversedBy: req.user.userId,
        },
      }
    );

    emitToUser(targetUserId, 'account:unbanned', {});
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'unbanUser error');
    res.status(500).json({ error: 'Failed to unban user' });
  }
}

// ── Get moderation logs ───────────────────────────────────────────────────────
export async function getModerationLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await ModerationLog.find({})
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 100))
      .populate('targetUserId', 'name email')
      .populate('adminId', 'name')
      .lean();

    const total = await ModerationLog.countDocuments();
    res.json({ ok: true, logs, total, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'getModerationLogs error');
    res.status(500).json({ error: 'Failed to load moderation logs' });
  }
}
