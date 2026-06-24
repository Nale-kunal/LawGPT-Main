/**
 * channelController.js
 *
 * Community channel management: list, join, leave, and announcement broadcasting.
 */

import CommunityChannel from '../models/CommunityChannel.js';
import Conversation from '../models/Conversation.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import CommunityMessage from '../models/Message.js';
import { encryptMessage } from '../services/encryptionService.js';
import { emitToConversation } from '../socket/socketServer.js';
import logger from '../../utils/logger.js';

// ── List all public channels ───────────────────────────────────────────────────
export async function listChannels(req, res) {
  try {
    const channels = await CommunityChannel.find({
      isPublic:   true,
      isArchived: false,
    })
      .sort({ sortOrder: 1, memberCount: -1 })
      .select('-moderators')
      .lean();

    // Mark which ones the current user has joined
    const userId = req.user.userId;
    const joined = await ConversationParticipant.find({
      userId,
      isRemoved: false,
    }).distinct('conversationId');

    const joinedSet = new Set(joined.map(id => id.toString()));

    const enriched = channels.map(ch => ({
      ...ch,
      isJoined: joinedSet.has(ch.conversationId?.toString()),
    }));

    res.json({ ok: true, channels: enriched });
  } catch (err) {
    logger.error({ err }, 'listChannels error');
    res.status(500).json({ error: 'Failed to load channels' });
  }
}

// ── Join a channel ────────────────────────────────────────────────────────────
export async function joinChannel(req, res) {
  try {
    const { slug } = req.params;
    const userId   = req.user.userId;

    const channel = await CommunityChannel.findOne({ slug, isPublic: true, isArchived: false }).lean();
    if (!channel) { return res.status(404).json({ error: 'Channel not found' }); }

    // Check member limit
    if (channel.memberCount >= (channel.settings?.maxMembers || 10000)) {
      return res.status(400).json({ error: 'Channel is full' });
    }

    // Check already joined
    const existing = await ConversationParticipant.exists({
      userId,
      conversationId: channel.conversationId,
      isRemoved: false,
    });
    if (existing) {
      return res.json({ ok: true, message: 'Already a member', conversationId: channel.conversationId });
    }

    // Add participant
    await ConversationParticipant.create({
      conversationId: channel.conversationId,
      userId,
      role: 'member',
    });

    // Increment member count
    await CommunityChannel.findByIdAndUpdate(channel._id, { $inc: { memberCount: 1 } });

    // Post system message
    const convId = channel.conversationId.toString();
    const { ciphertext, iv, authTag } = encryptMessage(`${req.user.name} joined the channel`, convId);
    await CommunityMessage.create({
      conversationId:  channel.conversationId,
      senderId:        userId,
      encryptedContent: ciphertext,
      iv, authTag,
      messageType:     'system',
      systemPayload:   { event: 'member_joined', data: { userId, name: req.user.name } },
    });

    emitToConversation(convId, 'member:joined', { userId, name: req.user.name, conversationId: convId });

    res.json({ ok: true, conversationId: channel.conversationId });
  } catch (err) {
    logger.error({ err }, 'joinChannel error');
    res.status(500).json({ error: 'Failed to join channel' });
  }
}

// ── Leave a channel ───────────────────────────────────────────────────────────
export async function leaveChannel(req, res) {
  try {
    const { slug } = req.params;
    const userId   = req.user.userId;

    const channel = await CommunityChannel.findOne({ slug }).lean();
    if (!channel) { return res.status(404).json({ error: 'Channel not found' }); }

    const result = await ConversationParticipant.updateOne(
      { userId, conversationId: channel.conversationId, isRemoved: false },
      { $set: { isRemoved: true, removedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      await CommunityChannel.findByIdAndUpdate(channel._id, { $inc: { memberCount: -1 } });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'leaveChannel error');
    res.status(500).json({ error: 'Failed to leave channel' });
  }
}

// ── Create channel (admin only) ───────────────────────────────────────────────
export async function createChannel(req, res) {
  try {
    const { name, slug, description, type = 'general', isReadOnly = false } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'slug must be lowercase alphanumeric with hyphens' });
    }

    // Create the underlying conversation
    const conv = await Conversation.create({
      type: type === 'announcement' ? 'announcement' : 'channel',
      name,
      channelSlug: slug,
      isReadOnly,
      createdBy: req.user.userId,
    });

    // Create channel record
    const channel = await CommunityChannel.create({
      slug, name, description, type, isReadOnly,
      conversationId: conv._id,
      createdBy: req.user.userId,
    });

    res.status(201).json({ ok: true, channel });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Channel slug already exists' });
    }
    logger.error({ err }, 'createChannel error');
    res.status(500).json({ error: 'Failed to create channel' });
  }
}

// ── Broadcast announcement (admin only) ──────────────────────────────────────
export async function broadcastAnnouncement(req, res) {
  try {
    const { slug }    = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Announcement content is required' });
    }

    const channel = await CommunityChannel.findOne({ slug }).lean();
    if (!channel) { return res.status(404).json({ error: 'Channel not found' }); }

    const convId = channel.conversationId.toString();
    const { ciphertext, iv, authTag } = encryptMessage(content.trim(), convId);

    const msg = await CommunityMessage.create({
      conversationId:   channel.conversationId,
      senderId:         req.user.userId,
      encryptedContent: ciphertext,
      iv, authTag,
      messageType:      'system',
      systemPayload:    { event: 'announcement', data: { adminName: req.user.name } },
    });

    emitToConversation(convId, 'message:new', {
      _id:            msg._id,
      conversationId: convId,
      senderId:       req.user.userId,
      content:        content.trim(),
      messageType:    'system',
      createdAt:      msg.createdAt,
    });

    res.json({ ok: true, messageId: msg._id });
  } catch (err) {
    logger.error({ err }, 'broadcastAnnouncement error');
    res.status(500).json({ error: 'Failed to broadcast announcement' });
  }
}
