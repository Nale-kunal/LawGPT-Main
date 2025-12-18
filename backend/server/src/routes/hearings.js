import express from 'express';
import Hearing from '../models/Hearing.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

const router = express.Router();

router.use(requireAuth);

// Get all hearings for a specific case
router.get('/case/:caseId', async (req, res) => {
  try {
    const hearings = await Hearing.find({ 
      caseId: req.params.caseId, 
      owner: req.user.userId 
    }).sort({ hearingDate: -1 });
    res.json(hearings);
  } catch (error) {
    console.error('Get hearings error:', error);
    res.status(500).json({ error: 'Failed to fetch hearings' });
  }
});

// Get all hearings for the user
router.get('/', async (req, res) => {
  try {
    const hearings = await Hearing.find({ owner: req.user.userId })
      .populate('caseId', 'caseNumber clientName')
      .sort({ hearingDate: -1 });
    res.json(hearings);
  } catch (error) {
    console.error('Get all hearings error:', error);
    res.status(500).json({ error: 'Failed to fetch hearings' });
  }
});

// Get a specific hearing
router.get('/:id', async (req, res) => {
  try {
    const hearing = await Hearing.findOne({ 
      _id: req.params.id, 
      owner: req.user.userId 
    }).populate('caseId', 'caseNumber clientName');
    
    if (!hearing) return res.status(404).json({ error: 'Hearing not found' });
    res.json(hearing);
  } catch (error) {
    console.error('Get hearing error:', error);
    res.status(500).json({ error: 'Failed to fetch hearing' });
  }
});

// Create a new hearing
router.post('/', async (req, res) => {
  try {
    console.log('Creating hearing with data:', req.body);
    const data = { ...req.body, owner: req.user.userId };
    console.log('Hearing data with owner:', data);
    
    const hearing = await Hearing.create(data);
    console.log('Hearing created successfully:', hearing._id);
    
    // Log activity
    await logActivity(
      req.user.userId,
      'hearing_created',
      `New hearing scheduled for case ${hearing.caseId} on ${hearing.hearingDate.toLocaleDateString()}`,
      'hearing',
      hearing._id,
      {
        caseId: hearing.caseId,
        hearingDate: hearing.hearingDate,
        hearingType: hearing.hearingType,
        status: hearing.status
      }
    );
    
    res.status(201).json(hearing);
  } catch (error) {
    console.error('Create hearing error:', error);
    res.status(500).json({ error: 'Failed to create hearing', details: error.message });
  }
});

// Update a hearing
router.put('/:id', async (req, res) => {
  try {
    console.log('Updating hearing:', req.params.id, 'with data:', req.body);
    
    const hearing = await Hearing.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId }, 
      req.body, 
      { new: true }
    ).populate('caseId', 'caseNumber clientName');
    
    if (!hearing) {
      console.log('Hearing not found:', req.params.id);
      return res.status(404).json({ error: 'Hearing not found' });
    }
    
    console.log('Hearing updated successfully:', hearing._id);
    
    // Log activity
    await logActivity(
      req.user.userId,
      'hearing_updated',
      `Hearing updated for case ${hearing.caseId?.caseNumber || hearing.caseId} on ${hearing.hearingDate.toLocaleDateString()}`,
      'hearing',
      hearing._id,
      {
        caseId: hearing.caseId,
        hearingDate: hearing.hearingDate,
        hearingType: hearing.hearingType,
        status: hearing.status
      }
    );
    
    res.json(hearing);
  } catch (error) {
    console.error('Update hearing error:', error);
    res.status(500).json({ error: 'Failed to update hearing', details: error.message });
  }
});

// Delete a hearing
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting hearing:', req.params.id);
    
    const hearing = await Hearing.findOne({ 
      _id: req.params.id, 
      owner: req.user.userId 
    });
    
    if (!hearing) {
      console.log('Hearing not found for deletion:', req.params.id);
      return res.status(404).json({ error: 'Hearing not found' });
    }
    
    const result = await Hearing.deleteOne({ 
      _id: req.params.id, 
      owner: req.user.userId 
    });
    
    if (result.deletedCount === 0) {
      console.log('No hearing deleted:', req.params.id);
      return res.status(404).json({ error: 'Hearing not found' });
    }
    
    console.log('Hearing deleted successfully:', req.params.id);
    
    // Log activity
    await logActivity(
      req.user.userId,
      'hearing_deleted',
      `Hearing deleted for case ${hearing.caseId} on ${hearing.hearingDate.toLocaleDateString()}`,
      'hearing',
      hearing._id,
      {
        caseId: hearing.caseId,
        hearingDate: hearing.hearingDate,
        hearingType: hearing.hearingType
      }
    );
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete hearing error:', error);
    res.status(500).json({ error: 'Failed to delete hearing', details: error.message });
  }
});

// Get today's hearings
router.get('/today/list', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const hearings = await Hearing.find({
      owner: req.user.userId,
      hearingDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('caseId', 'caseNumber clientName').sort({ hearingTime: 1 });
    
    res.json(hearings);
  } catch (error) {
    console.error('Get today hearings error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s hearings' });
  }
});

export default router;

