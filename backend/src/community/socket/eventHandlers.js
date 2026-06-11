/**
 * eventHandlers.js
 *
 * Socket.IO event handlers for real-time community features.
 * Supporting dual event-naming schemas for robust backward-compatibility.
 */

import mongoose from 'mongoose';
import xss from 'xss';
import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import CommunityMessage from '../models/Message.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import BlockedUser from '../models/BlockedUser.js';
import { encryptMessage, generatePreview, isNonceReplayed } from '../services/encryptionService.js';
import { setUserOnline, setSocketOffline, refreshPresence, HEARTBEAT_INT } from '../services/presenceService.js';
import { notifyNewMessage } from '../services/communityNotificationService.js';
import { checkSocketRateLimit, handleRateLimitViolation } from './rateLimiter.js';
import { getModerationQueue } from '../workers/moderationWorker.js';
import { getCommunityNotifQueue } from '../workers/communityNotificationWorker.js';
import logger from '../../utils/logger.js';

// ── Zod Validation Schemas ─────────────────────────────────────────────────────
const ObjectIdSchema = z.string().refine(val => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId reference'
});

const joinConversationSchema = z.object({
  conversationId: ObjectIdSchema
});

const sendMessageSchema = z.object({
  conversationId: ObjectIdSchema,
  content: z.string().min(1).max(10000),
  messageType: z.enum(['text', 'image', 'voice', 'file', 'video']).default('text'),
  replyTo: ObjectIdSchema.optional().nullable(),
  clientMessageId: z.string().optional().nullable(),
  attachments: z.array(ObjectIdSchema).optional().default([])
});

const typingSchema = z.object({
  conversationId: ObjectIdSchema
});

const readMessageSchema = z.object({
  conversationId: ObjectIdSchema,
  messageId: ObjectIdSchema
});

const reactionSchema = z.object({
  messageId: ObjectIdSchema,
  emoji: z.string().min(1).max(10),
  action: z.enum(['add', 'remove'])
});

// ── Rate limit guard wrapper ────────────────────────────────────────────────────
async function withRateLimit(socket, event, handler) {
  const allowed = await checkSocketRateLimit(socket.user.userId, event);
  if (!allowed) {
    await handleRateLimitViolation(socket, event);
    return;
  }
  return handler();
}

// ── Verify user is participant in conversation ────────────────────────────────
async function verifyParticipant(userId, conversationId) {
  const participant = await ConversationParticipant.findOne({
    userId,
    conversationId,
    isRemoved: false,
  }).lean();
  return participant;
}

// ── Register all handlers for a socket ───────────────────────────────────────
export function registerEventHandlers(socket, io) {
  const userId = socket.user.userId;
  const userName = socket.user.name;

  // ─── Connection: set online ────────────────────────────────────────────────
  (async () => {
    try {
      const userAgent = socket.handshake.headers['user-agent'] || null;
      const ipAddress = socket.handshake.address || null;
      await setUserOnline(userId, socket.id, 'web', userAgent, ipAddress);

      // Join personal room for direct notifications
      socket.join(`user:${userId}`);
      // Broadcast presence to relevant conversations (both formats)
      io.emit('presence:update', { userId, status: 'online' });
      io.emit('presenceUpdate', { userId, status: 'online' });
      logger.info({ userId, socketId: socket.id }, 'Community socket connected');
    } catch (err) {
      logger.error({ err, userId }, 'Socket connection setup failed');
    }
  })();

  // ─── Heartbeat ────────────────────────────────────────────────────────────
  socket.on('heartbeat', async () => {
    try {
      await refreshPresence(userId);
      socket.emit('heartbeat:ack', { ts: Date.now() });
    } catch { /* non-fatal */ }
  });

  // ─── Join conversation room ───────────────────────────────────────────────
  const handleJoinConversation = async (data, callback) => {
    await withRateLimit(socket, 'joinConversation', async () => {
      try {
        const parsed = joinConversationSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ error: parsed.error.errors[0].message });
        }
        const { conversationId } = parsed.data;

        // Access control — must be a participant
        const participant = await verifyParticipant(userId, conversationId);
        if (!participant) {
          return callback?.({ error: 'ACCESS_DENIED' });
        }

        socket.join(`conv:${conversationId}`);
        callback?.({ ok: true });
        logger.debug({ userId, conversationId }, 'Joined conversation room');
      } catch (err) {
        logger.error({ err, userId }, 'conversation:join error');
        callback?.({ error: 'Internal error' });
      }
    });
  };

  socket.on('conversation:join', handleJoinConversation);
  socket.on('joinConversation', handleJoinConversation);

  // ─── Leave conversation room ──────────────────────────────────────────────
  const handleLeaveConversation = (data) => {
    const parsed = joinConversationSchema.safeParse(data);
    if (parsed.success) {
      socket.leave(`conv:${parsed.data.conversationId}`);
    }
  };

  socket.on('conversation:leave', handleLeaveConversation);
  socket.on('leaveConversation', handleLeaveConversation);

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (data, callback) => {
    await withRateLimit(socket, 'sendMessage', async () => {
      try {
        const parsed = sendMessageSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ error: parsed.error.errors[0].message });
        }

        const {
          conversationId,
          content,
          messageType,
          replyTo,
          clientMessageId,
          attachments,
        } = parsed.data;

        // Access control
        const participant = await verifyParticipant(userId, conversationId);
        if (!participant) {
          return callback?.({ error: 'ACCESS_DENIED' });
        }

        // Check if conversation is read-only
        const conv = await Conversation.findById(conversationId).select('isReadOnly type').lean();
        if (!conv) { return callback?.({ error: 'Conversation not found' }); }
        if (conv.isReadOnly && socket.user.role !== 'admin') {
          return callback?.({ error: 'This channel is read-only' });
        }

        // Block check: prevent sending to/from blocked users
        if (conv.type === 'private') {
          const otherParticipant = await ConversationParticipant.findOne({
            conversationId,
            userId: { $ne: userId },
          }).lean();
          if (otherParticipant) {
            const isBlocked = await BlockedUser.exists({
              $or: [
                { blockerId: otherParticipant.userId, blockedUserId: userId },
                { blockerId: userId, blockedUserId: otherParticipant.userId },
              ],
            });
            if (isBlocked) {
              return callback?.({ error: 'Cannot send message — user blocked' });
            }
          }
        }

        // Idempotency check
        if (clientMessageId) {
          const duplicate = await CommunityMessage.exists({ clientMessageId });
          if (duplicate) {
            return callback?.({ ok: true, deduplicated: true });
          }
        }

        // Sanitize content
        const sanitized = xss(content.trim());

        // Encrypt
        const { ciphertext, iv, authTag, keyVersion } = encryptMessage(sanitized, conversationId);

        // Strict Replay Attack Nonce Protection
        const isReplayed = await isNonceReplayed(conversationId, iv);
        if (isReplayed) {
          logger.error({ conversationId, userId, iv }, 'Replay attack detected for IV/nonce');
          return callback?.({ error: 'REPLAY_ATTACK_DETECTED' });
        }

        // Persist
        const message = await CommunityMessage.create({
          conversationId,
          senderId:         userId,
          encryptedContent: ciphertext,
          iv,
          authTag,
          keyVersion,
          messageType,
          replyTo:          replyTo || null,
          clientMessageId:  clientMessageId || null,
          attachments,
          nonce:            iv,
        });

        // Update conversation last message
        const preview = generatePreview(messageType, sanitized);
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            'lastMessage.messageId': message._id,
            'lastMessage.senderId':  userId,
            'lastMessage.preview':   preview,
            'lastMessage.sentAt':    message.createdAt,
          },
        });

        // Build broadcast payload (decrypted for live delivery in same call)
        const broadcastMsg = {
          _id:            message._id,
          conversationId,
          senderId:       { _id: userId, name: userName }, // Compatible with frontend population
          senderName:     userName,
          content:        sanitized,
          messageType,
          replyTo:        replyTo || null,
          clientMessageId: clientMessageId || null,
          deliveryStatus: 'sent',
          createdAt:      message.createdAt,
          attachments:    [],
        };

        // Broadcast to all participants in the room (both formats)
        socket.to(`conv:${conversationId}`).emit('message:new', broadcastMsg);
        socket.to(`conv:${conversationId}`).emit('message', broadcastMsg);

        // Emit delivery confirmation to sender
        callback?.({ ok: true, messageId: message._id, createdAt: message.createdAt });

        // Dispatch to background moderation queue
        const modQueue = getModerationQueue();
        if (modQueue) {
          await modQueue.add('analyze_message', {
            type: 'analyze_message',
            payload: {
              messageId: message._id.toString(),
              content: sanitized,
              conversationId,
              senderId: userId
            }
          }).catch(err => logger.warn({ err }, 'Failed to queue moderation task'));
        }

        // Dispatch to background notifications queue
        const notifQueue = getCommunityNotifQueue();
        if (notifQueue) {
          await notifQueue.add('new_message_notification', {
            type: 'new_message_notification',
            payload: {
              conversationId,
              senderId: userId,
              senderName: userName,
              messageType,
              preview
            }
          }).catch(err => logger.warn({ err }, 'Failed to queue notification task'));
        } else {
          notifyNewMessage({
            conversationId,
            senderId:    userId,
            senderName:  userName,
            messageType,
            preview,
          }).catch(() => {});
        }

      } catch (err) {
        logger.error({ err, userId }, 'message:send error');
        callback?.({ error: 'Message send failed' });
      }
    });
  };

  socket.on('message:send', handleSendMessage);
  socket.on('sendMessage', handleSendMessage);

  // ─── Typing indicators ────────────────────────────────────────────────────
  const handleTypingStart = async (data) => {
    await withRateLimit(socket, 'typingStart', async () => {
      const parsed = typingSchema.safeParse(data);
      if (!parsed.success) { return; }
      const { conversationId } = parsed.data;

      const participant = await verifyParticipant(userId, conversationId);
      if (!participant) { return; }
      
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId, name: userName, conversationId });
      socket.to(`conv:${conversationId}`).emit('typingStart', { userId, userName, conversationId });
    });
  };

  socket.on('typing:start', handleTypingStart);
  socket.on('typingStart', handleTypingStart);

  const handleTypingStop = async (data) => {
    const parsed = typingSchema.safeParse(data);
    if (!parsed.success) { return; }
    const { conversationId } = parsed.data;
    
    socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
    socket.to(`conv:${conversationId}`).emit('typingStop', { userId, userName, conversationId });
  };

  socket.on('typing:stop', handleTypingStop);
  socket.on('typingStop', handleTypingStop);

  // ─── Mark messages read ───────────────────────────────────────────────────
  const handleMarkAsRead = async (data, callback) => {
    try {
      const parsed = readMessageSchema.safeParse(data);
      if (!parsed.success) {
        // Fallback for markRead call (which might only send conversationId)
        if (data && data.conversationId && mongoose.Types.ObjectId.isValid(data.conversationId)) {
          const conversationId = data.conversationId;
          const participant = await verifyParticipant(userId, conversationId);
          if (participant) {
            await ConversationParticipant.updateOne(
              { userId, conversationId },
              { $set: { unreadCount: 0, lastReadAt: new Date() } }
            );
            callback?.({ ok: true });
          }
        }
        return;
      }
      const { conversationId, messageId } = parsed.data;

      const participant = await verifyParticipant(userId, conversationId);
      if (!participant) { return callback?.({ error: 'ACCESS_DENIED' }); }

      // Update last read pointer
      await ConversationParticipant.updateOne(
        { userId, conversationId },
        { $set: { lastReadMessageId: messageId, lastReadAt: new Date(), unreadCount: 0 } }
      );

      // Add to message readBy array
      await CommunityMessage.updateOne(
        { _id: messageId },
        {
          $addToSet: { readBy: { userId, readAt: new Date() } },
          $set: { deliveryStatus: 'read' },
        }
      );

      // Broadcast read receipt to conversation (both formats)
      socket.to(`conv:${conversationId}`).emit('message:read', {
        messageId,
        userId,
        conversationId,
        readAt: new Date(),
      });
      socket.to(`conv:${conversationId}`).emit('messageRead', {
        messageId,
        userId,
        conversationId,
        readAt: new Date(),
      });

      callback?.({ ok: true });
    } catch (err) {
      logger.error({ err, userId }, 'message:read error');
    }
  };

  socket.on('message:read', handleMarkAsRead);
  socket.on('markRead', handleMarkAsRead);

  // ─── Reactions ────────────────────────────────────────────────────────────
  const handleReactions = async (data, callback) => {
    await withRateLimit(socket, 'messageReaction', async () => {
      try {
        const parsed = reactionSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ error: parsed.error.errors[0].message });
        }
        const { messageId, emoji, action } = parsed.data;

        const msg = await CommunityMessage.findById(messageId).select('conversationId reactionsSummary').lean();
        if (!msg) { return callback?.({ error: 'Message not found' }); }

        const participant = await verifyParticipant(userId, msg.conversationId.toString());
        if (!participant) { return callback?.({ error: 'ACCESS_DENIED' }); }

        let update;
        if (action === 'add') {
          await CommunityMessage.updateOne(
            { _id: messageId, 'reactionsSummary.emoji': { $ne: emoji } },
            { $push: { reactionsSummary: { emoji, count: 1, userIds: [userId] } } }
          );
          update = await CommunityMessage.findOneAndUpdate(
            { _id: messageId, 'reactionsSummary.emoji': emoji },
            {
              $addToSet: { 'reactionsSummary.$.userIds': userId },
              $inc:      { 'reactionsSummary.$.count': 1 },
            },
            { new: true }
          ).select('reactionsSummary').lean();
        } else {
          update = await CommunityMessage.findOneAndUpdate(
            { _id: messageId, 'reactionsSummary.emoji': emoji },
            {
              $pull: { 'reactionsSummary.$.userIds': userId },
              $inc:  { 'reactionsSummary.$.count': -1 },
            },
            { new: true }
          ).select('reactionsSummary').lean();
        }

        const convId = msg.conversationId.toString();
        
        // Broadcast reactions to room (both formats)
        io.to(`conv:${convId}`).emit('message:reacted', { messageId, emoji, action, userId });
        io.to(`conv:${convId}`).emit('reactionUpdate', {
          messageId,
          reactions: update?.reactionsSummary || []
        });
        
        callback?.({ ok: true });
      } catch (err) {
        logger.error({ err, userId }, 'message:react error');
        callback?.({ error: 'Reaction failed' });
      }
    });
  };

  socket.on('message:react', handleReactions);
  socket.on('messageReaction', handleReactions);

  // ─── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', async (reason) => {
    try {
      const offlineUserId = await setSocketOffline(socket.id);
      if (offlineUserId) {
        io.emit('presence:update', { userId: offlineUserId, status: 'offline' });
        io.emit('presenceUpdate', { userId: offlineUserId, status: 'offline' });
      }
      logger.info({ userId, socketId: socket.id, reason }, 'Community socket disconnected');
    } catch (err) {
      logger.error({ err, userId }, 'Socket disconnect cleanup failed');
    }
  });

  // ─── Error handler ────────────────────────────────────────────────────────
  socket.on('error', (err) => {
    logger.error({ err, userId, socketId: socket.id }, 'Socket error');
  });
}
