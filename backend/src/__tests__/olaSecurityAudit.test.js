import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

// ── 1. Mock Database Store ───────────────────────────────────────────────────
const mockStore = {
  participants: [],
  attachments: [],
  messages: [],
  reports: [],
  channels: [],
};

function resetMockStore() {
  mockStore.participants = [];
  mockStore.attachments = [];
  mockStore.messages = [];
  mockStore.reports = [];
  mockStore.channels = [];
}

// ── 2. Mocking Models using ESM ──────────────────────────────────────────────
jest.unstable_mockModule('../community/models/ConversationParticipant.js', () => {
  return {
    default: {
      exists: jest.fn().mockImplementation(async (query) => {
        return mockStore.participants.some(p => {
          return String(p.conversationId) === String(query.conversationId) &&
                 String(p.userId) === String(query.userId) &&
                 p.isRemoved === query.isRemoved;
        });
      }),
      updateOne: jest.fn().mockImplementation(async (query, update) => {
        const participant = mockStore.participants.find(p => {
          return String(p.conversationId) === String(query.conversationId) &&
                 String(p.userId) === String(query.userId) &&
                 (!('isRemoved' in query) || p.isRemoved === query.isRemoved);
        });
        if (participant) {
          if (update.$set) {
            Object.assign(participant, update.$set);
          }
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      }),
    }
  };
});

jest.unstable_mockModule('../community/models/MessageAttachment.js', () => {
  return {
    default: {
      create: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: new mongoose.Types.ObjectId().toString(), ...data };
        mockStore.attachments.push(doc);
        return doc;
      }),
    }
  };
});

jest.unstable_mockModule('../community/models/Message.js', () => {
  return {
    default: {
      findById: jest.fn().mockImplementation((id) => {
        const msg = mockStore.messages.find(m => String(m._id) === String(id));
        return {
          select: () => ({
            lean: () => Promise.resolve(msg),
          }),
        };
      }),
      findByIdAndUpdate: jest.fn().mockImplementation(async (id, update) => {
        const msg = mockStore.messages.find(m => String(m._id) === String(id));
        if (msg && update.$set) {
          Object.assign(msg, update.$set);
        }
        return msg;
      }),
    }
  };
});

jest.unstable_mockModule('../community/models/CommunityReport.js', () => {
  return {
    default: {
      create: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: new mongoose.Types.ObjectId().toString(), ...data };
        mockStore.reports.push(doc);
        return doc;
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockReturnValue({
        lean: () => Promise.resolve(null),
      }),
    },
    REPORT_CATEGORIES: ['spam', 'harassment', 'abuse', 'inappropriate', 'other'],
  };
});

jest.unstable_mockModule('../community/models/CommunityChannel.js', () => {
  return {
    default: {
      findOne: jest.fn().mockImplementation((query) => {
        const ch = mockStore.channels.find(c => c.slug === query.slug);
        return {
          lean: () => Promise.resolve(ch),
        };
      }),
      findByIdAndUpdate: jest.fn().mockImplementation(async (id, update) => {
        const ch = mockStore.channels.find(c => String(c._id) === String(id));
        if (ch && update.$inc) {
          ch.memberCount = (ch.memberCount || 0) + (update.$inc.memberCount || 0);
        }
        return ch;
      }),
    }
  };
});

jest.unstable_mockModule('../community/models/BlockedUser.js', () => {
  return {
    default: {
      exists: jest.fn().mockResolvedValue(false),
    }
  };
});

jest.unstable_mockModule('../community/models/ModerationLog.js', () => {
  return {
    default: {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({
        lean: () => Promise.resolve(null),
      }),
    }
  };
});

// ── 3. Mock Helpers & Services ────────────────────────────────────────────────
jest.unstable_mockModule('../community/workers/malwareWorker.js', () => ({
  getMalwareScanningQueue: jest.fn().mockReturnValue({
    add: jest.fn().mockResolvedValue({}),
  }),
}));

jest.unstable_mockModule('../community/services/encryptionService.js', () => ({
  encryptAttachmentMetadata: jest.fn().mockReturnValue({
    encryptedData: 'encrypted-val',
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

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

// ── 4. Build Express App and Load Routes ──────────────────────────────────────
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
  const { default: reportRouter } = await import('../community/routes/reports.js');
  const { default: channelRouter } = await import('../community/routes/channels.js');

  app.use('/api/v1/uploads', uploadRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/channels', channelRouter);

  return app;
}

// ── 5. Test Suite ────────────────────────────────────────────────────────────
describe('Object-Level Authorization (OLA) & IDOR Security Audits', () => {
  let app;
  const userA = '654321098765432109876543';
  const userB = '123456789012345678901234';
  const convId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();
  });

  // ── uploads.js /register OLA check ──────────────────────────────────────────
  describe('POST /api/v1/uploads/register OLA Check', () => {
    test('1. Participant of conversation is allowed to register attachment', async () => {
      mockStore.participants.push({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const res = await request(app)
        .post('/api/v1/uploads/register')
        .set('x-mock-user-id', userA)
        .send({
          conversationId: convId,
          secureUrl: 'https://res.cloudinary.com/test-cloud/image/upload/valid-file.pdf',
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('pending_scan');
    });

    test('2. Non-participant is blocked from registering attachment', async () => {
      // User B is not in participants list
      mockStore.participants.push({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const res = await request(app)
        .post('/api/v1/uploads/register')
        .set('x-mock-user-id', userB)
        .send({
          conversationId: convId,
          secureUrl: 'https://res.cloudinary.com/test-cloud/image/upload/valid-file.pdf',
          originalFilename: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESS_DENIED');
      expect(res.body.message).toMatch(/not a member/i);
    });
  });

  // ── reports.js /message OLA check ───────────────────────────────────────────
  describe('POST /api/v1/reports/message OLA Check', () => {
    const messageId = '507f1f77bcf86cd799439022';

    beforeEach(() => {
      mockStore.messages.push({
        _id: messageId,
        conversationId: convId,
        isDeleted: false,
      });
    });

    test('1. Participant of conversation is allowed to report its messages', async () => {
      mockStore.participants.push({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const res = await request(app)
        .post('/api/v1/reports/message')
        .set('x-mock-user-id', userA)
        .send({
          messageId,
          category: 'spam',
          detail: 'unsolicited pitch',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('2. Non-participant is blocked from reporting conversation messages', async () => {
      mockStore.participants.push({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const res = await request(app)
        .post('/api/v1/reports/message')
        .set('x-mock-user-id', userB)
        .send({
          messageId,
          category: 'spam',
          detail: 'unsolicited pitch',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESS_DENIED');
      expect(res.body.message).toMatch(/not a member/i);
    });
  });

  // ── channelController.js leaveChannel count logic ──────────────────────────
  describe('DELETE /api/v1/channels/:slug/leave OLA check', () => {
    const slug = 'general-chat';
    const channelId = 'ch_111';

    beforeEach(() => {
      mockStore.channels.push({
        _id: channelId,
        slug,
        conversationId: convId,
        memberCount: 5,
      });
    });

    test('1. Active participant leaving decrements channel memberCount', async () => {
      mockStore.participants.push({
        conversationId: convId,
        userId: userA,
        isRemoved: false,
      });

      const res = await request(app)
        .delete(`/api/v1/channels/${slug}/leave`)
        .set('x-mock-user-id', userA)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const channel = mockStore.channels.find(c => c.slug === slug);
      expect(channel.memberCount).toBe(4);
    });

    test('2. Repeated or inactive leave calls do not decrement memberCount below boundary', async () => {
      // User A is already marked as removed/not in participant list
      mockStore.participants.push({
        conversationId: convId,
        userId: userA,
        isRemoved: true,
      });

      const res = await request(app)
        .delete(`/api/v1/channels/${slug}/leave`)
        .set('x-mock-user-id', userA)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const channel = mockStore.channels.find(c => c.slug === slug);
      expect(channel.memberCount).toBe(5); // should remain unchanged
    });
  });
});
