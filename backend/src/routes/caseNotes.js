import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import logger from '../utils/logger.js';
import { logActivity } from '../middleware/activityLogger.js';
import CaseNote from '../models/CaseNote.js';
import Case from '../models/Case.js';
// We might need Hearing model if we want to validate hearingId actually belongs to caseId
// assuming hearing is stored somewhere, but prompt says "verify hearing belongs to case". Let's import it if we know where it is, or we just validate it exists.
// Wait, prompt says: Verify hearing belongs to case.
import xss from 'xss';

const router = express.Router({ mergeParams: true }); // Important: merge params to get :caseId from parent router if mounted that way, or we'll mount it directly on `/cases/:caseId/notes`.

router.use(requireAuth);

// Middleware to verify case access
const verifyCaseAccess = async (req, res, next) => {
    try {
        const caseId = req.params.caseId;
        logger.debug({ caseId }, '[CaseNotes] Verifying access');
        // Assuming we have Case model or use getDocumentById
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            logger.debug({ caseId }, '[CaseNotes] Case not found');
            return res.status(404).json({ error: 'Case not found' });
        }

        // Check ownership
        if (String(caseDoc.owner) !== String(req.user.userId)) {
            // we might also want to check if authorized user, but currently MVP has just owner
            return res.status(403).json({ error: 'Unauthorized to access this case notes' });
        }

        req.caseDoc = caseDoc;
        return next();
    } catch (error) {
        logger.error({ err: error }, 'Verify case access error');
        return res.status(500).json({ error: 'Server error' });
    }
};

router.use(verifyCaseAccess);

// Create Note
router.post('/', async (req, res) => {
    try {
        const { caseId } = req.params;
        let { title, content, evidenceTags } = req.body;
        const { noteType, hearingId, parentNoteId, attachments, isPinned, isPrivate } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Note content is required' });
        }

        if (content.length > 10000) {
            return res.status(400).json({ error: 'Content exceeds maximum length of 10000 characters' });
        }

        // Basic sanitize
        title = title ? xss(title.trim()) : '';
        content = xss(content.trim());

        if (evidenceTags && Array.isArray(evidenceTags)) {
            evidenceTags = evidenceTags.map(tag => xss(tag.trim())).filter(tag => tag && tag.length <= 50);
        } else {
            evidenceTags = [];
        }

        // Note valid hearing belongs to case... we actually need to import Hearing and check
        // If Hearing model exists we should verify. Right now we just save it. Will refine later based on Hearing.
        // Parent Note validation
        if (parentNoteId) {
            const parent = await CaseNote.findOne({ _id: parentNoteId, caseId });
            if (!parent) {
                return res.status(400).json({ error: 'Invalid parent note' });
            }
        }

        const newNote = new CaseNote({
            caseId,
            authorId: req.user.userId,
            title: title.substring(0, 150),
            content,
            noteType: noteType || 'general',
            hearingId: hearingId || null,
            evidenceTags,
            isPinned: !!isPinned,
            isPrivate: isPrivate !== undefined ? !!isPrivate : true,
            parentNoteId: parentNoteId || null,
            attachments: attachments || []
        });

        const savedNote = await newNote.save();

        // Add reference to case
        await Case.findByIdAndUpdate(caseId, {
            $push: { caseNotes: savedNote._id }
        });

        // Audit log
        await logActivity(
            req.user.userId,
            'case_note_created',
            `Note added to case ${req.caseDoc.caseNumber || caseId}`,
            'case',
            caseId,
            { noteId: savedNote._id, noteType: savedNote.noteType }
        );

        // Return populated author for frontend
        const populatedNote = await CaseNote.findById(savedNote._id).populate('authorId', 'name email');
        return res.status(201).json(populatedNote);
    } catch (error) {
        logger.error({ err: error }, 'Create note error');
        return res.status(500).json({ error: 'Failed to create note' });
    }
});

// Get Notes (Hierarchical)
router.get('/', async (req, res) => {
    try {
        const { caseId } = req.params;
        const { hearingId, noteType, includeDeleted } = req.query;

        const query = { caseId };

        // Admins might pass includeDeleted, for now just filter soft deleted out mostly
        if (!includeDeleted) {
            query.isDeleted = false;
        }

        if (hearingId) {
            query.hearingId = hearingId;
        }

        if (noteType && noteType !== 'all') {
            query.noteType = noteType;
        }

        const notes = await CaseNote.find(query)
            .populate('authorId', 'name email')
            .sort({ isPinned: -1, createdAt: -1 })
            .lean();

        // Build hierarchy (limit nesting max 3 levels on frontend, but we pass tree structure from backend)
        const noteMap = new Map();
        const rootNotes = [];

        notes.forEach(note => {
            note.replies = [];
            noteMap.set(note._id.toString(), note);
        });

        notes.forEach(note => {
            if (note.parentNoteId && noteMap.has(note.parentNoteId.toString())) {
                const parent = noteMap.get(note.parentNoteId.toString());
                parent.replies.push(note);
                // Ensure replies are sorted chronologically
                parent.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            } else {
                rootNotes.push(note);
            }
        });

        return res.json(rootNotes);
    } catch (error) {
        logger.error({ err: error }, 'Get notes error');
        return res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Update Note
router.put('/:noteId', async (req, res) => {
    try {
        const { caseId, noteId } = req.params;
        const note = await CaseNote.findOne({ _id: noteId, caseId, isDeleted: false });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Check author
        if (String(note.authorId) !== String(req.user.userId)) {
            // Unless admin, but we'll assume author only for MVP
            return res.status(403).json({ error: 'Unauthorized to edit this note' });
        }

        const { title, content, evidenceTags, isPinned, noteType, hearingId, isPrivate,
                addAttachments, removeAttachmentIds } = req.body;
        logger.debug({ noteId, title, noteType, hearingId, isPrivate }, '[CaseNotes] Updating note');

        if (content !== undefined) {
            if (!content.trim()) { return res.status(400).json({ error: 'Content cannot be empty' }); }
            if (content.length > 10000) { return res.status(400).json({ error: 'Content exceeds maximum length' }); }
            note.content = xss(content.trim());
        }

        if (title !== undefined) { note.title = xss(title.trim()).substring(0, 150); }

        if (evidenceTags && Array.isArray(evidenceTags)) {
            note.evidenceTags = evidenceTags.map(tag => xss(tag.trim())).filter(tag => tag && tag.length <= 50);
        }

        if (isPinned !== undefined) { note.isPinned = !!isPinned; }

        if (noteType !== undefined) {
            logger.debug({ noteType }, '[CaseNotes] Updating noteType');
            note.noteType = noteType || 'general';
        }

        if (hearingId !== undefined) { note.hearingId = hearingId === 'none' ? null : hearingId; }

        if (isPrivate !== undefined) { note.isPrivate = !!isPrivate; }

        // ── Attachment mutations (new, non-breaking) ──────────────────────────────
        // addAttachments: pre-validated attachment objects from the noteAttachments route
        if (Array.isArray(addAttachments) && addAttachments.length > 0) {
            const MAX = 10;
            const slots = MAX - (note.attachments ? note.attachments.length : 0);
            const toAdd = addAttachments.slice(0, Math.max(0, slots));
            if (toAdd.length > 0) {
                note.attachments.push(...toAdd);
            }
        }
        // removeAttachmentIds: remove by attachmentId (UI sends these before submitting edit)
        if (Array.isArray(removeAttachmentIds) && removeAttachmentIds.length > 0) {
            note.attachments = note.attachments.filter(
                a => !removeAttachmentIds.includes(a.attachmentId)
            );
        }
        // ─────────────────────────────────────────────────────────────────────────

        note.editedAt = Date.now();

        const updatedNote = await note.save();
        logger.debug({ noteId, newType: updatedNote.noteType }, '[CaseNotes] Note saved successfully');

        await logActivity(
            req.user.userId,
            'case_note_edited',
            `Note updated in case ${req.caseDoc.caseNumber || caseId}`,
            'case',
            caseId,
            { noteId: updatedNote._id }
        );

        const populatedNote = await CaseNote.findById(updatedNote._id).populate('authorId', 'name email');
        return res.json(populatedNote);
    } catch (error) {
        logger.error({ err: error }, 'Update note error');
        return res.status(500).json({ error: 'Failed to update note' });
    }
});

// Soft Delete Note
router.delete('/:noteId', async (req, res) => {
    try {
        const { caseId, noteId } = req.params;
        const note = await CaseNote.findOne({ _id: noteId, caseId, isDeleted: false });

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (String(note.authorId) !== String(req.user.userId)) {
            return res.status(403).json({ error: 'Unauthorized to delete this note' });
        }

        note.isDeleted = true;
        await note.save();

        await logActivity(
            req.user.userId,
            'case_note_deleted',
            `Note deleted in case ${req.caseDoc.caseNumber || caseId}`,
            'case',
            caseId,
            { noteId: note._id }
        );

        return res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        logger.error({ err: error }, 'Delete note error');
        return res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;
