import mongoose from 'mongoose';

const activityEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    eventType: {
        type: String,
        required: true,
        enum: [
            'login_success',
            'login_failure',
            'case_created',
            'document_uploaded',
            'hearing_created',
            'password_reset_request',
            'password_reset_success',
            'session_revoked',
            'plan_changed',
            'ai_query_used',
            'geo_change_detected',
            'jwt_region_mismatch'
        ],
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    ipHash: { type: String, required: true },
    geoRegion: { type: String },
    userAgentHash: { type: String },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days TTL
        index: true
    }
}, { timestamps: true });

activityEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
activityEventSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('ActivityEvent', activityEventSchema);
