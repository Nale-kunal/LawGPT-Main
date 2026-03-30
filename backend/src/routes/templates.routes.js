import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import TemplateDocument from '../models/TemplateDocument.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(requireAuth);

// Get all saved template documents for the user
router.get('/', async (req, res) => {
  try {
    const documents = await TemplateDocument.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 });
    res.json(documents);
  } catch (error) {
    logger.error({ err: error }, 'Get template documents error');
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Create a new template document draft
router.post('/', async (req, res) => {
  try {
    const { templateId, templateName, filledData, finalHTML, status } = req.body;
    
    const newDoc = new TemplateDocument({
      userId: req.user.userId,
      templateId,
      templateName,
      filledData,
      finalHTML,
      status: status || 'draft'
    });

    await newDoc.save();
    res.status(201).json(newDoc);
  } catch (error) {
    logger.error({ err: error, body: req.body }, 'Create template document error');
    res.status(500).json({ error: 'Failed to save document draft' });
  }
});

// Get a specific template document
router.get('/:id', async (req, res) => {
  try {
    const doc = await TemplateDocument.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json(doc);
  } catch (error) {
    logger.error({ err: error }, 'Get template document by ID error');
    return res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Update an existing template document
router.put('/:id', async (req, res) => {
  try {
    const { filledData, finalHTML, status, templateName } = req.body;
    
    const doc = await TemplateDocument.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { 
        $set: { 
          filledData, 
          finalHTML, 
          status,
          ...(templateName && { templateName })
        } 
      },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json(doc);
  } catch (error) {
    logger.error({ err: error }, 'Update template document error');
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete a template document
router.delete('/:id', async (req, res) => {
  try {
    const doc = await TemplateDocument.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Delete template document error');
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
