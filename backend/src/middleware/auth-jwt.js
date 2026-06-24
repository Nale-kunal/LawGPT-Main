import jwt from 'jsonwebtoken';
import { getDocumentById, MODELS } from '../services/mongodb.js';
import { isTokenBlacklisted } from '../services/tokenService.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';
import { getCachedUser, setCachedUser } from '../utils/userCache.js';
import { maskToken } from '../utils/logSanitizer.js';
import { checkAccountStatus } from '../utils/accountStatus.js';
import { REQUIRED_SIGNUP_CONSENTS } from '../config/policyVersions.js';

/**
 * JWT-based authentication middleware.
 *
 * Security properties:
 *  - Redis token blacklist check (revoked tokens rejected immediately)
 *  - Session version check (logout-all-devices increments version, old JWTs fail)
 *  - Redis user profile cache (eliminates DB roundtrip on every request)
 *  - No sensitive values logged (token prefix only)
 *  - Deleted/suspended users blocked
 */
export async function requireAuth(req, res, next) {
    try {
        // ── 1. Extract token from cookie or Authorization header ──────────────
        const token = req.cookies?.token ||
            (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

        if (!token) {
            return res.status(401).json({
                error: 'No authentication token provided',
                errorCode: 'NO_TOKEN',
            });
        }

        // ── 2. Check token blacklist (Redis) ──────────────────────────────────
        if (await isTokenBlacklisted(token)) {
            logger.warn({ tokenPrefix: maskToken(token) }, 'Blacklisted token used');
            clearAuthCookie(res);
            return res.status(401).json({
                error: 'Token has been revoked',
                errorCode: 'TOKEN_REVOKED',
            });
        }

        // ── 3. Verify JWT signature and expiry ────────────────────────────────
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, env.JWT_SECRET);
        } catch (jwtError) {
            logger.warn({ errName: jwtError.name }, 'JWT verification failed');
            clearAuthCookie(res);
            return res.status(401).json({
                error: 'Invalid or expired token',
                errorCode: 'TOKEN_INVALID',
            });
        }

        const userId = decodedToken.userId;
        if (!userId) {
            logger.warn('JWT missing userId claim');
            clearAuthCookie(res);
            return res.status(401).json({ error: 'Invalid token claims', errorCode: 'TOKEN_INVALID' });
        }

        // ── 4. Load user profile (cache-first, DB fallback) ──────────────────
        let userProfile = await getCachedUser(userId);

        if (!userProfile) {
            // Cache miss — load from MongoDB and populate cache
            userProfile = await getDocumentById(MODELS.USERS, userId);
            if (userProfile) {
                // Populate cache for subsequent requests (fire-and-forget)
                setCachedUser(userId, userProfile).catch(() => {/* non-fatal */});
            }
        }

        if (!userProfile) {
            logger.warn({ userId }, 'User profile not found — rejecting auth');
            clearAuthCookie(res);
            return res.status(401).json({
                error: 'User profile not found',
                errorCode: 'USER_NOT_FOUND',
            });
        }

        // ── 5. Block deleted or suspended users ───────────────────────────────
        const statusCheck = checkAccountStatus(userProfile);
        if (!statusCheck.active) {
            logger.warn({ userId, errorCode: statusCheck.code }, 'Inactive/suspended user attempted to access protected route');
            clearAuthCookie(res);
            return res.status(statusCheck.status || 403).json({
                error: statusCheck.message,
                errorCode: statusCheck.code,
            });
        }

        // ── 6. Session version check (logout-all-devices) ─────────────────────
        // If the user has incremented their sessionVersion, any JWT issued
        // before that version increment is invalid — forcing re-authentication.
        const sessionVersion = userProfile.sessionVersion || 0;
        const sessionVersionAt = userProfile.sessionVersionAt
            ? new Date(userProfile.sessionVersionAt).getTime()
            : 0;

        if (sessionVersion > 0 && sessionVersionAt > 0) {
            // JWT iat (issued-at) is in seconds; convert to ms for comparison
            const tokenIssuedAt = (decodedToken.iat || 0) * 1000;
            if (tokenIssuedAt < sessionVersionAt) {
                logger.warn({ userId, sessionVersion }, 'Token predates session version — rejected');
                clearAuthCookie(res);
                return res.status(401).json({
                    error: 'Session has been invalidated. Please log in again.',
                    errorCode: 'SESSION_INVALIDATED',
                });
            }
        }

        // ── 7. Legal Consent Compliance Gating ────────────────────────────────
        // If policies are updated, users must accept the new versions before
        // they can use any non-exempt platform APIs.
        const requestPath = req.originalUrl.split('?')[0];
        const bypassRoutes = [
            '/api/v1/auth/consent-status',
            '/api/v1/legal/record-consent',
            '/api/v1/legal/check-consent',
            '/api/v1/legal/my-consents',
            '/api/v1/auth/me',
            '/api/v1/auth/logout',
        ];
        const isBypassed = bypassRoutes.includes(requestPath) || requestPath.startsWith('/api/v1/legal/');

        if (!isBypassed) {
            const enforceConsent = env.NODE_ENV !== 'test' || process.env.TEST_ENFORCE_CONSENT === 'true';
            if (enforceConsent) {
                const userConsents = userProfile.legalConsents || [];
                const isCompliant = REQUIRED_SIGNUP_CONSENTS.every(
                    (reqConsent) => userConsents.some(
                        (c) => c.policyType === reqConsent.policyType && c.version === reqConsent.version
                    )
                );

                if (!isCompliant) {
                    logger.warn({ userId, requestPath }, 'Blocking request: Policy acceptance required');
                    return res.status(403).json({
                        error: 'You must accept the updated Terms of Service and Privacy Policy to continue using Juriq.',
                        errorCode: 'POLICY_UPDATE_REQUIRED',
                    });
                }
            }
        }

        // ── 8. Attach minimal user info to request ────────────────────────────
        req.user = {
            userId: userId,
            email: decodedToken.email || userProfile.email,
            role: decodedToken.role || userProfile.role || 'lawyer',
            name: userProfile.name,
            barNumber: userProfile.barNumber,
            firm: userProfile.firm,
        };

        // ── 9. Abuse detection ────────────────────────────────────────────────
        const { abuseDetection: detectAbuse } = await import('./abuseDetection.js');
        return await detectAbuse(req, res, next);

    } catch (error) {
        logger.error({ errName: error.name, errMessage: error.message }, 'Auth middleware error');
        clearAuthCookie(res);
        return res.status(401).json({
            error: 'Authentication failed',
            errorCode: 'AUTH_ERROR',
        });
    }
}

/**
 * Clears the auth cookie with the correct options.
 * @param {object} res - Express response
 */
function clearAuthCookie(res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
    });
}
