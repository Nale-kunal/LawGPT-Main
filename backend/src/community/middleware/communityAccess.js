/**
 * communityAccess.js
 *
 * Middleware to verify community feature access.
 * Reuses existing requireAuth — must run after it.
 */

import ConversationParticipant from '../models/ConversationParticipant.js';
import BlockedUser from '../models/BlockedUser.js';
import ModerationLog from '../models/ModerationLog.js';
import logger from '../../utils/logger.js';

/**
 * Check if the authenticated user is currently banned from community.
 */
export async function checkNotBanned(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const now = new Date();
    const ban = await ModerationLog.findOne({
      targetUserId: userId,
      action: { $in: ['ban', 'temp_ban'] },
      isReversed: false,
      $or: [
        { expiresAt: null },        // permanent ban
        { expiresAt: { $gt: now } }, // active temp ban
      ],
    }).lean();

    if (ban) {
      logger.warn({ userId, banId: ban._id }, 'Banned user attempted community access');
      return res.status(403).json({
        error: 'COMMUNITY_BANNED',
        message: ban.expiresAt
          ? `You are temporarily banned until ${ban.expiresAt.toISOString()}.`
          : 'You are permanently banned from the community.',
        reason: ban.reason,
        expiresAt: ban.expiresAt,
      });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'checkNotBanned middleware error');
    next(err);
  }
}

/**
 * Verify the authenticated user is a participant of the given conversation.
 * Attaches `req.participant` on success.
 * conversationId must be in req.params.conversationId or req.body.conversationId.
 */
export async function requireParticipant(req, res, next) {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId || req.body?.conversationId;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId required' });
    }

    const participant = await ConversationParticipant.findOne({
      userId,
      conversationId,
      isRemoved: false,
    }).lean();

    if (!participant) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You are not a member of this conversation' });
    }

    req.participant = participant;
    next();
  } catch (err) {
    logger.error({ err }, 'requireParticipant middleware error');
    next(err);
  }
}

/**
 * Verify the authenticated user is a moderator or admin of a conversation.
 */
export async function requireModerator(req, res, next) {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId || req.body?.conversationId;

    if (req.user?.role === 'admin') { return next(); } // Global admin bypasses

    const participant = await ConversationParticipant.findOne({
      userId,
      conversationId,
      role: { $in: ['owner', 'admin', 'moderator'] },
      isRemoved: false,
    }).lean();

    if (!participant) {
      return res.status(403).json({ error: 'MODERATOR_REQUIRED' });
    }

    req.participant = participant;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Check if two users have a blocking relationship (either direction).
 * Returns true if blocked.
 */
export async function checkBlocked(userId1, userId2) {
  return BlockedUser.exists({
    $or: [
      { blockerId: userId1, blockedUserId: userId2 },
      { blockerId: userId2, blockedUserId: userId1 },
    ],
  });
}
