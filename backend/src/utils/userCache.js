/**
 * userCache.js
 *
 * Redis-backed user profile cache for the auth middleware.
 *
 * Eliminates the MongoDB lookup on every authenticated request by caching
 * the minimal user profile data needed for authorization decisions.
 *
 * Cache TTL: 120 seconds (2 minutes)
 * Cache invalidation: login, logout, plan change, suspension, deletion, password change
 *
 * Usage:
 *   import { getCachedUser, invalidateUserCache, setCachedUser } from '../utils/userCache.js';
 */

import { redis } from './redis.js';
import logger from './logger.js';

const CACHE_TTL_SECONDS = 120;
const CACHE_PREFIX = 'user_profile:';

/**
 * Builds the Redis cache key for a given userId.
 * @param {string} userId
 * @returns {string}
 */
function cacheKey(userId) {
    return `${CACHE_PREFIX}${userId}`;
}

/**
 * Stores a user profile in the Redis cache.
 * Only caches the minimal fields needed for auth/authorization decisions.
 *
 * @param {string} userId
 * @param {object} userProfile - Full user document from MongoDB
 * @returns {Promise<void>}
 */
export async function setCachedUser(userId, userProfile) {
    if (!redis.isAvailable()) {return;}

    try {
        // Only cache the fields that auth middleware actually needs.
        // Intentionally excludes: password hash, tokens, large arrays.
        const cachePayload = JSON.stringify({
            _id: userProfile._id?.toString() || userId,
            userId: userId,
            email: userProfile.email,
            name: userProfile.name,
            role: userProfile.role || 'lawyer',
            status: userProfile.status,
            deleted: userProfile.deleted || false,
            subscriptionPlan: userProfile.subscriptionPlan || 'free',
            planEndDate: userProfile.planEndDate || null,
            sessionVersion: userProfile.sessionVersion || 0,
            sessionVersionAt: userProfile.sessionVersionAt || null,
            securityFlags: userProfile.securityFlags || {},
            accountStatus: userProfile.accountStatus || {},
            barNumber: userProfile.barNumber || null,
            firm: userProfile.firm || null,
            cachedAt: Date.now(),
        });

        await redis.set(cacheKey(userId), cachePayload, CACHE_TTL_SECONDS);
    } catch (err) {
        // Cache write failure is non-fatal — auth will fall back to DB
        logger.warn({ userId, err: err.message }, '[userCache] Failed to write user cache');
    }
}

/**
 * Retrieves a user profile from the Redis cache.
 * Returns null on cache miss or any error (caller falls back to DB).
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getCachedUser(userId) {
    if (!redis.isAvailable()) {return null;}

    try {
        const cached = await redis.get(cacheKey(userId));
        if (!cached) {return null;}

        return JSON.parse(cached);
    } catch (err) {
        // Parse error or Redis error — fall through to DB
        logger.warn({ userId, err: err.message }, '[userCache] Cache read failed, falling back to DB');
        return null;
    }
}

/**
 * Invalidates (deletes) a user's cache entry.
 * Call this whenever the user's auth-relevant data changes:
 *  - Logout / logout-all-devices
 *  - Plan change
 *  - User suspension or deletion
 *  - Password change
 *  - Role change
 *  - sessionVersion increment
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function invalidateUserCache(userId) {
    if (!redis.isAvailable()) {return;}

    try {
        await redis.del(cacheKey(userId));
        logger.debug({ userId }, '[userCache] User cache invalidated');
    } catch (err) {
        // Non-fatal — worst case: stale cache for up to TTL duration
        logger.warn({ userId, err: err.message }, '[userCache] Failed to invalidate user cache');
    }
}

export default { getCachedUser, setCachedUser, invalidateUserCache };
