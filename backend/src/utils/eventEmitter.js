import crypto from 'crypto';
import ActivityEvent from '../models/ActivityEvent.js';

/**
 * Utility to emit structured activity events.
 */
class ActivityEmitter {
    /**
     * Hashes sensitive data using SHA-256.
     * @param {string} data - The data to hash (e.g., IP address, user agent).
     * @returns {string} - The hex-encoded hash.
     */
    hash(data) {
        if (!data) return 'unknown';
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Emits an activity event to the database.
     * @param {Object} params
     * @param {string} params.userId - The ID of the user performing the action.
     * @param {string} params.eventType - The type of event (from strict enum).
     * @param {string} params.req - The Express request object (to extract IP, UA, Geo).
     * @param {Object} params.metadata - Additional minimal metadata (non-sensitive).
     */
    async emit({ userId, eventType, req, metadata = {} }) {
        try {
            const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];
            const geoRegion = req.headers['x-region'] || 'unknown'; // Potential header from Cloudflare/Nginx

            const eventData = {
                userId,
                eventType,
                ipHash: this.hash(ip),
                geoRegion,
                userAgentHash: this.hash(userAgent),
                metadata,
                timestamp: new Date()
            };

            await ActivityEvent.create(eventData);
        } catch (error) {
            console.error('Failed to emit activity event:', error);
            // We don't want to throw an error here as it shouldn't break the main business logic
        }
    }
}

export default new ActivityEmitter();
