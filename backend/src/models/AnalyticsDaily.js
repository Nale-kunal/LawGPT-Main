import mongoose from 'mongoose';

const analyticsDailySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true,
        index: true
    },
    metrics: {
        dau: { type: Number, default: 0 },
        wau: { type: Number, default: 0 },
        mau: { type: Number, default: 0 },
        newUsers: { type: Number, default: 0 },
        churnedUsers: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        totalCasesCreated: { type: Number, default: 0 },
        totalDocumentsUploaded: { type: Number, default: 0 },
        totalAiQueries: { type: Number, default: 0 },
        abuseRate: { type: Number, default: 0 }
    },
    cohorts: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

export default mongoose.model('AnalyticsDaily', analyticsDailySchema);
