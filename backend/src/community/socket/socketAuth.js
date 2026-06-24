/**
 * socketAuth.js
 *
 * Socket.IO authentication middleware.
 * Validates JWT token from socket handshake before any event is processed.
 * Reuses existing JWT verification logic — no duplication.
 */

import jwt from 'jsonwebtoken';
import { isTokenBlacklisted } from '../../services/tokenService.js';
import { getDocumentById, MODELS } from '../../services/mongodb.js';
import logger from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { checkAccountStatus } from '../../utils/accountStatus.js';

/**
 * Socket.IO middleware — called once per connection.
 * Sets socket.user if valid, calls next(Error) to reject if invalid.
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    // Accept token from:
    //   1. socket.handshake.auth.token  (preferred — explicit)
    //   2. Authorization header          (Bearer token)
    //   3. Cookie header                 (fallback for browser clients)
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace('Bearer ', '').trim() ||
      parseCookieToken(socket.handshake.headers?.cookie);

    if (!token) {
      logger.warn({ socketId: socket.id, ip: socket.handshake.address }, 'Socket auth: no token provided');
      return next(new Error('SOCKET_AUTH_REQUIRED'));
    }

    // Check token blacklist
    if (await isTokenBlacklisted(token)) {
      logger.warn({ socketId: socket.id }, 'Socket auth: blacklisted token');
      return next(new Error('SOCKET_AUTH_REVOKED'));
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      logger.warn({ socketId: socket.id, err: jwtErr.message }, 'Socket auth: JWT verification failed');
      return next(new Error('SOCKET_AUTH_INVALID'));
    }

    // Load user profile
    const user = await getDocumentById(MODELS.USERS, decoded.userId);
    if (!user) {
      return next(new Error('SOCKET_AUTH_USER_NOT_FOUND'));
    }

    // Session version check (logout-all-devices / password change)
    const sessionVersion = user.sessionVersion || 0;
    const sessionVersionAt = user.sessionVersionAt
      ? new Date(user.sessionVersionAt).getTime()
      : 0;

    if (sessionVersion > 0 && sessionVersionAt > 0) {
      const tokenIssuedAt = (decoded.iat || 0) * 1000;
      if (tokenIssuedAt < sessionVersionAt) {
        logger.warn({ userId: decoded.userId, sessionVersion }, 'Socket auth: Token predates session version — rejected');
        return next(new Error('SOCKET_AUTH_REVOKED'));
      }
    }

    // Block deleted, suspended, or security-flagged users
    const statusCheck = checkAccountStatus(user);
    if (!statusCheck.active) {
      logger.warn(
        { userId: decoded.userId, code: statusCheck.code },
        'Socket auth: blocked/suspended/deleted user attempted connection'
      );
      return next(new Error(`SOCKET_AUTH_${statusCheck.code}`));
    }

    // Concurrency limit: max 5 active sockets per user
    const io = socket.server;
    const rooms = io?.sockets?.adapter?.rooms;
    const connectedSockets = rooms ? rooms.get(`user:${decoded.userId}`) : null;
    const activeCount = connectedSockets ? connectedSockets.size : 0;
    if (activeCount >= 5) {
      logger.warn({ userId: decoded.userId }, 'Socket auth: max concurrent socket limit reached');
      return next(new Error('SOCKET_LIMIT_EXCEEDED'));
    }

    // Attach user to socket (available in all event handlers)
    socket.user = {
      userId:   decoded.userId,
      email:    decoded.email,
      role:     decoded.role || user.role || 'lawyer',
      name:     user.name,
    };

    logger.debug({ userId: decoded.userId, socketId: socket.id }, 'Socket authenticated');
    next();

  } catch (err) {
    logger.error({ err, socketId: socket.id }, 'Socket auth: unexpected error');
    next(new Error('SOCKET_AUTH_ERROR'));
  }
}

// ── Helper — extract token from Cookie header string ──────────────────────────
function parseCookieToken(cookieHeader) {
  if (!cookieHeader) { return null; }
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : null;
}
