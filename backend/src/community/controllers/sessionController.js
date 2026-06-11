/**
 * sessionController.js
 *
 * Handles trusted device listing, session state tracking, and remote logout.
 */

import UserSession from '../models/UserSession.js';
import CommunityAuditLog from '../models/CommunityAuditLog.js';
import { getIO } from '../socket/socketServer.js';
import logger from '../../utils/logger.js';

// ── Get all active sessions for current user ──────────────────────────────────
export async function getUserSessions(req, res) {
  try {
    const userId = req.user.userId;
    const sessions = await UserSession.find({ userId, isActive: true })
      .sort({ lastActiveAt: -1 })
      .lean();

    res.json({ ok: true, sessions });
  } catch (err) {
    logger.error({ err }, 'getUserSessions error');
    res.status(500).json({ error: 'Failed to load sessions list' });
  }
}

// ── Revoke / terminate a specific session ────────────────────────────────────
export async function revokeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const session = await UserSession.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // Inactivate session state
    session.isActive = false;
    await session.save();

    // Terminate active websocket connection across the cluster
    const io = getIO();
    if (io && session.socketId) {
      // Disconnect targeted socket
      io.in(session.socketId).disconnectSockets(true);
      logger.info({ userId, socketId: session.socketId }, 'Revoked session socket disconnected');
    }

    // Immutable audit logging
    await CommunityAuditLog.create({
      action: 'session_revocation',
      performedBy: userId,
      targetUserId: userId,
      severity: 'warning',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { sessionId, deviceFingerprint: session.deviceFingerprint }
    });

    res.json({ ok: true, message: 'Session revoked successfully' });
  } catch (err) {
    logger.error({ err }, 'revokeSession error');
    res.status(500).json({ error: 'Failed to revoke session' });
  }
}

// ── Revoke all sessions (remote logout all devices) ─────────────────────────
export async function revokeAllSessions(req, res) {
  try {
    const userId = req.user.userId;

    // Get active socket IDs
    const activeSessions = await UserSession.find({ userId, isActive: true }).select('socketId').lean();
    
    // Deactivate all active sessions in DB
    await UserSession.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false } }
    );

    // Terminate all socket connections for this user across the entire cluster
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).disconnectSockets(true);
      logger.info({ userId }, 'Terminated all active websocket connections for user');
    }

    // Audit logging
    await CommunityAuditLog.create({
      action: 'session_revocation_all',
      performedBy: userId,
      targetUserId: userId,
      severity: 'critical',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { activeSessionsCount: activeSessions.length }
    });

    res.json({ ok: true, message: 'All sessions terminated successfully' });
  } catch (err) {
    logger.error({ err }, 'revokeAllSessions error');
    res.status(500).json({ error: 'Failed to terminate all sessions' });
  }
}
