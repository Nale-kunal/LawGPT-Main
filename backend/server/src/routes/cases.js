import express from 'express';
import Case from '../models/Case.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await Case.find({ owner: req.user.userId }).sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user.userId };
    const item = await Case.create(data);
    
    // Log activity
    await logActivity(
      req.user.userId,
      'case_created',
      `New case ${item.caseNumber} created for ${item.clientName}`,
      'case',
      item._id,
      {
        caseNumber: item.caseNumber,
        clientName: item.clientName,
        priority: item.priority,
        status: item.status
      }
    );
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

router.get('/:id', async (req, res) => {
  const item = await Case.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Case.findOneAndUpdate({ _id: req.params.id, owner: req.user.userId }, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    // Log activity
    await logActivity(
      req.user.userId,
      'case_updated',
      `Case ${item.caseNumber} updated`,
      'case',
      item._id,
      {
        caseNumber: item.caseNumber,
        clientName: item.clientName,
        priority: item.priority,
        status: item.status
      }
    );
    
    res.json(item);
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

router.delete('/:id', async (req, res) => {
  const result = await Case.deleteOne({ _id: req.params.id, owner: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;



