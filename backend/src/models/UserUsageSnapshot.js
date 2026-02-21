import mongoose from 'mongoose';

const userUsageSnapshotSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    snapshotDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    metrics: {
        caseCount: { type: Number, default: 0 },
        documentCount: { type: Number, default: 0 },
        storageUsedMB: { type: Number, default: 0 },
        teamMemberCount: { type: Number, default: 0 },
        aiQueriesUsedToday: { type: Number, default: 0 }
    }
}, { timestamps: true });

userUsageSnapshotSchema.index({ userId: 1, snapshotDate: -1 });

export default mongoose.model('UserUsageSnapshot', userUsageSnapshotSchema);
