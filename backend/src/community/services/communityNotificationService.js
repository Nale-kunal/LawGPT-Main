/**
 * communityNotificationService.js
 *
 * Handles in-app and push notification dispatch for community events.
 * Reuses existing BullMQ email worker for email digests.
 */

import CommunityNotification from '../models/CommunityNotification.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import logger from '../../utils/logger.js';

// ── Create in-app notification ─────────────────────────────────────────────────
export async function createNotification({ userId, type, title, body, conversationId, messageId, senderId, payload }) {
  try {
    const notif = await CommunityNotification.create({
      userId, type, title, body: body || '',
      conversationId: conversationId || null,
      messageId:      messageId || null,
      senderId:       senderId || null,
      payload:        payload || {},
    });
    return notif;
  } catch (err) {
    logger.error({ err, userId, type }, 'communityNotificationService: failed to create notification');
    return null;
  }
}

// ── Notify all participants of a new message ───────────────────────────────────
export async function notifyNewMessage({ conversationId, senderId, senderName, messageType, preview }) {
  try {
    // Get all participants except sender
    const participants = await ConversationParticipant.find({
      conversationId,
      userId: { $ne: senderId },
      isRemoved: false,
    }).select('userId isMuted').lean();

    const notifications = participants
      .filter(p => !p.isMuted)
      .map(p => ({
        userId:         p.userId,
        type:           'new_message',
        title:          `New message from ${senderName}`,
        body:           preview || '',
        conversationId,
        messageId:      null,
        senderId,
      }));

    if (notifications.length > 0) {
      await CommunityNotification.insertMany(notifications, { ordered: false });

      // Increment unread counts
      await ConversationParticipant.updateMany(
        {
          conversationId,
          userId: { $in: participants.filter(p => !p.isMuted).map(p => p.userId) },
        },
        { $inc: { unreadCount: 1 } }
      );
    }
  } catch (err) {
    logger.error({ err, conversationId }, 'notifyNewMessage: failed');
  }
}

// ── Mark notifications as read ────────────────────────────────────────────────
export async function markNotificationsRead(userId, conversationId) {
  try {
    await CommunityNotification.updateMany(
      { userId, conversationId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    await ConversationParticipant.updateOne(
      { userId, conversationId },
      { $set: { unreadCount: 0, lastReadAt: new Date() } }
    );
  } catch (err) {
    logger.error({ err, userId, conversationId }, 'markNotificationsRead: failed');
  }
}

// ── Get unread notification count for user ────────────────────────────────────
export async function getUnreadCount(userId) {
  try {
    return await CommunityNotification.countDocuments({ userId, isRead: false });
  } catch {
    return 0;
  }
}
