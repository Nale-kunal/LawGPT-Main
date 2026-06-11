/**
 * messageController.js
 *
 * REST endpoint handlers for message operations (edit, delete, pin, forward, search).
 * Real-time delivery happens through Socket.IO; REST is used for operations
 * that require database writes and need to be reliable even without socket connection.
 */

import mongoose from 'mongoose';
import xss from 'xss';
import CommunityMessage from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import { encryptMessage, decryptMessage } from '../services/encryptionService.js';
import { emitToConversation } from '../socket/socketServer.js';
import logger from '../../utils/logger.js';

// ── Edit message ──────────────────────────────────────────────────────────────
export async function editMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { content }   = req.body;
    const userId        = req.user.userId;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (content.length > 10000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const msg = await CommunityMessage.findById(messageId).lean();
    if (!msg) { return res.status(404).json({ error: 'Message not found' }); }
    if (msg.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }
    if (msg.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit deleted message' });
    }

    // Save old version to history
    const historyEntry = {
      encryptedContent: msg.encryptedContent,
      iv:               msg.iv,
      authTag:          msg.authTag,
      editedAt:         new Date(),
    };

    // Encrypt new content
    const sanitized = xss(content.trim());
    const convId = msg.conversationId.toString();
    const { ciphertext, iv, authTag } = encryptMessage(sanitized, convId);

    await CommunityMessage.findByIdAndUpdate(messageId, {
      $set: {
        encryptedContent: ciphertext,
        iv,
        authTag,
        isEdited:         true,
        editedAt:         new Date(),
      },
      $push: { editHistory: historyEntry },
    });

    // Broadcast edit to conversation room
    emitToConversation(convId, 'message:edited', {
      messageId,
      content:   sanitized,
      editedAt:  new Date(),
    });

    res.json({ ok: true, editedAt: new Date() });
  } catch (err) {
    logger.error({ err }, 'editMessage error');
    res.status(500).json({ error: 'Failed to edit message' });
  }
}

// ── Soft delete message ───────────────────────────────────────────────────────
export async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const userId        = req.user.userId;

    const msg = await CommunityMessage.findById(messageId).lean();
    if (!msg) { return res.status(404).json({ error: 'Message not found' }); }

    // Allow sender OR admin to delete
    const isOwner = msg.senderId.toString() === userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'ACCESS_DENIED' });
    }

    await CommunityMessage.findByIdAndUpdate(messageId, {
      $set: {
        isDeleted:        true,
        deletedAt:        new Date(),
        deletedBy:        userId,
        // Wipe encrypted content on delete
        encryptedContent: null,
        iv:               null,
        authTag:          null,
      },
    });

    const convId = msg.conversationId.toString();
    emitToConversation(convId, 'message:deleted', { messageId, deletedBy: userId });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'deleteMessage error');
    res.status(500).json({ error: 'Failed to delete message' });
  }
}

// ── Pin message ───────────────────────────────────────────────────────────────
export async function pinMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { pin = true } = req.body;

    const msg = await CommunityMessage.findById(messageId).lean();
    if (!msg) { return res.status(404).json({ error: 'Message not found' }); }

    await CommunityMessage.findByIdAndUpdate(messageId, { $set: { isPinned: !!pin } });

    const convId = msg.conversationId.toString();

    // Update conversation's pinnedMessages array to keep in sync with model
    if (pin) {
      await Conversation.findByIdAndUpdate(convId, { $addToSet: { pinnedMessages: messageId } });
    } else {
      await Conversation.findByIdAndUpdate(convId, { $pull: { pinnedMessages: messageId } });
    }

    emitToConversation(convId, 'message:pinned', { messageId, isPinned: !!pin });

    res.json({ ok: true, isPinned: !!pin });
  } catch (err) {
    logger.error({ err }, 'pinMessage error');
    res.status(500).json({ error: 'Failed to pin message' });
  }
}

// ── Forward message ───────────────────────────────────────────────────────────
export async function forwardMessage(req, res) {
  try {
    const { messageId }         = req.params;
    const { targetConversationId } = req.body;
    const userId                = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(targetConversationId)) {
      return res.status(400).json({ error: 'Invalid targetConversationId' });
    }

    const msg = await CommunityMessage.findById(messageId).lean();
    if (!msg || msg.isDeleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify access to source
    const srcParticipant = await ConversationParticipant.exists({
      userId,
      conversationId: msg.conversationId,
      isRemoved: false,
    });
    if (!srcParticipant) { return res.status(403).json({ error: 'ACCESS_DENIED' }); }

    // Verify access to target
    const tgtParticipant = await ConversationParticipant.exists({
      userId,
      conversationId: targetConversationId,
      isRemoved: false,
    });
    if (!tgtParticipant) { return res.status(403).json({ error: 'TARGET_ACCESS_DENIED' }); }

    // Decrypt from source, re-encrypt for target (different key)
    const plaintext = decryptMessage(msg.encryptedContent, msg.iv, msg.authTag, msg.conversationId.toString(), msg.keyVersion || '1');
    const { ciphertext, iv, authTag } = encryptMessage(plaintext, targetConversationId);

    const forwarded = await CommunityMessage.create({
      conversationId:  targetConversationId,
      senderId:        userId,
      encryptedContent: ciphertext,
      iv,
      authTag,
      messageType:     msg.messageType,
      forwardedFrom:   messageId,
      attachments:     msg.attachments,
    });

    emitToConversation(targetConversationId, 'message:new', {
      _id:            forwarded._id,
      conversationId: targetConversationId,
      senderId:       userId,
      content:        plaintext,
      messageType:    msg.messageType,
      isForwarded:    true,
      createdAt:      forwarded.createdAt,
    });

    res.json({ ok: true, messageId: forwarded._id });
  } catch (err) {
    logger.error({ err }, 'forwardMessage error');
    res.status(500).json({ error: 'Failed to forward message' });
  }
}

// ── Search messages ───────────────────────────────────────────────────────────
// Note: full-text search on encrypted content is not possible.
// This searches MongoDB Atlas full-text on the sender name and message preview.
// For production: consider maintaining a separate, user-controlled search index.
export async function searchMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Since messages are encrypted, search is done by fetching recent messages
    // and filtering client-side in the response (decrypted) up to a window.
    // For production, consider a separate plaintext search index.
    const messages = await CommunityMessage.find({
      conversationId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(500) // search last 500 messages
      .lean();

    const searchTerm = q.toLowerCase().trim();
    const results = [];

    for (const msg of messages) {
      if (results.length >= Number(limit)) { break; }
      try {
        if (msg.encryptedContent && msg.iv && msg.authTag) {
          const decrypted = decryptMessage(msg.encryptedContent, msg.iv, msg.authTag, conversationId, msg.keyVersion || '1');
          if (decrypted.toLowerCase().includes(searchTerm)) {
            results.push({
              ...msg,
              content:          decrypted,
              encryptedContent: undefined,
              iv:               undefined,
              authTag:          undefined,
            });
          }
        }
      } catch { /* skip undecryptable messages */ }
    }

    res.json({ ok: true, results, query: q });
  } catch (err) {
    logger.error({ err }, 'searchMessages error');
    res.status(500).json({ error: 'Search failed' });
  }
}
