import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';
import Folder from '../models/Folder.js';
import Document from '../models/Document.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_\.]/g, '_');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// Folders CRUD - All routes require authentication
router.get('/folders', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.userId;
    if (!ownerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const folders = await Folder.find({ ownerId }).sort({ createdAt: -1 });
    res.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

router.post('/folders', requireAuth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const ownerId = req.user.userId;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Folder name and user authentication required' });
    }
    
    const folder = await Folder.create({ 
      name: name.trim(), 
      parentId: parentId || undefined, 
      ownerId 
    });
    res.status(201).json({ folder });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

router.put('/folders/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.user.userId;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Folder name and user authentication required' });
    }
    
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, ownerId }, 
      { name: name.trim() }, 
      { new: true }
    );
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    res.json({ folder });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

router.delete('/folders/:id', requireAuth, async (req, res) => {
  try {
    const folderId = req.params.id;
    const ownerId = req.user.userId;
    
    if (!ownerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const folder = await Folder.findOne({ _id: folderId, ownerId });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    // Delete documents in the folder (only user's documents)
    const docs = await Document.find({ folderId, ownerId });
    for (const doc of docs) {
      try { 
        fs.unlinkSync(path.join(uploadsDir, path.basename(doc.url))); 
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
      await doc.deleteOne();
    }
    
    await folder.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Documents CRUD - All routes require authentication
router.get('/files', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.query;
    const ownerId = req.user.userId;
    
    if (!ownerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const criteria = { ownerId };
    if (folderId) {
      criteria.folderId = folderId;
    }
    
    const files = await Document.find(criteria).sort({ createdAt: -1 });
    res.json({ files });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

router.post('/upload', requireAuth, upload.array('files'), async (req, res) => {
  try {
    const { folderId } = req.body;
    const ownerId = req.user.userId;
    
    if (!ownerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    const saved = [];
    for (const file of req.files) {
      const url = `/uploads/${file.filename}`;
      const doc = await Document.create({
        name: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url,
        folderId: folderId || undefined,
        ownerId,
      });
      saved.push(doc);
    }
    
    res.status(201).json({ files: saved });
  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

router.put('/files/:id', requireAuth, async (req, res) => {
  try {
    const { name, tags, folderId } = req.body;
    const ownerId = req.user.userId;
    
    if (!ownerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ownerId },
      { name: name?.trim(), tags, folderId },
      { new: true }
    );
    
    if (!doc) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    res.json({ file: doc });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

router.delete('/files/:id', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.userId;
    
    if (!ownerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const doc = await Document.findOne({ _id: req.params.id, ownerId });
    if (!doc) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    // Delete physical file
    try { 
      fs.unlinkSync(path.join(uploadsDir, path.basename(doc.url))); 
    } catch (e) {
      console.error('Failed to delete physical file:', e);
    }
    
    await doc.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;


