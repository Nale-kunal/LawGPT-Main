import jwt from 'jsonwebtoken';
import { getDocumentById, MODELS } from '../services/mongodb.js';
import { isTokenBlacklisted } from '../services/tokenService.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * JWT-based authentication middleware
 * Replaces Firebase token verification
 */
export async function requireAuth(req, res, next) {
    try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '');

        // Log for debugging in development
        if (process.env.NODE_ENV === 'development') {
            logger.debug({
                hasCookie: !!req.cookies?.token,
                hasAuthHeader: !!req.headers.authorization,
                path: req.path,
                method: req.method
            }, 'Auth check');
        }

        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                logger.debug('No token found in request');
            }
            res.clearCookie('token', {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
            });
            return res.status(401).json({
                error: 'No authentication token provided',
                ...(process.env.NODE_ENV === 'development' && {
                    debug: 'No token in cookies or Authorization header',
                    cookies: Object.keys(req.cookies || {}),
                    hasAuthHeader: !!req.headers.authorization
                })
            });
        }

        // Check if token is blacklisted in Redis
        if (await isTokenBlacklisted(token)) {
            logger.error('Blacklisted token used: %s', token.substring(0, 20));
            res.clearCookie('token', {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
            });
            return res.status(401).json({
                error: 'Token has been revoked',
                errorCode: 'TOKEN_REVOKED'
            });
        }

        let decodedToken;

        // Verify JWT token
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);

            if (process.env.NODE_ENV === 'development') {
                logger.debug('Verified JWT token for user: %s', decodedToken.email);
            }
        } catch (jwtError) {
            logger.error({ err: jwtError.message }, 'JWT verification failed');

            if (process.env.NODE_ENV === 'development') {
                logger.error({
                    name: jwtError.name,
                    message: jwtError.message,
                    tokenLength: token.length,
                    tokenPrefix: token.substring(0, 20)
                }, 'JWT verification error details');
            }

            res.clearCookie('token', {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
            });

            return res.status(401).json({
                error: 'Invalid or expired token',
                ...(process.env.NODE_ENV === 'development' && {
                    details: jwtError.message,
                    name: jwtError.name
                })
            });
        }

        // Get user profile from MongoDB
        const userProfile = await getDocumentById(MODELS.USERS, decodedToken.userId);

        if (!userProfile) {
            logger.error({ userId: decodedToken.userId }, 'User profile not found - returning 401');
            res.clearCookie('token', {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
            });
            return res.status(401).json({
                error: 'User profile not found',
                ...(process.env.NODE_ENV === 'development' && { userId: decodedToken.userId })
            });
        }

        // Block deleted users from accessing protected routes.
        // IMPORTANT: check only status === 'deleted'. Do NOT check deletedAt alone
        // because reactivated users retain a deletedAt timestamp from their prior deletion.
        const isDeleted = userProfile.status === 'deleted' || userProfile.deleted === true;
        if (isDeleted) {
            logger.error({ userId: decodedToken.userId }, 'Deleted user attempted to access protected route');
            res.clearCookie('token', {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
            });
            return res.status(403).json({
                error: 'Account has been deleted',
                errorCode: 'ACCOUNT_DELETED'
            });
        }

        // Attach user info to request
        req.user = {
            userId: decodedToken.userId,
            email: decodedToken.email,
            role: decodedToken.role || userProfile.role || 'lawyer',
            name: userProfile.name,
            barNumber: userProfile.barNumber,
            firm: userProfile.firm,
        };

        if (process.env.NODE_ENV === 'development') {
            logger.debug('Auth successful for user: %s', req.user.email);
        }

        // Apply abuse detection after successful authentication
        // Note: we import it inside to avoid circular dependency if any
        const { abuseDetection: detectAbuse } = await import('./abuseDetection.js');
        return await detectAbuse(req, res, next);
    } catch (error) {
        logger.error({ err: error.message }, 'Auth middleware error');
        logger.error({ stack: error.stack }, 'Auth middleware stack');

        // Clear invalid cookies
            res.clearCookie('token', {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
            });

        return res.status(401).json({
            error: 'Authentication failed',
            ...(process.env.NODE_ENV === 'development' && {
                details: error.message,
                stack: error.stack
            })
        });
    }
}
