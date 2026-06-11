/**
 * conversationController.js
 * 
 * Handles conversation CRUD and participant management.
 */

import mongoose from 'mongoose';
import xss from 'xss';
import Conversation from '../models/Conversation.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import CommunityMessage from '../models/Message.js';
import BlockedUser from '../models/BlockedUser.js';
import { decryptMessages } from '../services/encryptionService.js';
import { getBulkPresence } from '../services/presenceService.js';
import { emitToConversation } from '../socket/socketServer.js';
import logger from '../../utils/logger.js';

// Helper to format a conversation to strictly match frontend interface
export function formatConversation(conv, myUserId = null, participantMeta = null) {
  if (!conv) {return null;}
  
  const formattedParticipants = (conv.participants || []).map(p => {
    if (p && typeof p === 'object' && p._id) {
      return {
        _id: p._id.toString(),
        name: p.name || 'Unknown User',
        email: p._id.toString() === myUserId?.toString() ? 'me' : (p.email || ''),
        role: p.role || 'user',
        avatarUrl: p.avatarUrl || p.profile?.avatarUrl || null,
      };
    } else {
      const idStr = p ? p.toString() : '';
      return {
        _id: idStr,
        name: 'Unknown User',
        email: idStr === myUserId?.toString() ? 'me' : '',
        role: 'user',
        avatarUrl: null,
      };
    }
  });

  return {
    _id: conv._id ? conv._id.toString() : '',
    type: conv.type || 'private',
    name: conv.name || null,
    description: conv.description || null,
    avatarUrl: conv.avatarUrl || null,
    channelSlug: conv.channelSlug || null,
    participants: formattedParticipants,
    isEncrypted: !!conv.isEncrypted,
    isArchived: !!conv.isArchived,
    isReadOnly: !!conv.isReadOnly,
    lastMessage: conv.lastMessage && conv.lastMessage.messageId ? {
      messageId: conv.lastMessage.messageId.toString(),
      senderId: conv.lastMessage.senderId ? conv.lastMessage.senderId.toString() : null,
      preview: conv.lastMessage.preview || '',
      sentAt: conv.lastMessage.sentAt ? new Date(conv.lastMessage.sentAt).toISOString() : null,
    } : undefined,
    pinnedMessages: (conv.pinnedMessages || []).map(m => m.toString()),
    createdBy: conv.createdBy ? conv.createdBy.toString() : null,
    supportTicketId: conv.supportTicketId ? conv.supportTicketId.toString() : undefined,
    createdAt: conv.createdAt ? new Date(conv.createdAt).toISOString() : null,
    updatedAt: conv.updatedAt ? new Date(conv.updatedAt).toISOString() : null,
    unreadCount: participantMeta?.unreadCount || 0,
    isMuted: !!participantMeta?.isMuted,
  };
}

// ── List conversations for current user ───────────────────────────────────────
export async function listConversations(req, res) {
  try {
    const userId  = req.user.userId;
    const { page = 1, limit = 30, archived = false } = req.query;
    const skip = (Number(page) - 1) * Math.min(Number(limit), 100);

    const participants = await ConversationParticipant.find({
      userId,
      isRemoved: false,
      isArchivedByUser: archived === 'true',
    })
      .sort({ lastReadAt: -1 })
      .skip(skip)
      .limit(Math.min(Number(limit), 100))
      .populate({
        path: 'conversationId',
        select: 'name type channelSlug lastMessage participants isEncrypted avatarUrl pinnedMessages isArchived isReadOnly description createdBy supportTicketId createdAt updatedAt',
        populate: [
          {
            path: 'participants',
            select: 'name email role profile.avatarUrl',
          },
          {
            path: 'lastMessage.senderId',
            select: 'name',
          }
        ]
      })
      .lean();

    const conversations = participants
      .filter(p => p.conversationId) // filter deleted conversations
      .map(p => formatConversation(p.conversationId, userId, {
        unreadCount:      p.unreadCount,
        isMuted:          p.isMuted,
        isPinnedByUser:   p.isPinnedByUser,
        isArchivedByUser: p.isArchivedByUser,
        role:             p.role,
        lastReadAt:       p.lastReadAt,
      }));

    res.json({ ok: true, conversations, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'listConversations error');
    res.status(500).json({ error: 'Failed to load conversations' });
  }
}

// ── Create new private or group conversation ──────────────────────────────────
export async function createPrivateConversation(req, res) {
  try {
    let { targetUserId, type = 'private', participants = [], name, description } = req.body;
    const myUserId = req.user.userId;

    if (type === 'private') {
      if (!targetUserId && Array.isArray(participants)) {
        targetUserId = participants.find(p => p !== myUserId);
      }

      if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({ error: 'Invalid targetUserId for private conversation' });
      }
      if (targetUserId.toString() === myUserId.toString()) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
      }

      // Check blocking
      const isBlocked = await BlockedUser.exists({
        $or: [
          { blockerId: myUserId, blockedUserId: targetUserId },
          { blockerId: targetUserId, blockedUserId: myUserId },
        ],
      });
      if (isBlocked) {
        return res.status(403).json({ error: 'Cannot message this user' });
      }

      // Check if private conversation already exists
      const myParticipations = await ConversationParticipant.find({
        userId: myUserId,
        isRemoved: false,
      }).distinct('conversationId');

      const existing = await Conversation.findOne({
        _id: { $in: myParticipations },
        type: 'private',
        participants: { $all: [myUserId, targetUserId], $size: 2 },
      }).lean();

      if (existing) {
        const populatedExisting = await Conversation.findById(existing._id)
          .populate('participants', 'name email role profile.avatarUrl')
          .lean();
        return res.json({ ok: true, conversation: formatConversation(populatedExisting, myUserId), existed: true });
      }

      // Create conversation
      const conv = await Conversation.create({
        type: 'private',
        participants: [myUserId, targetUserId],
        createdBy: myUserId,
      });

      // Create participant records
      await ConversationParticipant.insertMany([
        { conversationId: conv._id, userId: myUserId,     role: 'owner' },
        { conversationId: conv._id, userId: targetUserId, role: 'member' },
      ]);

      const populatedConv = await Conversation.findById(conv._id)
        .populate('participants', 'name email role profile.avatarUrl')
        .lean();

      return res.status(201).json({ ok: true, conversation: formatConversation(populatedConv, myUserId) });
    } else if (type === 'group') {
      const cleanParticipants = [...new Set(participants.concat(myUserId))]
        .filter(p => mongoose.Types.ObjectId.isValid(p));

      if (cleanParticipants.length < 2) {
        return res.status(400).json({ error: 'Group conversation requires at least two participants' });
      }

      const conv = await Conversation.create({
        type: 'group',
        name: name ? xss(name.trim()) : 'Group Chat',
        description: description ? xss(description.trim()) : null,
        participants: cleanParticipants,
        createdBy: myUserId,
      });

      const participantDocs = cleanParticipants.map(uid => ({
        conversationId: conv._id,
        userId: uid,
        role: uid.toString() === myUserId.toString() ? 'owner' : 'member',
      }));

      await ConversationParticipant.insertMany(participantDocs);

      const populatedConv = await Conversation.findById(conv._id)
        .populate('participants', 'name email role profile.avatarUrl')
        .lean();

      return res.status(201).json({ ok: true, conversation: formatConversation(populatedConv, myUserId) });
    } else {
      return res.status(400).json({ error: 'Unsupported conversation type' });
    }
  } catch (err) {
    logger.error({ err }, 'createPrivateConversation error');
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

// ── Get messages for a conversation (cursor-paginated) ────────────────────────
export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { before, limit = 50 } = req.query;
    const msgLimit = Math.min(Number(limit), 100);

    // Access control: must be an active participant in this conversation
    const isParticipant = await ConversationParticipant.exists({
      conversationId,
      userId,
      isRemoved: false,
    });
    if (!isParticipant) {
      logger.warn({ userId, conversationId }, 'Unauthorized attempt to fetch conversation messages');
      return res.status(403).json({ error: 'ACCESS_DENIED' });
    }

    const query = {
      conversationId,
      isDeleted: false,
    };

    // Cursor pagination: messages before a given message ID
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      const cursor = await CommunityMessage.findById(before).select('createdAt').lean();
      if (cursor) {
        query.createdAt = { $lt: cursor.createdAt };
      }
    }

    const messages = await CommunityMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(msgLimit)
      .populate('senderId', 'name profile.fullName')
      .lean();

    // Decrypt all messages
    const decrypted = decryptMessages(messages.reverse()); // oldest first

    // Get oldest message ID for next cursor
    const nextCursor = messages.length === msgLimit ? messages[0]._id : null;

    res.json({ ok: true, messages: decrypted, nextCursor });
  } catch (err) {
    logger.error({ err }, 'getMessages error');
    res.status(500).json({ error: 'Failed to load messages' });
  }
}

// ── Get conversation details with participant presence ────────────────────────
export async function getConversationDetails(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Access control: must be an active participant
    const isParticipant = await ConversationParticipant.exists({
      conversationId,
      userId,
      isRemoved: false,
    });
    if (!isParticipant) {
      logger.warn({ userId, conversationId }, 'Unauthorized attempt to fetch conversation details');
      return res.status(403).json({ error: 'ACCESS_DENIED' });
    }

    const conv = await Conversation.findById(conversationId)
      .populate('participants', 'name email role profile.avatarUrl')
      .lean();
    if (!conv) { return res.status(404).json({ error: 'Conversation not found' }); }

    const participants = await ConversationParticipant.find({
      conversationId,
      isRemoved: false,
    })
      .populate('userId', 'name profile.fullName')
      .lean();

    // Presence for all participants
    const presenceMap = await getBulkPresence(participants.map(p => p.userId._id));

    const enrichedParticipants = participants.map(p => ({
      ...p,
      presence: presenceMap[p.userId._id.toString()] || { status: 'offline' },
    }));

    res.json({ ok: true, conversation: formatConversation(conv, userId), participants: enrichedParticipants });
  } catch (err) {
    logger.error({ err }, 'getConversationDetails error');
    res.status(500).json({ error: 'Failed to load conversation details' });
  }
}

// ── Archive / leave a conversation ────────────────────────────────────────────
export async function leaveConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    await ConversationParticipant.updateOne(
      { conversationId, userId },
      { $set: { isRemoved: true, removedAt: new Date(), removedBy: userId } }
    );

    // For private chats: soft-archive the conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: { participants: userId },
    });

    // Notify others
    emitToConversation(conversationId, 'member:left', { userId, conversationId });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'leaveConversation error');
    res.status(500).json({ error: 'Failed to leave conversation' });
  }
}

// ── Pin / unpin conversation for current user ─────────────────────────────────
export async function pinConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    await ConversationParticipant.updateOne(
      { conversationId, userId },
      { $set: { isPinnedByUser: !!pin } }
    );

    res.json({ ok: true, pinned: !!pin });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pin status' });
  }
}
