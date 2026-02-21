import mongoose from 'mongoose';

const abuseSignalLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    signalType: {
        type: String,
        required: true,
        enum: [
            'failed_login',
            'geo_jump',
            'region_mismatch',
            'upload_burst',
            'ai_query_burst'
        ],
        index: true
    },
    scoreImpact: {
        type: Number,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL for signals
        index: true
    }
}, { timestamps: true });

abuseSignalLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AbuseSignalLog', abuseSignalLogSchema);
