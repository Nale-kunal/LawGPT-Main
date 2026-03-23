import mongoose from 'mongoose';
import {
    User,
    Case,
    Client,
    Document,
    Folder,
    Invoice,
    Hearing,
    Alert,
    TimeEntry,
    Activity,
    AuditLog,
    PasswordReset
} from '../models/index.js';
// Models not in index.js but identified
import AdminAuditLog from '../models/AdminAuditLog.js';
import ActivityEvent from '../models/ActivityEvent.js';
import AbuseSignalLog from '../models/AbuseSignalLog.js';
import UserUsageSnapshot from '../models/UserUsageSnapshot.js';
import CaseNote from '../models/CaseNote.js';

import cloudinary from '../config/cloudinary.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

/**
 * Service to handle permanent deletion of a user and all associated data.
 * This is a hard-delete orchestrated service using database transactions.
 */
export async function deleteUserAccount(userId) {
    if (!userId) {
        throw new Error('UserId is required for account deletion');
    }

    // Detect whether this MongoDB node supports transactions (requires a replica set).
    // A standalone node (common in local/test environments) will have no 'setName' in hello().
    let useTransaction;
    try {
        const adminDb = mongoose.connection.db.admin();
        const hello = await adminDb.command({ hello: 1 });
        useTransaction = !!hello.setName;
    } catch (_err) {
        useTransaction = false;
    }

    const session = await mongoose.startSession();
    if (useTransaction) {
        session.startTransaction();
    }

    try {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const deletionStats = {};

        // We use both String and ObjectId in filters to catch all possible formats
        // (Legacy data might have stored IDs as strings)
        const idQuery = { $in: [userId, userObjectId] };

        logger.info({ userId }, 'Starting hardened permanent account deletion');

        // 1. Get user for logging and Cloudinary cleanup
        const user = await User.findById(userObjectId).session(useTransaction ? session : null);
        const userEmail = user?.email || 'unknown';

        // 2. Delete all user-related records in MongoDB

        // Main collections using 'owner'
        const mainModels = [
            { model: Case, name: 'cases', field: 'owner' },
            { model: Client, name: 'clients', field: 'owner' },
            { model: Invoice, name: 'invoices', field: 'owner' },
            { model: Hearing, name: 'hearings', field: 'owner' },
            { model: Alert, name: 'alerts', field: 'owner' },
            { model: TimeEntry, name: 'timeEntries', field: 'owner' },
            { model: Activity, name: 'activities', field: 'owner' }
        ];

        for (const { model, name, field } of mainModels) {
            const res = await model.deleteMany({ [field]: idQuery }).session(useTransaction ? session : null);
            deletionStats[name] = res.deletedCount;
        }

        // Collections using 'ownerId'
        const ownerIdModels = [
            { model: Document, name: 'documents' },
            { model: Folder, name: 'folders' }
        ];

        for (const { model, name } of ownerIdModels) {
            const res = await model.deleteMany({ ownerId: idQuery }).session(useTransaction ? session : null);
            deletionStats[name] = res.deletedCount;
        }

        // Collections using 'userId'
        const userIdModels = [
            { model: ActivityEvent, name: 'activityEvents' },
            { model: AuditLog, name: 'auditLogs' },
            { model: AbuseSignalLog, name: 'abuseLogs' },
            { model: PasswordReset, name: 'passwordResets' },
            { model: UserUsageSnapshot, name: 'usageSnapshots' }
        ];

        for (const { model, name } of userIdModels) {
            const res = await model.deleteMany({ userId: idQuery }).session(useTransaction ? session : null);
            deletionStats[name] = res.deletedCount;
        }

        // Collections using 'authorId'
        const noteRes = await CaseNote.deleteMany({ authorId: idQuery }).session(useTransaction ? session : null);
        deletionStats.caseNotes = noteRes.deletedCount;

        // Admin Audit Logs (User could be admin OR target)
        // We preserve 'user_delete_hard' actions as tombstones for the login/signup warning popup
        const adminRes = await AdminAuditLog.deleteMany({
            $or: [
                { adminId: idQuery },
                { targetUserId: idQuery }
            ],
            action: { $ne: 'user_delete_hard' }
        }).session(useTransaction ? session : null);
        deletionStats.adminAuditLogs = adminRes.deletedCount;

        // Finally, delete the User record itself
        const deletedUser = await User.findByIdAndDelete(userObjectId).session(useTransaction ? session : null);
        deletionStats.userRecord = deletedUser ? 1 : 0;

        if (!deletedUser && !user) {
            logger.warn({ userId }, 'User record was already missing during deletion attempt');
        }

        // 3. Clear File Storage Assets (Cloudinary)
        // We delete from Cloudinary even if DB transaction is pending
        try {
            // Folder structure: lawyer-zen/user-${userId}/
            const prefix = `lawyer-zen/user-${userId}/`;
            await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'image' });
            await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'raw' });
            await cloudinary.api.delete_folder(prefix).catch(() => { });
            deletionStats.cloudinary = 'purged';
        } catch (cloudinaryError) {
            logger.error({ err: cloudinaryError, userId }, 'Cloudinary cleanup failed during account deletion');
            deletionStats.cloudinary = 'failed';
        }

        // 4. Clear Redis Cache
        try {
            const keysToInvalidate = [
                `user:${userId}`,
                `dashboard:metrics:${userId}`,
                `cases:${userId}`,
                `clients:${userId}`,
                `docs:${userId}`,
                `invoices:${userId}`
            ];
            for (const key of keysToInvalidate) {
                await cache.invalidatePattern(key);
            }
            deletionStats.redis = 'invalidated';
        } catch (cacheError) {
            logger.warn({ err: cacheError, userId }, 'Redis cache invalidation failed during account deletion');
            deletionStats.redis = 'failed';
        }

        // 5. Commit Transaction
        if (useTransaction) {
            await session.commitTransaction();
        }

        logger.info({ userId, userEmail, deletionStats }, 'Permanent account deletion completed successfully');

        // 6. Create tombstone record in AdminAuditLog so login/register flows can show "Account Deleted" popup.
        // This log has no targetUserId (it's deleted) and no adminId (self-deletion or system).
        // It persists because we excluded it from deleteMany above.
        await AdminAuditLog.create({
            action: 'user_delete_hard',
            details: {
                email: userEmail,
                deletedUserId: userId,
                deletionDate: new Date(),
                stats: deletionStats
            }
        }).catch(err => logger.error({ err, userId }, 'Failed to create deletion tombstone log'));

        return { success: true, email: userEmail, stats: deletionStats };

    } catch (error) {
        if (useTransaction && session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error({ err: error, userId }, 'Permanent account deletion failed');
        throw error;
    } finally {
        session.endSession();
    }
}

export default {
    deleteUserAccount
};
