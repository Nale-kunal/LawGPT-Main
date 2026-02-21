import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_suspend',
            'user_unsuspend',
            'plan_upgrade',
            'plan_downgrade',
            'password_reset',
            '2fa_reset',
            'sessions_revoke',
            'user_impersonation',
            'user_delete_soft',
            'user_delete_hard',
            'settings_update'
        ],
        index: true
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year TTL
        index: true
    }
}, { timestamps: true });

adminAuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AdminAuditLog', adminAuditLogSchema);
