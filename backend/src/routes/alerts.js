import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import logger from '../utils/logger.js';
import {
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  queryDocuments,
  MODELS,
  COLLECTIONS
} from '../services/mongodb.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const items = await queryDocuments(
      MODELS.ALERTS,
      [{ field: 'owner', operator: '==', value: req.user.userId }],
      { field: 'createdAt', direction: 'desc' }
    );
    return res.json(items);
  } catch (error) {
    logger.error({ err: error }, 'Get alerts error');
    return res.status(500).json({
      error: 'Failed to fetch alerts',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        code: error.code
      })
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = {
      ...req.body,
      owner: req.user.userId,
      isRead: false
    };
    const item = await createDocument(COLLECTIONS.ALERTS, data);
    return res.status(201).json(item);
  } catch (error) {
    logger.error({ err: error }, 'Create alert error');
    return res.status(500).json({ error: 'Failed to create alert' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const item = await getDocumentById(COLLECTIONS.ALERTS, req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Check if user owns this alert
    if (item.owner?.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await updateDocument(COLLECTIONS.ALERTS, req.params.id, { isRead: true });
    return res.json(updated);
  } catch (error) {
    logger.error({ err: error }, 'Update alert error');
    return res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.patch('/mark-all-read', async (req, res) => {
  try {
    // Get all unread alerts for the user
    const unreadAlerts = await queryDocuments(
      MODELS.ALERTS,
      [
        { field: 'owner', operator: '==', value: req.user.userId },
        { field: 'isRead', operator: '==', value: false }
      ]
    );

    // Update each alert
    const updatePromises = unreadAlerts.map(alert =>
      updateDocument(COLLECTIONS.ALERTS, alert.id, { isRead: true })
    );

    await Promise.all(updatePromises);

    // Get all alerts after update
    const items = await queryDocuments(
      MODELS.ALERTS,
      [{ field: 'owner', operator: '==', value: req.user.userId }],
      { field: 'createdAt', direction: 'desc' }
    );

    return res.json(items);
  } catch (error) {
    logger.error({ err: error }, 'Mark all read error');
    return res.status(500).json({ error: 'Failed to mark alerts as read' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await getDocumentById(COLLECTIONS.ALERTS, req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Check if user owns this alert
    if (item.owner?.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await deleteDocument(COLLECTIONS.ALERTS, req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete alert error');
    return res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;



