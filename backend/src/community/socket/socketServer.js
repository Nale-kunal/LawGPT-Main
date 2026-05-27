/**
 * socketServer.js
 *
 * Initializes Socket.IO server attached to the existing Express HTTP server.
 * Uses @socket.io/redis-adapter for horizontal scaling across multiple instances.
 *
 * Usage (in index.js after app.listen):
 *   import { initSocketServer } from './src/community/socket/socketServer.js';
 *   initSocketServer(currentServer);
 */

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { socketAuthMiddleware } from './socketAuth.js';
import { socketEventSecurityMiddleware, handleSocketDisconnect } from './socketSecurity.js';
import { registerEventHandlers } from './eventHandlers.js';
import logger from '../../utils/logger.js';

let io = null;

/**
 * Initialize Socket.IO and attach to the HTTP server.
 * @param {http.Server} httpServer - The existing Express HTTP server
 * @returns {Server} Socket.IO server instance
 */
export function initSocketServer(httpServer) {
  const frontendOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    // CORS — mirrors existing Express CORS config
    cors: {
      origin: frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },

    // Transport configuration
    transports: ['websocket', 'polling'], // websocket preferred, polling fallback

    // Connection settings
    pingInterval:        25000, // Send ping every 25s
    pingTimeout:         20000, // Disconnect if no pong within 20s
    connectTimeout:      45000,
    upgradeTimeout:      10000,
    maxHttpBufferSize:   1e6,   // 1MB max event payload

    // Path (avoids conflicts with existing HTTP routes)
    path: '/socket.io/community',

    // Security
    allowEIO3: false, // Disable legacy Engine.IO v3
  });

  // ── Redis adapter for horizontal scaling ────────────────────────────────────
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const pubClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      const subClient = pubClient.duplicate();

      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          logger.info('Socket.IO Redis adapter connected — horizontal scaling enabled');
        })
        .catch(err => {
          logger.warn({ err }, 'Socket.IO Redis adapter failed — running in single-instance mode');
        });
    } catch (err) {
      logger.warn({ err }, 'Socket.IO Redis adapter setup failed — running in single-instance mode');
    }
  } else {
    logger.warn('REDIS_URL not set — Socket.IO running in single-instance mode (not suitable for production clusters)');
  }

  // ── Authentication middleware ────────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    // ── Per-event security: rate limiting, whitelist, Zod validation, replay prevention
    socket.use(socketEventSecurityMiddleware(socket));

    // ── Disconnect audit logging
    socket.on('disconnect', (reason) => handleSocketDisconnect(socket, reason));

    registerEventHandlers(socket, io);
  });

  // ── Error monitoring ─────────────────────────────────────────────────────────
  io.engine.on('connection_error', (err) => {
    logger.error({ err: err.message, code: err.code }, 'Socket.IO engine connection error');
  });

  logger.info({ path: '/socket.io/community' }, '🔌 Socket.IO community server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * Used by REST controllers to emit events after DB operations.
 */
export function getIO() {
  return io;
}

/**
 * Emit an event to a specific user's personal room (all their devices).
 */
export function emitToUser(userId, event, data) {
  if (!io) { return; }
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all participants of a conversation.
 */
export function emitToConversation(conversationId, event, data) {
  if (!io) { return; }
  io.to(`conv:${conversationId}`).emit(event, data);
}

export default { initSocketServer, getIO, emitToUser, emitToConversation };
