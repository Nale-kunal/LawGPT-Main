import express from 'express';
import TimeEntry from '../models/TimeEntry.js';
import Case from '../models/Case.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await TimeEntry.find({ owner: req.user.userId }).sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user.userId };
    const item = await TimeEntry.create(data);
    
    // Get case info for activity log
    const case_ = await Case.findById(item.caseId);
    
    // Log activity - assuming duration is in minutes
    const durationInMinutes = item.duration;
    const durationText = durationInMinutes >= 60 
      ? `${Math.floor(durationInMinutes / 60)}h ${durationInMinutes % 60}m` 
      : `${durationInMinutes}m`;
    
    await logActivity(
      req.user.userId,
      'time_logged',
      `${durationText} logged for ${case_?.caseNumber || 'case'}`,
      'time_entry',
      item._id,
      {
        duration: item.duration, // Store original duration in minutes
        durationText: durationText, // Store formatted duration for display
        description: item.description,
        caseNumber: case_?.caseNumber,
        billable: item.billable,
        hourlyRate: item.hourlyRate
      }
    );
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

router.delete('/:id', async (req, res) => {
  const result = await TimeEntry.deleteOne({ _id: req.params.id, owner: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;



