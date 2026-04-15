import mongoose from 'mongoose';

const caseNoteSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    hearingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hearing',
        required: false
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        trim: true,
        maxlength: 150
    },
    content: {
        type: String,
        required: true,
        maxlength: 10000
    },
    noteType: {
        type: String,
        enum: ['general', 'hearing', 'evidence', 'strategy', 'internal'],
        default: 'general'
    },
    evidenceTags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    isPrivate: {
        type: Boolean,
        default: true
    },
    parentNoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNote',
        default: null
    },
    attachments: [{
        // ── Existing fields (kept for backward compatibility) ──
        fileUrl: String,
        fileName: String,
        fileSize: Number,
        mimeType: String,
        // ── New fields added for WhatsApp-like media support ──
        attachmentId: {
            type: String,
            default: () => new mongoose.Types.ObjectId().toString()
        },
        type: {
            type: String,
            enum: ['image', 'video', 'document', 'audio'],
            default: 'document'
        },
        cloudinaryPublicId: { type: String },
        uploadedAt: { type: Date, default: Date.now }
    }],
    editedAt: {
        type: Date
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

// Custom Indexes
caseNoteSchema.index({ caseId: 1, createdAt: 1 });
caseNoteSchema.index({ hearingId: 1 });
caseNoteSchema.index({ parentNoteId: 1 });
caseNoteSchema.index({ noteType: 1 });

export default mongoose.model('CaseNote', caseNoteSchema);
