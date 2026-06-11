/**
 * supportController.js
 *
 * Support ticket lifecycle management.
 */

import mongoose from 'mongoose';
import xss from 'xss';
import SupportTicket from '../models/SupportTicket.js';
import Conversation from '../models/Conversation.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import { createNotification } from '../services/communityNotificationService.js';
import { emitToUser } from '../socket/socketServer.js';
import { checkRateLimit } from '../socket/rateLimiter.js';
import { formatConversation } from './conversationController.js';
import logger from '../../utils/logger.js';

// ── Create support ticket ─────────────────────────────────────────────────────
export async function createSupportTicket(req, res) {
  try {
    const {
      title, description, priority = 'medium', category = 'other', tags = [],
    } = req.body;
    const userId = req.user.userId;

    // Rate Limiting: 3 tickets per minute max
    const allowed = await checkRateLimit(userId, 'createTicket');
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded: too many support tickets created. Please wait before filing another.' });
    }

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const sanitizedTitle = xss(title.trim());
    const sanitizedDesc  = xss(description.trim());

    // Create support conversation
    const conv = await Conversation.create({
      type: 'support',
      name: `Support: ${sanitizedTitle}`,
      participants: [userId],
      createdBy: userId,
    });

    // Add user as participant
    await ConversationParticipant.create({
      conversationId: conv._id,
      userId,
      role: 'owner',
    });

    // Create ticket
    const ticket = await SupportTicket.create({
      conversationId:  conv._id,
      userId,
      title:           sanitizedTitle,
      description:     sanitizedDesc,
      priority,
      category,
      tags:            tags.slice(0, 10).map(t => xss(String(t)).slice(0, 50)),
      userAgent:       req.headers['user-agent']?.slice(0, 500) || null,
      platform:        'web',
    });

    // Link ticket to conversation
    await Conversation.findByIdAndUpdate(conv._id, {
      $set: { supportTicketId: ticket._id },
    });

    // Notify all admins
    // (In production: use a BullMQ job to avoid blocking the response)
    const User = (await import('../../models/User.js')).default;
    const admins = await User.find({ role: 'admin' }).select('_id name').lean();
    for (const admin of admins) {
      await createNotification({
        userId:         admin._id,
        type:           'support_reply',
        title:          'New Support Ticket',
        body:           `${req.user.name}: ${sanitizedTitle}`,
        conversationId: conv._id,
      });
      emitToUser(admin._id.toString(), 'support:new_ticket', {
        ticketId:       ticket._id,
        conversationId: conv._id,
        title:          sanitizedTitle,
        priority,
      });
    }

    res.status(201).json({ ok: true, ticket, conversationId: conv._id });
  } catch (err) {
    logger.error({ err }, 'createSupportTicket error');
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
}

// ── Get user's own tickets ────────────────────────────────────────────────────
export async function getUserTickets(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user.userId };
    if (status) { query.status = status; }

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 50))
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

    const formattedTickets = tickets.map(t => {
      if (t.conversationId && typeof t.conversationId === 'object') {
        t.conversationId = formatConversation(t.conversationId, req.user.userId);
      }
      return t;
    });

    const total = await SupportTicket.countDocuments(query);
    res.json({ ok: true, tickets: formattedTickets, total, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'getUserTickets error');
    res.status(500).json({ error: 'Failed to load tickets' });
  }
}

// ── Admin: get all tickets ────────────────────────────────────────────────────
export async function getAllTickets(req, res) {
  try {
    const { status, priority, assignedToMe, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) { query.status = status; }
    if (priority) { query.priority = priority; }
    if (assignedToMe === 'true') { query.assignedAdminId = req.user.userId; }

    const tickets = await SupportTicket.find(query)
      .sort({ priority: 1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 100))
      .populate('userId', 'name email')
      .populate('assignedAdminId', 'name')
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

    const formattedTickets = tickets.map(t => {
      if (t.conversationId && typeof t.conversationId === 'object') {
        t.conversationId = formatConversation(t.conversationId, req.user.userId);
      }
      return t;
    });

    const total = await SupportTicket.countDocuments(query);
    res.json({ ok: true, tickets: formattedTickets, total, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'getAllTickets error');
    res.status(500).json({ error: 'Failed to load tickets' });
  }
}

// ── Update ticket status ───────────────────────────────────────────────────────
export async function updateTicketStatus(req, res) {
  try {
    const { ticketId } = req.params;
    const { status, assignedAdminId, resolutionNote } = req.body;

    const validStatuses = ['open', 'investigating', 'resolved', 'closed', 'duplicate', 'pending_user_response'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = await SupportTicket.findById(ticketId).lean();
    if (!ticket) { return res.status(404).json({ error: 'Ticket not found' }); }

    const update = { status };
    if (assignedAdminId && mongoose.Types.ObjectId.isValid(assignedAdminId)) {
      update.assignedAdminId = assignedAdminId;
      update.assignedAt      = new Date();
      if (!ticket.firstResponseAt) { update.firstResponseAt = new Date(); }
    }
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt    = new Date();
      update.resolvedBy    = req.user.userId;
      update.resolutionNote = xss((resolutionNote || '').trim()).slice(0, 2000);
    }

    await SupportTicket.findByIdAndUpdate(ticketId, { $set: update });

    // Notify ticket owner
    await createNotification({
      userId:         ticket.userId,
      type:           'support_status_change',
      title:          'Support ticket updated',
      body:           `Your ticket "${ticket.title}" is now ${status}`,
      conversationId: ticket.conversationId,
    });
    emitToUser(ticket.userId.toString(), 'support:status_update', {
      ticketId, status, conversationId: ticket.conversationId,
    });

    res.json({ ok: true, status });
  } catch (err) {
    logger.error({ err }, 'updateTicketStatus error');
    res.status(500).json({ error: 'Failed to update ticket' });
  }
}
