import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import { checkPlanAccess } from '../middleware/checkPlanAccess.js';
import logger from '../utils/logger.js';
import { logActivity } from '../middleware/activityLogger.js';
import CaseNote from '../models/CaseNote.js';
import Case from '../models/Case.js';
import xss from 'xss';
import { validate } from '../middleware/validate.js';
import {
    caseNoteParamSchema,
    caseParamSchema,
    objectIdSchema,
    caseNotesQuerySchema,
} from '../schemas/paramSchemas.js';
import { z } from 'zod';

const router = express.Router({ mergeParams: true }); // Important: merge params to get :caseId from parent router if mounted that way, or we'll mount it directly on `/cases/:caseId/notes`.

router.use(requireAuth);
router.use(checkPlanAccess('notes'));

// Middleware to verify case access (validates caseId is a valid ObjectId first)
const verifyCaseAccess = async (req, res, next) => {
    try {
        const caseId = req.params.caseId;
        logger.debug({ caseId }, '[CaseNotes] Verifying access');
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            logger.debug({ caseId }, '[CaseNotes] Case not found');
            return res.status(404).json({ error: 'Case not found' });
        }

        if (String(caseDoc.owner) !== String(req.user.userId)) {
            return res.status(403).json({ error: 'Unauthorized to access this case notes' });
        }

        req.caseDoc = caseDoc;
        return next();
    } catch (error) {
        logger.error({ err: error }, 'Verify case access error');
        return res.status(500).json({ error: 'Server error' });
    }
};

// Apply caseId param validation before case access check
router.use(validate({ params: caseParamSchema }));
router.use(verifyCaseAccess);

// Create Note — validate body fields
const createNoteBodySchema = z.object({
    content: z.string().min(1, 'Content is required').max(10000),
    title: z.string().max(150).optional(),
    noteType: z.enum(['general', 'evidence', 'witness', 'legal', 'procedural']).optional(),
    hearingId: objectIdSchema.optional().nullable(),
    parentNoteId: objectIdSchema.optional().nullable(),
    evidenceTags: z.array(z.string().max(50)).max(20).optional(),
    isPinned: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
});

router.post('/', validate({ body: createNoteBodySchema }), async (req, res) => {
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

// Get Notes (Hierarchical) — validate query
router.get('/', validate({ query: caseNotesQuerySchema }), async (req, res) => {
    try {
        const { caseId } = req.params;
        // Query params already validated + typed by Zod
        const { hearingId, noteType, includeDeleted } = req.query;

        const query = { caseId };

        if (!includeDeleted) {
            query.isDeleted = false;
        }

        if (hearingId) {
            query.hearingId = hearingId; // Already validated as ObjectId by schema
        }

        if (noteType && noteType !== 'all') {
            query.noteType = noteType; // Already validated as enum by schema
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

// Update Note — validate noteId param and body
const updateNoteBodySchema = z.object({
    content: z.string().min(1).max(10000).optional(),
    title: z.string().max(150).optional(),
    noteType: z.enum(['general', 'evidence', 'witness', 'legal', 'procedural']).optional(),
    hearingId: z.union([objectIdSchema, z.literal('none')]).optional().nullable(),
    evidenceTags: z.array(z.string().max(50)).max(20).optional(),
    isPinned: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    addAttachments: z.array(z.any()).max(10).optional(),
    removeAttachmentIds: z.array(objectIdSchema).max(10).optional(),
});

router.put('/:noteId',
    validate({ params: caseNoteParamSchema, body: updateNoteBodySchema }),
    async (req, res) => {
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

// Soft Delete Note — validate noteId param
router.delete('/:noteId', validate({ params: caseNoteParamSchema }), async (req, res) => {
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
