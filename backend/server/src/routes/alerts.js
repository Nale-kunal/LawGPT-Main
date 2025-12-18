import express from 'express';
import Alert from '../models/Alert.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await Alert.find({ owner: req.user.userId }).sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', async (req, res) => {
  const data = { ...req.body, owner: req.user.userId };
  const item = await Alert.create(data);
  res.status(201).json(item);
});

router.patch('/:id/read', async (req, res) => {
  const item = await Alert.findOneAndUpdate({ _id: req.params.id, owner: req.user.userId }, { isRead: true }, { new: true });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.patch('/mark-all-read', async (req, res) => {
  await Alert.updateMany({ owner: req.user.userId, isRead: false }, { isRead: true });
  const items = await Alert.find({ owner: req.user.userId }).sort({ createdAt: -1 });
  res.json(items);
});

router.delete('/:id', async (req, res) => {
  const result = await Alert.deleteOne({ _id: req.params.id, owner: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;



