/**
 * presenceService.js
 *
 * Redis-backed real-time presence management and session device tracking.
 * Falls back to MongoDB UserPresence model when Redis is unavailable.
 *
 * Redis keys:
 *   presence:{userId}  →  JSON { status, lastSeen, socketIds[] }  TTL: 90s
 *   presence:sockets   →  Hash { socketId: userId }               (no TTL)
 */

import crypto from 'crypto';
import { redis } from '../../utils/redis.js';
import UserPresence from '../models/UserPresence.js';
import UserSession from '../models/UserSession.js';
import logger from '../../utils/logger.js';

const PRESENCE_TTL   = 90;  // seconds — reset on each heartbeat
const HEARTBEAT_INT  = 30;  // seconds — client sends heartbeat every 30s

// ── Lightweight user agent parser ─────────────────────────────────────────────
function parseUserAgent(uaString) {
  if (!uaString) {return { browser: 'Unknown', os: 'Unknown' };}
  let os = 'Unknown';
  if (uaString.includes('Windows')) {os = 'Windows';}
  else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) {os = 'macOS';}
  else if (uaString.includes('Linux')) {os = 'Linux';}
  else if (uaString.includes('Android')) {os = 'Android';}
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) {os = 'iOS';}

  let browser = 'Unknown';
  if (uaString.includes('Firefox')) {browser = 'Firefox';}
  else if (uaString.includes('Chrome')) {browser = 'Chrome';}
  else if (uaString.includes('Safari') && !uaString.includes('Chrome')) {browser = 'Safari';}
  else if (uaString.includes('Edge')) {browser = 'Edge';}

  return { browser, os };
}

// ── Set user online ────────────────────────────────────────────────────────────
export async function setUserOnline(userId, socketId, platform = 'web', userAgent = null, ipAddress = null) {
  const userIdStr = userId.toString();
  const key = `presence:${userIdStr}`;

  try {
    // Update Redis
    const existing = await redis.get(key);
    const presenceData = existing ? JSON.parse(existing) : { status: 'offline', socketIds: [] };

    if (!presenceData.socketIds.includes(socketId)) {
      presenceData.socketIds.push(socketId);
    }
    presenceData.status  = 'online';
    presenceData.lastSeen = new Date().toISOString();

    await redis.set(key, JSON.stringify(presenceData), PRESENCE_TTL);

    // Map socketId → userId for fast lookup on disconnect
    if (redis.isAvailable()) {
      await redis.raw()?.hset('presence:sockets', socketId, userIdStr);
    }

    // Update MongoDB UserPresence (non-blocking)
    UserPresence.findOneAndUpdate(
      { userId },
      {
        $set: { status: 'online', lastSeen: new Date() },
        $addToSet: {
          activeSocketIds: socketId,
          devices: { socketId, platform, connectedAt: new Date() },
        },
      },
      { upsert: true, new: true }
    ).catch(err => logger.warn({ err }, 'presenceService: MongoDB update failed (non-fatal)'));

    // Create/update active user session record (non-blocking)
    const { browser, os } = parseUserAgent(userAgent);
    const sessionId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    UserSession.findOneAndUpdate(
      { userId, socketId },
      {
        $set: {
          sessionId,
          deviceFingerprint: `${browser}-${os}-${platform}`,
          browser,
          os,
          platform,
          userAgent,
          ipAddress,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          lastActiveAt: new Date()
        }
      },
      { upsert: true, new: true }
    ).catch(err => logger.warn({ err }, 'presenceService: failed to create UserSession'));

  } catch (err) {
    logger.error({ err, userId: userIdStr }, 'presenceService: setUserOnline failed');
  }
}

// ── Set user offline (one socket disconnected) ────────────────────────────────
export async function setSocketOffline(socketId) {
  try {
    // Look up userId from socketId mapping
    let userId = null;
    if (redis.isAvailable()) {
      userId = await redis.raw()?.hget('presence:sockets', socketId);
      await redis.raw()?.hdel('presence:sockets', socketId);
    }

    if (!userId) {
      return null;
    }

    const key = `presence:${userId}`;
    const existing = await redis.get(key);
    
    // Inactivate session
    UserSession.findOneAndUpdate(
      { userId, socketId },
      { $set: { isActive: false, socketId: null } }
    ).catch(() => {});

    if (!existing) { return userId; }

    const presenceData = JSON.parse(existing);
    presenceData.socketIds = presenceData.socketIds.filter(id => id !== socketId);

    if (presenceData.socketIds.length === 0) {
      presenceData.status   = 'offline';
      presenceData.lastSeen = new Date().toISOString();
      await redis.set(key, JSON.stringify(presenceData), PRESENCE_TTL * 2);

      // Update MongoDB
      UserPresence.findOneAndUpdate(
        { userId },
        {
          $set: { status: 'offline', lastSeen: new Date() },
          $pull: { activeSocketIds: socketId, devices: { socketId } },
        }
      ).catch(err => logger.warn({ err }, 'presenceService: offline MongoDB update failed'));
    } else {
      await redis.set(key, JSON.stringify(presenceData), PRESENCE_TTL);
      UserPresence.findOneAndUpdate(
        { userId },
        { $pull: { activeSocketIds: socketId, devices: { socketId } } }
      ).catch(() => {});
    }

    return userId;
  } catch (err) {
    logger.error({ err, socketId }, 'presenceService: setSocketOffline failed');
    return null;
  }
}

// ── Heartbeat — refresh TTL ───────────────────────────────────────────────────
export async function refreshPresence(userId) {
  const key = `presence:${userId.toString()}`;
  try {
    const existing = await redis.get(key);
    if (existing) {
      const data = JSON.parse(existing);
      data.lastSeen = new Date().toISOString();
      await redis.set(key, JSON.stringify(data), PRESENCE_TTL);
    }
    // Update MongoDB lastSeen (rate-limited: not every heartbeat)
    const counter = await redis.incr(`hb_count:${userId}`);
    if (counter === 1) {
      await redis.expire(`hb_count:${userId}`, HEARTBEAT_INT * 5);
    }
    if (counter % 5 === 0) {
      UserPresence.updateOne({ userId }, { $set: { lastSeen: new Date() } }).catch(() => {});
    }
  } catch (err) {
    logger.warn({ err, userId }, 'presenceService: refreshPresence failed (non-fatal)');
  }
}

// ── Get presence for a single user ───────────────────────────────────────────
export async function getUserPresence(userId) {
  const key = `presence:${userId.toString()}`;
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const doc = await UserPresence.findOne({ userId }).lean();
    return doc || { status: 'offline', lastSeen: null };
  } catch {
    return { status: 'offline', lastSeen: null };
  }
}

// ── Get presence for multiple users (bulk batch optimization) ─────────────────
export async function getBulkPresence(userIds) {
  if (!userIds || userIds.length === 0) { return {}; }
  const result = {};
  const userIdsStr = userIds.map(uid => uid.toString());
  const redisKeys  = userIdsStr.map(uid => `presence:${uid}`);

  try {
    if (redis.isAvailable()) {
      const cachedList = await redis.raw()?.mget(...redisKeys);
      const cacheMisses = [];

      for (let i = 0; i < userIdsStr.length; i++) {
        const uid = userIdsStr[i];
        const cached = cachedList?.[i];
        if (cached) {
          result[uid] = JSON.parse(cached);
        } else {
          cacheMisses.push(uid);
        }
      }

      if (cacheMisses.length > 0) {
        // Batched database trip
        const missesDocs = await UserPresence.find({ userId: { $in: cacheMisses } }).lean();
        for (const doc of missesDocs) {
          const uid = doc.userId.toString();
          result[uid] = {
            status:   doc.status,
            lastSeen: doc.lastSeen?.toISOString() || null
          };
          // Write back to cache
          await redis.set(`presence:${uid}`, JSON.stringify(result[uid]), PRESENCE_TTL);
        }

        // Fill non-existent presence docs with fallback offline object
        for (const uid of cacheMisses) {
          if (!result[uid]) {
            result[uid] = { status: 'offline', lastSeen: null };
          }
        }
      }
    } else {
      // Direct batched query if Redis is offline
      const docs = await UserPresence.find({ userId: { $in: userIdsStr } }).lean();
      for (const doc of docs) {
        result[doc.userId.toString()] = {
          status:   doc.status,
          lastSeen: doc.lastSeen?.toISOString() || null
        };
      }
      for (const uid of userIdsStr) {
        if (!result[uid]) {
          result[uid] = { status: 'offline', lastSeen: null };
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'presenceService: getBulkPresence optimized query failed, falling back.');
    // Fail-safe offline fallback
    for (const uid of userIdsStr) {
      result[uid] = { status: 'offline', lastSeen: null };
    }
  }
  return result;
}

export { HEARTBEAT_INT };
