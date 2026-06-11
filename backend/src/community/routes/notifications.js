import express from 'express';
import CommunityNotification from '../models/CommunityNotification.js';
import { getUnreadCount } from '../services/communityNotificationService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// ── Get paginated notifications ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 30, unread } = req.query;
    const userId = req.user.userId;

    const query = { userId };
    if (unread === 'true') { query.isRead = false; }

    const notifications = await CommunityNotification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Math.min(Number(limit), 50))
      .limit(Math.min(Number(limit), 50))
      .lean();

    const unreadCount = await getUnreadCount(userId);

    res.json({ ok: true, notifications, unreadCount, page: Number(page) });
  } catch (err) {
    logger.error({ err }, 'getNotifications error');
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// ── Get unread count only ─────────────────────────────────────────────────────
router.get('/count', async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.userId);
    res.json({ ok: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notification count' });
  }
});

// ── Mark a single notification as read ───────────────────────────────────────
router.patch('/:notifId/read', async (req, res) => {
  try {
    await CommunityNotification.updateOne(
      { _id: req.params.notifId, userId: req.user.userId },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// ── Mark all notifications as read ───────────────────────────────────────────
router.patch('/read-all', async (req, res) => {
  try {
    await CommunityNotification.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all notifications read' });
  }
});

export default router;
