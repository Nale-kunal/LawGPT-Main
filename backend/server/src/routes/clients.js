import express from 'express';
import Client from '../models/Client.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const clients = await Client.find({ owner: req.user.userId }).sort({ createdAt: -1 });
  res.json(clients);
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user.userId };
    const client = await Client.create(data);
    
    // Log activity
    await logActivity(
      req.user.userId,
      'client_registered',
      `New client ${client.name} registered`,
      'client',
      client._id,
      {
        clientName: client.name,
        email: client.email,
        phone: client.phone
      }
    );
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate({ _id: req.params.id, owner: req.user.userId }, req.body, { new: true });
    if (!client) return res.status(404).json({ error: 'Not found' });
    
    // Log activity
    await logActivity(
      req.user.userId,
      'client_updated',
      `Client ${client.name} information updated`,
      'client',
      client._id,
      {
        clientName: client.name,
        email: client.email
      }
    );
    
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

router.delete('/:id', async (req, res) => {
  const result = await Client.deleteOne({ _id: req.params.id, owner: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;



