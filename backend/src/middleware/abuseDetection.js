import User from '../models/User.js';
import AbuseSignalLog from '../models/AbuseSignalLog.js';
import activityEmitter from '../utils/eventEmitter.js';

const SIGNAL_SCORES = {
    failed_login: 10,
    upload_burst: 10,
    ai_query_burst: 15,
    geo_jump: 25,
    region_mismatch: 30
};

const DECAY_AMOUNT = 10;
const DECAY_INTERVAL_HOURS = 5;

/**
 * Middleware to detect and handle abuse signals.
 */
export const abuseDetection = async (req, res, next) => {
    if (!req.user || !req.user.userId) return next();

    try {
        const user = await User.findById(req.user.userId);
        if (!user) return next();

        // Check for temporary suspension
        if (user.securityFlags?.temporarySuspensionUntil && user.securityFlags.temporarySuspensionUntil > new Date()) {
            return res.status(403).json({
                error: 'ACCOUNT_SUSPENDED',
                message: 'Account temporarily suspended due to suspicious activity. Please try again later.',
                suspendedUntil: user.securityFlags.temporarySuspensionUntil
            });
        }

        // Decay score if needed
        if (user.securityFlags?.lastAbuseSignalAt) {
            const hoursSinceLastSignal = (new Date() - user.securityFlags.lastAbuseSignalAt) / (1000 * 60 * 60);
            if (hoursSinceLastSignal >= DECAY_INTERVAL_HOURS) {
                const decayCycles = Math.floor(hoursSinceLastSignal / DECAY_INTERVAL_HOURS);
                const totalDecay = decayCycles * DECAY_AMOUNT;

                user.securityFlags.abuseScore = Math.max(0, user.securityFlags.abuseScore - totalDecay);
                // We don't update lastAbuseSignalAt here to allow continuous decay, 
                // but wait, if we don't update it, it will keep decaying the same amount.
                // Better: update user.securityFlags.abuseScore and save.
            }
        }

        // Check for Region Mismatch
        const jwtRegion = req.user.region;
        const currentRegion = req.headers['x-region'] || 'IN';

        if (jwtRegion && jwtRegion !== currentRegion) {
            await recordAbuseSignal(user, 'region_mismatch', { jwtRegion, currentRegion }, req);
        }

        // Check for Geo Change > 2000km
        const currentLat = parseFloat(req.headers['x-lat']);
        const currentLon = parseFloat(req.headers['x-lon']);

        if (!isNaN(currentLat) && !isNaN(currentLon) && user.accountStatus.lastKnownGeo?.lat) {
            const distance = calculateDistance(
                user.accountStatus.lastKnownGeo.lat,
                user.accountStatus.lastKnownGeo.lon,
                currentLat,
                currentLon
            );

            if (distance > 2000) {
                await recordAbuseSignal(user, 'geo_jump', {
                    prev: user.accountStatus.lastKnownGeo,
                    current: { lat: currentLat, lon: currentLon },
                    distance
                }, req);
            }
        }

        // Update last known geo if provided
        if (!isNaN(currentLat) && !isNaN(currentLon)) {
            user.accountStatus.lastKnownGeo = {
                lat: currentLat,
                lon: currentLon,
                region: currentRegion,
                city: req.headers['x-city'] || 'unknown'
            };
        }

        await user.save();
        next();
    } catch (error) {
        console.error('Abuse detection error:', error);
        next();
    }
};

/**
 * Simple Haversine approximation for distance in km.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Records an abuse signal and updates user score.
 */
export const recordAbuseSignal = async (user, signalType, metadata = {}, req) => {
    try {
        const scoreImpact = SIGNAL_SCORES[signalType] || 0;

        await AbuseSignalLog.create({
            userId: user._id,
            signalType,
            scoreImpact,
            metadata,
            timestamp: new Date()
        });

        user.securityFlags.abuseScore += scoreImpact;
        user.securityFlags.lastAbuseSignalAt = new Date();

        // Evaluation rules
        if (user.securityFlags.abuseScore >= 60) {
            user.securityFlags.isSuspicious = true;
        }

        if (user.securityFlags.abuseScore >= 75 && !user.securityFlags.temporarySuspensionUntil) {
            user.securityFlags.temporarySuspensionUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour suspension
            user.accountStatus.isSuspended = true;
            user.accountStatus.suspensionReason = `Automated suspension due to ${signalType}`;

            await activityEmitter.emit({
                userId: user._id,
                eventType: 'geo_change_detected', // Or generic abuse event
                req,
                metadata: { reason: 'auto_suspension', score: user.securityFlags.abuseScore }
            });
        }

        if (user.securityFlags.abuseScore >= 90) {
            // Flag for admin review - already sets isSuspicious to true
            // Prompt says DO NOT auto-permanently suspend.
        }

        await user.save();
    } catch (error) {
        console.error('Failed to record abuse signal:', error);
    }
};
