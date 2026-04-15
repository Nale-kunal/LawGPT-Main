/**
 * noteAttachments.js
 *
 * Isolated route for uploading / deleting file attachments on case notes.
 * Mounted at: /api/v1/cases/:caseId/notes/:noteId/attachments
 *
 * Does NOT modify any existing CaseNote CRUD logic.
 * Depends on the existing Cloudinary config and requireAuth middleware.
 */
import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth-jwt.js';
import logger from '../utils/logger.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import CaseNote from '../models/CaseNote.js';
import Case from '../models/Case.js';

const router = express.Router({ mergeParams: true }); // inherit :caseId, :noteId

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = parseInt(process.env.NOTE_ATTACHMENT_MAX_SIZE_MB || '10', 10);
const MAX_FILES_PER_UPLOAD = 5;
const MAX_ATTACHMENTS_PER_NOTE = 10;

const ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',
    // Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
]);

// Blocked executable / dangerous types (extra safety net)
const BLOCKED_MIME_TYPES = new Set([
    'application/x-msdownload',
    'application/x-executable',
    'application/x-sh',
    'application/x-bat',
    'application/x-msdos-program',
    'text/x-script.sh',
    'application/java-archive',
]);

/**
 * Derive the canonical `type` from a MIME string.
 */
function resolveType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

/**
 * Sanitise a filename: strip path separators and non-printable characters,
 * limit length.
 */
function sanitiseName(name = '') {
    return name
        .replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_') // path / control chars
        .replace(/\.{2,}/g, '.')                   // no double-dots
        .substring(0, 200)
        .trim() || 'file';
}

// ─── Multer Setup ─────────────────────────────────────────────────────────────

const fileFilter = (_req, file, cb) => {
    if (BLOCKED_MIME_TYPES.has(file.mimetype)) {
        return cb(Object.assign(new Error(`File type '${file.mimetype}' is blocked for security reasons.`), { status: 400 }), false);
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(Object.assign(new Error(
            `File type '${file.mimetype}' is not supported. ` +
            'Allowed: images (jpg/png/webp), videos (mp4/mov), documents (pdf/docx/txt), audio (mp3).'
        ), { status: 400 }), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
        files: MAX_FILES_PER_UPLOAD,
    },
});

// ─── Middleware: Auth + Case Ownership ───────────────────────────────────────

router.use(requireAuth);

const verifyCaseAccess = async (req, res, next) => {
    try {
        const caseDoc = await Case.findById(req.params.caseId).lean();
        if (!caseDoc) return res.status(404).json({ error: 'Case not found' });
        if (String(caseDoc.owner) !== String(req.user.userId)) {
            return res.status(403).json({ error: 'Unauthorized to access this case' });
        }
        req.caseDoc = caseDoc;
        return next();
    } catch (err) {
        logger.error({ err }, '[NoteAttachments] Case access check failed');
        return res.status(500).json({ error: 'Server error' });
    }
};

const verifyNoteAccess = async (req, res, next) => {
    try {
        const note = await CaseNote.findOne({
            _id: req.params.noteId,
            caseId: req.params.caseId,
            isDeleted: false,
        });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (String(note.authorId) !== String(req.user.userId)) {
            return res.status(403).json({ error: 'Unauthorized to modify this note' });
        }
        req.note = note;
        return next();
    } catch (err) {
        logger.error({ err }, '[NoteAttachments] Note access check failed');
        return res.status(500).json({ error: 'Server error' });
    }
};

router.use(verifyCaseAccess);

// ─── Multer error handler ────────────────────────────────────────────────────

function handleMulterError(err, _req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB per file.`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: `Too many files. You can upload at most ${MAX_FILES_PER_UPLOAD} files at once.`
            });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err && err.status === 400) {
        return res.status(400).json({ error: err.message });
    }
    return next(err);
}

// ─── POST /api/v1/cases/:caseId/notes/:noteId/attachments ───────────────────
// Upload one or more files and attach them to the note.

router.post('/', verifyNoteAccess, (req, res, next) => {
    upload.array('files', MAX_FILES_PER_UPLOAD)(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
    });
}, async (req, res) => {
    const { note } = req;
    const { caseId } = req.params;
    const userId = req.user.userId;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided.' });
    }

    // Guard: enforce per-note attachment limit
    const existingCount = note.attachments ? note.attachments.length : 0;
    if (existingCount + req.files.length > MAX_ATTACHMENTS_PER_NOTE) {
        return res.status(400).json({
            error: `A note can have at most ${MAX_ATTACHMENTS_PER_NOTE} attachments. ` +
                   `This note already has ${existingCount}.`
        });
    }

    const saved = [];
    const errors = [];

    for (const file of req.files) {
        const safeName = sanitiseName(file.originalname);
        const folder = `lawyer-zen/notes/user-${userId}/case-${caseId}`;
        const type = resolveType(file.mimetype);

        // Determine Cloudinary resource_type
        const resourceType = type === 'image' ? 'image'
            : type === 'video' ? 'video'
            : 'raw';

        try {
            const result = await uploadToCloudinary(file.buffer, safeName, folder, {
                resource_type: resourceType,
                use_filename: true,
                unique_filename: true,
                overwrite: false,
            });

            const attachment = {
                fileUrl: result.secure_url,
                fileName: safeName,
                fileSize: file.size,
                mimeType: file.mimetype,
                // New fields
                attachmentId: new mongoose.Types.ObjectId().toString(),
                type,
                cloudinaryPublicId: result.public_id,
                uploadedAt: new Date(),
            };

            note.attachments.push(attachment);
            saved.push(attachment);

            logger.info({
                userId,
                caseId,
                noteId: note._id,
                fileName: safeName,
                type,
            }, '[NoteAttachments] Attachment uploaded successfully');
        } catch (uploadErr) {
            logger.error({ err: uploadErr, fileName: safeName }, '[NoteAttachments] Cloudinary upload failed');
            errors.push({ fileName: safeName, error: uploadErr.message || 'Upload failed' });
        }
    }

    if (saved.length === 0) {
        return res.status(500).json({
            error: 'All file uploads failed.',
            errors,
        });
    }

    await note.save();

    return res.status(200).json({
        success: true,
        attachments: saved,
        ...(errors.length > 0 && {
            warnings: `${errors.length} file(s) failed to upload.`,
            errors,
        }),
    });
});

// ─── DELETE /api/v1/cases/:caseId/notes/:noteId/attachments/:attachmentId ───
// Remove a single attachment from a note and delete it from Cloudinary.

router.delete('/:attachmentId', verifyNoteAccess, async (req, res) => {
    const { note } = req;
    const { attachmentId } = req.params;

    const idx = note.attachments.findIndex(a => a.attachmentId === attachmentId);

    if (idx === -1) {
        return res.status(404).json({ error: 'Attachment not found on this note.' });
    }

    const attachment = note.attachments[idx];

    // Delete from Cloudinary (best-effort; don't block if it fails)
    if (attachment.cloudinaryPublicId) {
        try {
            const resourceType = attachment.type === 'image' ? 'image'
                : attachment.type === 'video' ? 'video'
                : 'raw';
            await deleteFromCloudinary(attachment.cloudinaryPublicId, resourceType);
            logger.info({ publicId: attachment.cloudinaryPublicId }, '[NoteAttachments] Deleted from Cloudinary');
        } catch (delErr) {
            logger.error({ err: delErr, publicId: attachment.cloudinaryPublicId },
                '[NoteAttachments] Failed to delete from Cloudinary — DB record will still be removed');
        }
    }

    // Remove from note sub-document
    note.attachments.splice(idx, 1);
    await note.save();

    logger.info({
        noteId: note._id,
        attachmentId,
    }, '[NoteAttachments] Attachment removed from note');

    return res.status(200).json({ success: true, message: 'Attachment removed.' });
});

export default router;
