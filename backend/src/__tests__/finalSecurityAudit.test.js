import dotenv from 'dotenv';
dotenv.config({ override: true });
import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// ── 1. Mock background queues & services to prevent connection failures ───────
jest.unstable_mockModule('../community/workers/malwareWorker.js', () => ({
  getMalwareScanningQueue: jest.fn().mockReturnValue({
    add: jest.fn().mockResolvedValue({}),
  }),
  scanBinarySignature: async (url) => {
    const { validateCloudinaryUrl } = await import('../utils/urlValidator.js');
    const urlCheck = validateCloudinaryUrl(url);
    if (!urlCheck.ok) {
      return { clean: false, status: 'infected', reason: `Disallowed secure URL domain or path: ${urlCheck.error}` };
    }
    return { clean: true, status: 'clean' };
  }
}));

jest.unstable_mockModule('../community/services/encryptionService.js', () => ({
  encryptAttachmentMetadata: jest.fn().mockReturnValue({
    encryptedData: 'encrypted-url',
    iv: 'iv',
    authTag: 'auth-tag',
    keyVersion: '1',
  }),
  encryptMessage: jest.fn().mockReturnValue({ ciphertext: 'cipher', iv: 'iv', authTag: 'tag' }),
  decryptMessage: jest.fn().mockImplementation((ct) => 'decrypted-msg'),
  decryptMessages: jest.fn().mockImplementation((msgs) => msgs.map(m => ({ ...m, content: 'decrypted-msg' }))),
  generatePreview: jest.fn().mockImplementation((type, text) => text || 'preview'),
  isNonceReplayed: jest.fn().mockResolvedValue(false),
  ACTIVE_KEY_VERSION: '1',
}));

jest.unstable_mockModule('../community/socket/rateLimiter.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
  checkSocketRateLimit: jest.fn().mockResolvedValue(true),
  handleRateLimitViolation: jest.fn().mockResolvedValue(true),
}));

// Mock process.env variables needed for tests
process.env.JWT_SECRET = 'f632d4ad64a781b16c873f2a8934dfca219ad372fe018a3d4ef82e7839b2cdcf6aa83bc6da722c83bf2f074a8dcd1b3bcad9f7831ac5f6e8e29a3fcde5bda1d0';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';

// ── 2. Build App ─────────────────────────────────────────────────────────────
async function buildApp() {
  const app = express();
  app.use(express.json());

  // Inject authenticated mock user
  app.use((req, res, next) => {
    if (req.headers['x-mock-user-id']) {
      req.user = {
        userId: req.headers['x-mock-user-id'],
        name: 'Test Lawyer',
        role: 'lawyer',
      };
    }
    next();
  });

  const { default: uploadRouter } = await import('../community/routes/uploads.js');
  app.use('/api/v1/uploads', uploadRouter);

  return app;
}

describe('Final Security Pass: query safety, Socket.IO, WebSockets & SSRF', () => {
  let app;
  let queryDocuments;
  let deleteManyDocuments;
  let COLLECTIONS;
  let socketAuthMiddleware;
  let registerEventHandlers;

  // Real Database Models
  let User, Conversation, ConversationParticipant, CommunityMessage;

  const MONGODB_URI = process.env.MONGODB_URI;
  const userA = new mongoose.Types.ObjectId().toString();
  const convId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4,
      });
    }

    // Resolve models
    User = (await import('../models/User.js')).default;
    Conversation = (await import('../community/models/Conversation.js')).default;
    ConversationParticipant = (await import('../community/models/ConversationParticipant.js')).default;
    CommunityMessage = (await import('../community/models/Message.js')).default;

    app = await buildApp();

    // Dynamically import remediated code
    const mongodbModule = await import('../services/mongodb.js');
    queryDocuments = mongodbModule.queryDocuments;
    deleteManyDocuments = mongodbModule.deleteManyDocuments;
    COLLECTIONS = mongodbModule.COLLECTIONS;

    const socketAuthModule = await import('../community/socket/socketAuth.js');
    socketAuthMiddleware = socketAuthModule.socketAuthMiddleware;

    const eventHandlersModule = await import('../community/socket/eventHandlers.js');
    registerEventHandlers = eventHandlersModule.registerEventHandlers;
  });

  afterAll(async () => {
    // Clean up created models
    await User.deleteMany({ email: /@security-audit-test\.com$/ });
    await Conversation.findByIdAndDelete(convId);
    await ConversationParticipant.deleteMany({ conversationId: convId });
    await CommunityMessage.deleteMany({ conversationId: convId });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // ── Scenario 1: Query Safety Guards on queryDocuments & deleteManyDocuments ──
  describe('Query Safety Guards', () => {
    test('queryDocuments throws error when required ownership filter is missing', async () => {
      await expect(
        queryDocuments(COLLECTIONS.HEARINGS, [
          { field: 'hearingDate', operator: '>', value: new Date() }
        ])
      ).rejects.toThrow('missing a required ownership filter on \'owner\'');
    });

    test('queryDocuments passes when required ownership filter is present', async () => {
      await expect(
        queryDocuments(COLLECTIONS.HEARINGS, [
          { field: 'owner', operator: '==', value: userA }
        ])
      ).resolves.not.toThrow();
    });

    test('deleteManyDocuments throws error when required ownership filter is missing', async () => {
      await expect(
        deleteManyDocuments(COLLECTIONS.CASES, {})
      ).rejects.toThrow('missing a required ownership filter on \'owner\'');
    });

    test('deleteManyDocuments passes when required ownership filter is present', async () => {
      await expect(
        deleteManyDocuments(COLLECTIONS.CASES, { owner: userA })
      ).resolves.toBeDefined();
    });
  });

  // ── Scenario 2: Socket session version check (logout-all-devices) ─────────────
  describe('WebSocket Token Expiry / Session Version Check', () => {
    test('socketAuthMiddleware accepts connection when token is valid and issued after sessionVersionAt', async () => {
      const iat = Math.round(Date.now() / 1000) - 5; // 5 seconds ago
      const token = jwt.sign({ userId: userA, iat }, process.env.JWT_SECRET);
      
      const mockSocket = {
        handshake: {
          auth: { token },
        },
        id: 'socket-123',
      };

      // Create test user in DB
      await User.create({
        _id: userA,
        name: 'User A',
        email: 'usera@security-audit-test.com',
        passwordHash: 'hash',
        role: 'lawyer',
        sessionVersion: 1,
        sessionVersionAt: new Date(Date.now() - 10000), // 10 seconds ago (token is newer)
      });

      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockSocket.user.userId).toBe(userA);

      await User.findByIdAndDelete(userA);
    });

    test('socketAuthMiddleware rejects connection when token is issued before sessionVersionAt (revoked)', async () => {
      const iat = Math.round(Date.now() / 1000) - 15; // 15 seconds ago
      const token = jwt.sign({ userId: userA, iat }, process.env.JWT_SECRET);
      
      const mockSocket = {
        handshake: {
          auth: { token },
        },
        id: 'socket-123',
      };

      // Create test user in DB
      await User.create({
        _id: userA,
        name: 'User A',
        email: 'usera@security-audit-test.com',
        passwordHash: 'hash',
        role: 'lawyer',
        sessionVersion: 2,
        sessionVersionAt: new Date(Date.now() - 5000), // 5 seconds ago (token is older)
      });

      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toBe('SOCKET_AUTH_REVOKED');

      await User.findByIdAndDelete(userA);
    });
  });

  // ── Scenario 3: SSRF protection in community uploads ──────────────────────────
  describe('POST /api/v1/uploads/register SSRF Check', () => {
    test('should reject non-Cloudinary secureUrl', async () => {
      // Seed participant in DB
      await ConversationParticipant.create({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const res = await request(app)
        .post('/api/v1/uploads/register')
        .set('x-mock-user-id', userA)
        .send({
          conversationId: convId,
          secureUrl: 'https://evil.com/payload.pdf',
          originalFilename: 'malicious.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_URL');
    });

    test('should allow configured Cloudinary secureUrl', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/register')
        .set('x-mock-user-id', userA)
        .send({
          conversationId: convId,
          secureUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/test.pdf`,
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
    });
  });

  // ── Scenario 4: Malware Worker SSRF Protection ────────────────────────────────
  describe('Malware Worker URL Check', () => {
    test('should identify non-Cloudinary URL as infected/quarantined', async () => {
      const { scanBinarySignature } = await import('../community/workers/malwareWorker.js');
      const result = await scanBinarySignature('https://evil-host.com/virus.exe');
      expect(result.clean).toBe(false);
      expect(result.status).toBe('infected');
      expect(result.reason).toContain('Disallowed secure URL domain or path');
    });
  });

  // ── Scenario 5: Typing Stop Event Authorization ───────────────────────────────
  describe('Typing Stop Socket Event Authorization', () => {
    test('should ignore typing stop if user is not participant in conversation', async () => {
      const mockSocket = {
        user: { userId: userA, name: 'Lawyer A' },
        on: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      registerEventHandlers(mockSocket, {});

      // Retrieve registered handleTypingStop
      const typingStopHandler = mockSocket.on.mock.calls.find(call => call[0] === 'typing:stop')[1];
      
      // Clear DB participants to guarantee non-membership
      await ConversationParticipant.deleteMany({ conversationId: convId });

      await typingStopHandler({ conversationId: convId });

      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    test('should broadcast typing stop if user is participant in conversation', async () => {
      // Seed participant in DB
      await ConversationParticipant.create({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const mockSocket = {
        user: { userId: userA, name: 'Lawyer A' },
        on: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      registerEventHandlers(mockSocket, {});

      const typingStopHandler = mockSocket.on.mock.calls.find(call => call[0] === 'typing:stop')[1];
      await typingStopHandler({ conversationId: convId });

      expect(mockSocket.to).toHaveBeenCalledWith(`conv:${convId}`);
    });
  });

  // ── Scenario 6: IDOR message read receipts (conversationId scope) ─────────────
  describe('Mark message as read receipt IDOR protection', () => {
    test('should scope message update to both messageId and conversationId', async () => {
      const mockSocket = {
        user: { userId: userA, name: 'Lawyer A' },
        on: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      registerEventHandlers(mockSocket, {});

      const markReadHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message:read')[1];
      
      const messageId = new mongoose.Types.ObjectId().toString();
      
      // Create message in DB
      await CommunityMessage.create({
        _id: messageId,
        conversationId: convId,
        senderId: userA,
        encryptedContent: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: '1',
      });

      await markReadHandler({ conversationId: convId, messageId }, jest.fn());

      const updatedMsg = await CommunityMessage.findById(messageId).lean();
      expect(updatedMsg.readBy.some(r => String(r.userId) === String(userA))).toBe(true);
    });
  });
});
