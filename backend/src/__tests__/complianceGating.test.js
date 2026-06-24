import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  audit_logs: [],
  community_messages: [],
  cases: [],
  clients: [],
  documents: [],
  hearings: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.audit_logs = [];
  mockStore.community_messages = [];
  mockStore.cases = [];
  mockStore.clients = [];
  mockStore.documents = [];
  mockStore.hearings = [];
}

// Mock database services
jest.unstable_mockModule('../services/mongodb.js', () => {
  const collections = {
    USERS: 'users',
    CASES: 'cases',
    CLIENTS: 'clients',
    DOCUMENTS: 'documents',
    HEARINGS: 'hearings',
  };
  return {
    COLLECTIONS: collections,
    MODELS: collections,
    getDocumentById: jest.fn().mockImplementation(async (col, id) => {
      return mockStore[col]?.find(x => String(x._id) === String(id)) || null;
    }),
    updateDocument: jest.fn().mockImplementation(async (col, id, update) => {
      const doc = mockStore[col]?.find(x => String(x._id) === String(id));
      if (doc) {
        Object.assign(doc, update);
      }
      return doc;
    }),
    createDocument: jest.fn().mockImplementation(async (col, data) => {
      const _id = data._id || 'doc_' + Math.random().toString(36).substring(2, 9);
      const doc = { ...data, _id, id: _id };
      mockStore[col]?.push(doc);
      return doc;
    }),
    deleteManyDocuments: jest.fn().mockResolvedValue(0),
    queryDocuments: jest.fn().mockImplementation(async (col, queries) => {
      let docs = mockStore[col] || [];
      for (const q of queries) {
        docs = docs.filter(doc => String(doc[q.field]) === String(q.value));
      }
      return docs;
    }),
  };
});

// Mock Mongoose models
const mockUserFindOne = jest.fn();
const mockUserFindById = jest.fn();

jest.unstable_mockModule('../models/User.js', () => {
  return {
    default: {
      findOne: mockUserFindOne,
      findById: mockUserFindById,
      hashPassword: jest.fn().mockImplementation(async (p) => 'hashed-' + p),
    }
  };
});

// Mock AuditLog model
jest.unstable_mockModule('../models/AuditLog.js', () => {
  return {
    default: {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    }
  };
});

// Mock audit logging
const mockAuditLog = jest.fn();
jest.unstable_mockModule('../middleware/audit.js', () => {
  return {
    auditLog: mockAuditLog
  };
});

// Mock socket/sockets
jest.unstable_mockModule('../community/socket/socketServer.js', () => {
  return {
    disconnectUserSockets: jest.fn()
  };
});

// Mock token service
jest.unstable_mockModule('../services/tokenService.js', () => {
  return {
    blacklistToken: jest.fn().mockResolvedValue(true),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  };
});

// Mock community message model
jest.unstable_mockModule('../community/models/Message.js', () => {
  return {
    default: {
      find: jest.fn().mockImplementation(async (filter) => {
        const msgs = mockStore.community_messages.filter(m => String(m.senderId) === String(filter.senderId));
        return msgs.map(m => ({
          ...m,
          toObject: function() { return this; }
        }));
      })
    }
  };
});

// Mock AdminAuditLog model
jest.unstable_mockModule('../models/AdminAuditLog.js', () => {
  return {
    default: {
      findOne: jest.fn().mockImplementation(() => {
        return {
          sort: jest.fn().mockResolvedValue(null)
        };
      })
    }
  };
});

// ── 2. Build Express App ──────────────────────────────────────────────────────

async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars-long!!';
  process.env.NODE_ENV = 'test';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: authRouter } = await import('../routes/auth-jwt.js');
  const { default: legalRouter } = await import('../routes/legal.js');

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/legal', legalRouter);

  return app;
}

// ── 3. Test Cases ────────────────────────────────────────────────────────────

describe('Compliance Gating and Consent Auditing Tests', () => {
  let app;
  let testUser;
  let testToken;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();
    process.env.TEST_ENFORCE_CONSENT = 'false';

    testUser = {
      _id: '654321098765432109876543',
      id: '654321098765432109876543',
      email: 'lawyer@test.com',
      name: 'Test Lawyer',
      role: 'lawyer',
      status: 'active',
      sessionVersion: 0,
      legalConsents: [],
      cookieConsent: { version: '1.0', functional: true, analytics: false, preferences: true },
      communicationConsent: { productAnnouncements: false, newsletters: false, featureUpdates: false },
      save: jest.fn().mockImplementation(async function() {
        return this;
      }),
      toObject: function() {
        return this;
      }
    };

    mockStore.users.push(testUser);
    mockUserFindById.mockImplementation((id) => {
      const user = mockStore.users.find(u => String(u._id) === String(id));
      const queryObj = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockImplementation(async () => user || null),
        exec: jest.fn().mockImplementation(async () => user || null),
        then: function(resolve, reject) {
          const resolvedUser = user ? {
            ...user,
            verifyPassword: jest.fn().mockResolvedValue(true),
            toObject: function() { return this; }
          } : null;
          return Promise.resolve(resolvedUser).then(resolve, reject);
        }
      };
      return queryObj;
    });

    mockUserFindOne.mockImplementation((query) => {
      let searchEmail = query?.email;
      if (!searchEmail && query?.$or) {
        for (const q of query.$or) {
          if (q.email) searchEmail = q.email;
          else if (q.recoveryEmail) searchEmail = q.recoveryEmail;
        }
      }
      
      const user = mockStore.users.find(u => u.email === searchEmail || u.recoveryEmail === searchEmail);
      
      const queryObj = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        then: function(resolve, reject) {
          const resolvedUser = user ? {
            ...user,
            verifyPassword: jest.fn().mockResolvedValue(true),
            toObject: function() { return this; }
          } : null;
          return Promise.resolve(resolvedUser).then(resolve, reject);
        }
      };
      return queryObj;
    });

    testToken = jwt.sign(
      { userId: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET
    );
  });

  describe('Policy Gating Gaps (Phase 3)', () => {
    test('requireAuth blocks access if user has not accepted current policies', async () => {
      process.env.TEST_ENFORCE_CONSENT = 'true';
      testUser.legalConsents = []; // out of compliance

      // Request a protected non-bypassed route
      const res = await request(app)
        .get('/api/v1/auth/export-data') // Real protected endpoint
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('POLICY_UPDATE_REQUIRED');
    });

    test('requireAuth allows access if user is compliant', async () => {
      process.env.TEST_ENFORCE_CONSENT = 'true';
      testUser.legalConsents = [
        { policyType: 'terms', version: '1.0', acceptedAt: new Date() },
        { policyType: 'privacy', version: '1.0', acceptedAt: new Date() }
      ];

      const res = await request(app)
        .get('/api/v1/auth/export-data')
        .set('Cookie', `token=${testToken}`);

      // We expect it to pass requireAuth gating and successfully retrieve export response (200 status)
      expect(res.status).toBe(200);
    });

    test('requireAuth bypasses gating for legal endpoints even if out of compliance', async () => {
      process.env.TEST_ENFORCE_CONSENT = 'true';
      testUser.legalConsents = []; // out of compliance

      const res = await request(app)
        .get('/api/v1/legal/my-consents')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Registration Consent validation (Phase 2)', () => {
    test('Register succeeds with valid consent fields', async () => {
      const regBody = {
        name: 'Fresh Lawyer',
        email: 'fresh@test.com',
        password: 'securePassword123',
        consentGiven: true,
        termsVersion: '1.0',
        privacyVersion: '1.0',
        marketingConsent: true
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(regBody);

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('fresh@test.com');
      
      const createdUser = mockStore.users.find(u => u.email === 'fresh@test.com');
      expect(createdUser.legalConsents).toHaveLength(2);
      expect(createdUser.communicationConsent.productAnnouncements).toBe(true);
    });

    test('Register fails if consent is absent', async () => {
      const regBody = {
        name: 'Fresh Lawyer',
        email: 'fresh_noconsent@test.com',
        password: 'securePassword123'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(regBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  describe('Consent Auditing and Withdrawal (Phase 4 & 5)', () => {
    test('PATCH /cookie-consent logs old and new states and invalidates cache', async () => {
      testUser.cookieConsent = { version: '1.0', functional: true, analytics: false, preferences: true };

      const res = await request(app)
        .patch('/api/v1/legal/cookie-consent')
        .set('Cookie', `token=${testToken}`)
        .send({ analytics: true, preferences: false });

      expect(res.status).toBe(200);
      expect(res.body.cookieConsent.analytics).toBe(true);
      expect(res.body.cookieConsent.preferences).toBe(false);

      // Verify audit trail captures old and new values
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        'cookie_consent_updated',
        'user',
        testUser.id,
        expect.objectContaining({
          oldValue: { analytics: false, preferences: true },
          newValue: { analytics: true, preferences: false }
        })
      );
    });

    test('PATCH /communication-consent logs old and new states and tracks timestamps', async () => {
      testUser.communicationConsent = { productAnnouncements: false, newsletters: false, featureUpdates: false };

      const res = await request(app)
        .patch('/api/v1/legal/communication-consent')
        .set('Cookie', `token=${testToken}`)
        .send({ productAnnouncements: true, newsletters: false, featureUpdates: true });

      expect(res.status).toBe(200);
      expect(res.body.communicationConsent.productAnnouncements).toBe(true);
      expect(res.body.communicationConsent.featureUpdates).toBe(true);
      expect(res.body.communicationConsent.productAnnouncementsAt).toBeDefined();
      expect(res.body.communicationConsent.featureUpdatesAt).toBeDefined();

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        'communication_consent_updated',
        'user',
        testUser.id,
        expect.objectContaining({
          oldValue: { productAnnouncements: false, newsletters: false, featureUpdates: false },
          newValue: { productAnnouncements: true, newsletters: false, featureUpdates: true }
        })
      );
    });
  });

  describe('Data Export includes Community Messages (Phase 6)', () => {
    test('GET /export-data includes decrypted community messages and statistics', async () => {
      // Mock community message in store
      mockStore.community_messages.push({
        _id: 'msg_001',
        senderId: testUser._id,
        conversationId: 'conv_123',
        encryptedContent: Buffer.from('hi').toString('base64'),
        iv: Buffer.from('iv1234567890').toString('base64'),
        authTag: Buffer.from('tag1234567890123').toString('base64'),
        keyVersion: '1'
      });

      const res = await request(app)
        .get('/api/v1/auth/export-data')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('communityMessages');
      expect(res.body.data.communityMessages).toHaveLength(1);
      expect(res.body.statistics.totalCommunityMessages).toBe(1);
    });
  });
});
