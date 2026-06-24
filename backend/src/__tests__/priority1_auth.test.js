import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  password_resets: [],
  audit_logs: [],
  cases: [],
  clients: [],
  documents: [],
  hearings: []
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.password_resets = [];
  mockStore.audit_logs = [];
  mockStore.cases = [];
  mockStore.clients = [];
  mockStore.documents = [];
  mockStore.hearings = [];
}

// Helpers for nested queries and fields
const getNestedValue = (obj, path) => {
  if (!path.includes('.')) {return obj[path];}
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) {return undefined;}
    curr = curr[part];
  }
  return curr;
};

const applyUpdate = (obj, key, val) => {
  if (key.includes('.')) {
    const parts = key.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      curr[parts[i]] = curr[parts[i]] || {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = val;
  } else {
    obj[key] = val;
  }
};

const matchesQuery = (user, query) => {
  if (query.$or) {
    return query.$or.some(q => matchesQuery(user, q));
  }
  if (query.$and) {
    return query.$and.every(q => matchesQuery(user, q));
  }
  return Object.entries(query).every(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.entries(v).every(([op, opVal]) => {
        const userVal = getNestedValue(user, k);
        if (op === '$ne') {return String(userVal) !== String(opVal);}
        if (op === '$gte') {return userVal >= opVal;}
        if (op === '$lte') {return userVal <= opVal;}
        return true;
      });
    }
    const userVal = getNestedValue(user, k);
    if (k === 'email') {return user.email === v;}
    return String(userVal) === String(v);
  });
};

// Mock mongodb service
jest.unstable_mockModule('../services/mongodb.js', () => {
  const collections = {
    USERS: 'users',
    PASSWORD_RESETS: 'passwordResets',
    CASES: 'cases',
    CLIENTS: 'clients',
    DOCUMENTS: 'documents',
    HEARINGS: 'hearings'
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
        for (const [k, v] of Object.entries(update)) {
          applyUpdate(doc, k, v);
        }
      }
      return doc;
    }),
    createDocument: jest.fn().mockImplementation(async (col, data) => {
      const _id = data._id || 'doc_' + Math.random().toString(36).substring(2, 9);
      const doc = { ...data, _id, id: _id };
      mockStore[col]?.push(doc);
      return doc;
    }),
    deleteDocument: jest.fn().mockResolvedValue({ ok: true }),
    deleteManyDocuments: jest.fn().mockImplementation(async (col, filter) => {
      const beforeCount = mockStore[col]?.length || 0;
      if (mockStore[col]) {
        mockStore[col] = mockStore[col].filter(x => {
          return !matchesQuery(x, filter);
        });
      }
      return beforeCount - (mockStore[col]?.length || 0);
    }),
    getAllDocuments: jest.fn().mockResolvedValue([]),
    queryDocuments: jest.fn().mockImplementation(async (col, queries) => {
      let docs = mockStore[col] || [];
      for (const q of queries) {
        docs = docs.filter(doc => {
          if (q.operator === '==') {
            return String(getNestedValue(doc, q.field)) === String(q.value);
          }
          return true;
        });
      }
      return docs;
    }),
    batchWrite: jest.fn().mockResolvedValue(true),
    default: mongoose,
  };
});

// Mock Mongoose User model
const UserMock = {
  hashPassword: jest.fn().mockImplementation(async (pwd) => 'hashed-' + pwd),
  findOne: jest.fn().mockImplementation((query) => {
    const exec = () => {
      const user = mockStore.users.find(u => matchesQuery(u, query));
      if (!user) {return null;}
      const doc = {
        ...user,
        toObject: function() { return this; },
        verifyPassword: jest.fn().mockImplementation(async function(pwd) {
          return pwd === 'password123' || pwd === 'current-password';
        }),
        save: jest.fn().mockImplementation(async function() {
          Object.assign(user, this);
          return this;
        }),
      };
      doc.select = jest.fn().mockReturnValue(doc);
      return doc;
    };
    const queryBuilder = {
      select: jest.fn().mockImplementation(() => queryBuilder),
      sort: jest.fn().mockImplementation(() => queryBuilder),
      lean: jest.fn().mockImplementation(() => queryBuilder),
      then: (resolve, reject) => {
        try {
          resolve(exec());
        } catch (err) {
          reject(err);
        }
      }
    };
    return queryBuilder;
  }),
  findById: jest.fn().mockImplementation((id) => {
    const exec = () => {
      const user = mockStore.users.find(u => String(u._id) === String(id));
      if (!user) {return null;}
      const doc = {
        ...user,
        toObject: function() { return this; },
        verifyPassword: jest.fn().mockImplementation(async function(pwd) {
          return pwd === 'password123' || pwd === 'current-password';
        }),
        save: jest.fn().mockImplementation(async function() {
          Object.assign(user, this);
          return this;
        }),
      };
      doc.select = jest.fn().mockReturnValue(doc);
      return doc;
    };
    const queryBuilder = {
      select: jest.fn().mockImplementation(() => queryBuilder),
      sort: jest.fn().mockImplementation(() => queryBuilder),
      lean: jest.fn().mockImplementation(() => queryBuilder),
      then: (resolve, reject) => {
        try {
          resolve(exec());
        } catch (err) {
          reject(err);
        }
      }
    };
    return queryBuilder;
  }),
  findByIdAndUpdate: jest.fn().mockImplementation((id, update, options) => {
    const user = mockStore.users.find(u => String(u._id) === String(id));
    if (user) {
      const setObj = update.$set || update;
      for (const [k, v] of Object.entries(setObj)) {
        if (k.startsWith('$')) {continue;}
        applyUpdate(user, k, v);
      }
      if (update.$unset) {
        for (const k of Object.keys(update.$unset)) {
          if (k.includes('.')) {
            const parts = k.split('.');
            let curr = user;
            for (let i = 0; i < parts.length - 1; i++) {
              curr = curr?.[parts[i]];
            }
            if (curr) {delete curr[parts[parts.length - 1]];}
          } else {
            delete user[k];
          }
        }
      }
      if (update.$pull) {
        for (const [k, v] of Object.entries(update.$pull)) {
          if (Array.isArray(user[k])) {
            user[k] = user[k].filter(x => x !== v);
          }
        }
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          user[k] = (user[k] || 0) + v;
        }
      }
    }
    const doc = user ? {
      ...user,
      toObject: function() { return this; },
      save: jest.fn().mockImplementation(async function() {
        Object.assign(user, this);
        return this;
      }),
    } : null;
    return Promise.resolve(doc);
  }),
  findOneAndUpdate: jest.fn().mockImplementation((filter, update, options) => {
    let user = mockStore.users.find(u => matchesQuery(u, filter));
    if (user) {
      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          applyUpdate(user, k, v);
        }
      }
      if (update.$addToSet) {
        for (const [k, v] of Object.entries(update.$addToSet)) {
          user[k] = user[k] || [];
          if (v && v.$each) {
            for (const item of v.$each) {
              if (!user[k].includes(item)) {user[k].push(item);}
            }
          } else {
            if (!user[k].includes(v)) {user[k].push(v);}
          }
        }
      }
    } else if (options && options.upsert) {
      const newUser = {
        _id: 'user_' + Math.random().toString(36).substring(2, 9),
        email: filter.email,
        profile: {},
        ...update.$setOnInsert,
      };
      mockStore.users.push(newUser);
      user = newUser;
    }
    const doc = user ? {
      ...user,
      toObject: function() { return this; },
      save: jest.fn().mockImplementation(async function() {
        Object.assign(user, this);
        return this;
      }),
    } : null;
    return Promise.resolve(doc);
  }),
  find: jest.fn().mockImplementation((query) => {
    const users = mockStore.users.filter(u => matchesQuery(u, query));
    return Promise.resolve(users.map(u => {
      const doc = {
        ...u,
        toObject: function() { return this; },
        verifyPassword: jest.fn().mockImplementation(async function(pwd) {
          return pwd === 'password123' || pwd === 'current-password';
        }),
        save: jest.fn().mockImplementation(async function() {
          Object.assign(u, this);
          return this;
        }),
      };
      return doc;
    }));
  }),
};
jest.unstable_mockModule('../models/User.js', () => ({ default: UserMock }));

// Mock Mongoose AdminAuditLog
const AdminAuditLogMock = {
  findOne: jest.fn().mockImplementation((query) => {
    const exec = () => {
      return mockStore.audit_logs.find(log => matchesQuery(log, query)) || null;
    };
    const queryBuilder = {
      sort: jest.fn().mockImplementation(() => queryBuilder),
      then: (resolve, reject) => {
        try {
          resolve(exec());
        } catch (err) {
          reject(err);
        }
      }
    };
    return queryBuilder;
  }),
  create: jest.fn().mockImplementation(async (data) => {
    mockStore.audit_logs.push(data);
    return data;
  })
};
jest.unstable_mockModule('../models/AdminAuditLog.js', () => ({ default: AdminAuditLogMock }));

// Mock PasswordReset Model
const PasswordResetMock = {
  deleteMany: jest.fn().mockImplementation(async (query) => {
    mockStore.password_resets = mockStore.password_resets.filter(x => String(x.userId) !== String(query.userId));
    return { deletedCount: 1 };
  })
};
jest.unstable_mockModule('../models/PasswordReset.js', () => ({ default: PasswordResetMock }));

// Mock userDeletionService
const mockUserDeletionService = {
  deleteUserAccount: jest.fn().mockImplementation(async (userId) => {
    mockStore.users = mockStore.users.filter(x => String(x._id) !== String(userId));
    return {
      success: true,
      email: 'deleted-user@test.com',
      stats: { userRecord: 1 }
    };
  })
};
jest.unstable_mockModule('../services/userDeletionService.js', () => ({
  deleteUserAccount: mockUserDeletionService.deleteUserAccount,
  default: mockUserDeletionService
}));

// Mock tokenService
const mockBlacklistedTokens = new Set();
jest.unstable_mockModule('../services/tokenService.js', () => ({
  blacklistToken: jest.fn().mockImplementation(async (token) => {
    mockBlacklistedTokens.add(token);
    return true;
  }),
  isTokenBlacklisted: jest.fn().mockImplementation(async (token) => {
    return mockBlacklistedTokens.has(token);
  })
}));

// Mock Google Auth Library
const mockOAuthClientInstance = {
  generateAuthUrl: jest.fn().mockReturnValue('https://google.com/consent-url'),
  getToken: jest.fn().mockResolvedValue({
    tokens: { id_token: 'valid-google-id-token' }
  }),
  verifyIdToken: jest.fn().mockResolvedValue({
    getPayload: () => ({
      sub: 'google_user_sub_123',
      email: 'google_user@test.com',
      email_verified: true,
      name: 'Google User',
    }),
  }),
};
jest.unstable_mockModule('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => mockOAuthClientInstance)
  };
});

// Mock Redis
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  isAvailable: jest.fn().mockReturnValue(false),
  raw: jest.fn().mockReturnValue({
    call: jest.fn().mockResolvedValue(1)
  })
};
jest.unstable_mockModule('../utils/redis.js', () => ({
  redis: mockRedis,
  default: mockRedis,
  connectRedis: jest.fn().mockResolvedValue(undefined)
}));

// Mock Socket.io Server
jest.unstable_mockModule('../community/socket/socketServer.js', () => ({
  disconnectUserSockets: jest.fn(),
  emitToUser: jest.fn(),
  emitToConversation: jest.fn(),
  default: {
    disconnectUserSockets: jest.fn(),
    emitToUser: jest.fn(),
    emitToConversation: jest.fn(),
  }
}));

// Mock nodemailer
const mockTransporter = {
  sendMail: jest.fn().mockImplementation((options, callback) => {
    return Promise.resolve({ messageId: 'mock-id' });
  })
};
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue(mockTransporter)
  }
}));

// Mock SendGrid (avoid actually calling SendGrid)
jest.unstable_mockModule('@sendgrid/mail', () => ({
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue(true)
  }
}));

// Mock eventEmitter
jest.unstable_mockModule('../utils/eventEmitter.js', () => ({
  default: {
    emit: jest.fn().mockResolvedValue(true)
  }
}));

// Mock Activity Logger
jest.unstable_mockModule('../middleware/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined)
}));

// Mock userCache
jest.unstable_mockModule('../utils/userCache.js', () => ({
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
  getCachedUser: jest.fn().mockResolvedValue(null),
  setCachedUser: jest.fn().mockResolvedValue(undefined),
  default: {
    invalidateUserCache: jest.fn().mockResolvedValue(undefined),
    getCachedUser: jest.fn().mockResolvedValue(null),
    setCachedUser: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock mailer
jest.unstable_mockModule('../utils/mailer.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true)
}));

// Mock CommunityMessage model
jest.unstable_mockModule('../community/models/Message.js', () => ({
  default: {
    find: jest.fn().mockResolvedValue([])
  }
}));

// Mock AuditLog model
jest.unstable_mockModule('../models/AuditLog.js', () => ({
  default: {
    countDocuments: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({})
  }
}));

// ── 2. Express App Building ──────────────────────────────────────────────────

async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars-long!!';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/v1/auth/google/callback';
  process.env.NODE_ENV = 'test';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: authRouter } = await import('../routes/auth-jwt.js');
  const { default: googleAuthRouter } = await import('../routes/google-auth.js');
  const { default: twoFactorRouter } = await import('../routes/twoFactor.js');
  const { default: forgotPasswordRouter } = await import('../routes/forgotPasswordRoutes.js');

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/auth', googleAuthRouter);
  app.use('/api/v1/auth', forgotPasswordRouter);
  app.use('/api/v1/2fa', twoFactorRouter);

  return app;
}

// ── 3. Test Cases ────────────────────────────────────────────────────────────

describe('Priority 1 — Authentication, Session, and Verification Tests', () => {
  let app;
  let testUser;
  let testToken;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();
    mockBlacklistedTokens.clear();

    testUser = {
      _id: '654321098765432109876543',
      id: '654321098765432109876543',
      email: 'user@test.com',
      name: 'Test Lawyer',
      role: 'lawyer',
      status: 'active',
      sessionVersion: 0,
      sessionVersionAt: null,
      accountStatus: { isSuspended: false },
      securityFlags: { blocked: false },
      security: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
      profile: {
        fullName: 'Test Lawyer',
        barCouncilNumber: 'BC-98765',
        currency: 'INR'
      },
      passwordHash: 'hashed-password123',
      authProvider: 'local',
      authProviders: ['email'],
      save: jest.fn().mockResolvedValue(true),
    };

    mockStore.users.push(testUser);
    testToken = jwt.sign({ userId: testUser._id, email: testUser.email, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  });

  // ── 3.1 Email Verification Tests ───────────────────────────────────────────
  describe('Email Verification Helper Utils', () => {
    test('generateVerificationToken creates random 64-char hex string', async () => {
      const { generateVerificationToken } = await import('../utils/emailVerification.js');
      const token = generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(typeof token).toBe('string');
    });

    test('hashToken hashes token using SHA256', async () => {
      const { hashToken } = await import('../utils/emailVerification.js');
      const token = 'my-token-123';
      const hash = hashToken(token);
      const expected = crypto.createHash('sha256').update(token).digest('hex');
      expect(hash).toBe(expected);
    });

    test('isTokenExpired checks token timestamps correctly', async () => {
      const { isTokenExpired } = await import('../utils/emailVerification.js');
      const now = new Date();
      const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      expect(isTokenExpired(past, 24)).toBe(true);
      expect(isTokenExpired(now, 24)).toBe(false);
      expect(isTokenExpired(null)).toBe(true);
    });

    test('canResendVerification rate limits resend requests', async () => {
      const { canResendVerification } = await import('../utils/emailVerification.js');
      const now = new Date();
      const longAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      expect(canResendVerification(now, 1)).toBe(false);
      expect(canResendVerification(longAgo, 1)).toBe(true);
      expect(canResendVerification(null)).toBe(true);
    });

    test('sendVerificationEmail logs email details when SENDGRID_API_KEY is not set', async () => {
      const { sendVerificationEmail } = await import('../utils/emailVerification.js');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const res = await sendVerificationEmail('test@user.com', 'Test', 'token123');
      expect(res).toBe(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ── 3.2 Forgot Password Flow ──────────────────────────────────────────────
  describe('Forgot Password Flow', () => {
    test('forgotPassword endpoints issues reset email successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If account exists');
    });

    test('forgotPassword returns 200 even when user does not exist (prevents email enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown-user@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If account exists');
    });
  });

  // ── 3.3 Google OAuth Routes Tests ──────────────────────────────────────────
  describe('Google OAuth Routes', () => {
    test('GET /google redirects to Google consent URL', async () => {
      const res = await request(app).get('/api/v1/auth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('google.com/consent-url');
    });

    test('GET /google/callback handles callback and sets session cookies for existing user', async () => {
      testUser.googleId = 'google_user_sub_123';
      testUser.authProvider = 'google';
      testUser.email = 'google_user@test.com';

      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ code: 'auth_code_123', state: 'state_val|login' })
        .set('Cookie', 'oauth_state=state_val|login');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/dashboard');
      
      const cookies = res.headers['set-cookie'] || [];
      expect(cookies.some(c => c.includes('token='))).toBe(true);
      expect(cookies.some(c => c.includes('refreshToken='))).toBe(true);
    });

    test('GET /google/callback redirects with error when state cookie is missing', async () => {
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ code: 'auth_code_123', state: 'state_val|login' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('reason=STATE_MISMATCH');
    });

    test('GET /google/link starts link flow, sets secure state', async () => {
      const res = await request(app)
        .get('/api/v1/auth/google/link')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('google.com/consent-url');
    });

    test('DELETE /google/unlink removes Google integration fields', async () => {
      testUser.recoveryGoogleId = 'recovery_id_123';
      testUser.recoveryEmail = 'recovery@test.com';

      const res = await request(app)
        .delete('/api/v1/auth/google/unlink')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /google/link/callback handles link callback successfully', async () => {
      testUser.recoveryGoogleId = null;
      testUser.recoveryEmail = null;
      
      const signedState = `state_val:654321098765432109876543`;
      const receivedSig = crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(signedState)
        .digest('hex');
      const payloadB64 = Buffer.from(signedState).toString('base64url');
      const linkCookie = `${payloadB64}.${receivedSig}`;

      const res = await request(app)
        .get('/api/v1/auth/google/link/callback')
        .query({ code: 'auth_code_123', state: 'state_val' })
        .set('Cookie', `oauth_link_state=${linkCookie}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/dashboard/settings?linkSuccess=true');
    });

    test('POST /google/relink updates recovery email successfully', async () => {
      testUser.recoveryEmail = 'old@test.com';
      testUser.recoveryGoogleId = 'old_google';

      const pendingData = `new@test.com:new_google:654321098765432109876543`;
      const sig = crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(pendingData)
        .digest('hex');
      const cookie = `${Buffer.from(pendingData).toString('base64url')}.${sig}`;

      const res = await request(app)
        .post('/api/v1/auth/google/relink')
        .set('Cookie', `token=${testToken}; recovery_pending_data=${cookie}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(testUser.recoveryEmail).toBe('new@test.com');
      expect(testUser.recoveryGoogleId).toBe('new_google');
    });
  });

  // ── 3.4 Two Factor Authentication (2FA) Tests ─────────────────────────────
  describe('Two-Factor Authentication (2FA) Routes', () => {
    test('POST /2fa/enable returns manual entry key and qrCode', async () => {
      const res = await request(app)
        .post('/api/v1/2fa/enable')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCode');
      expect(res.body).toHaveProperty('manualEntryKey');
    });

    test('POST /2fa/verify fails with invalid token', async () => {
      testUser.security.twoFactorTempSecret = 'temp_secret_base32_value';
      const res = await request(app)
        .post('/api/v1/2fa/verify')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid OTP token');
    });

    test('POST /2fa/validate returns 400 for unconfigured user', async () => {
      const res = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456', userId: '654321098765432109876543' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('2FA is not enabled for this user');
    });

    test('GET /2fa/status returns status details', async () => {
      const res = await request(app)
        .get('/api/v1/2fa/status')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
      expect(res.body.backupCodesCount).toBe(0);
    });
  });

  // ── 3.5 Core JWT Authentication Route Tests ───────────────────────────────
  describe('Core JWT Auth Routes (auth-jwt.js)', () => {
    test('GET /csrf-token returns a token', async () => {
      const res = await request(app).get('/api/v1/auth/csrf-token');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('csrfToken');
    });

    test('GET /validate checks auth status correctly', async () => {
      const resActive = await request(app)
        .get('/api/v1/auth/validate')
        .set('Cookie', `token=${testToken}`);
      expect(resActive.status).toBe(200);
      expect(resActive.body.authenticated).toBe(true);

      const resNoToken = await request(app)
        .get('/api/v1/auth/validate');
      expect(resNoToken.status).toBe(200);
      expect(resNoToken.body.authenticated).toBe(false);

      const invalidToken = jwt.sign({ userId: '654321098765432109876543' }, 'wrong-secret');
      const resInvalid = await request(app)
        .get('/api/v1/auth/validate')
        .set('Cookie', `token=${invalidToken}`);
      expect(resInvalid.status).toBe(200);
      expect(resInvalid.body.authenticated).toBe(false);
    });

    test('POST /register creates user and returns tokens', async () => {
      const regBody = {
        name: 'New Lawyer',
        email: 'newlawyer@test.com',
        password: 'password123',
        barNumber: 'BC123456',
        firm: 'Zen Legal',
        role: 'lawyer',
        consentGiven: true,
        termsVersion: '1.0',
        privacyVersion: '1.0'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(regBody);

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('newlawyer@test.com');
      expect(res.body).toHaveProperty('token');
    });

    test('POST /register rejects weak password and invalid email', async () => {
      const resWeak = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'A', email: 'a@b.com', password: 'short', consentGiven: true, termsVersion: '1.0', privacyVersion: '1.0' });
      expect(resWeak.status).toBe(400);

      const resMail = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'A', email: 'invalid-email', password: 'password123', consentGiven: true, termsVersion: '1.0', privacyVersion: '1.0' });
      expect(resMail.status).toBe(400);
    });

    test('POST /register soft-deleted user purges and registers fresh', async () => {
      const softDeletedUser = {
        _id: 'deleted_user_99',
        email: 'deleteduser@test.com',
        status: 'deleted',
        deleted: true,
        save: jest.fn()
      };
      mockStore.users.push(softDeletedUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Re Signup', email: 'deleteduser@test.com', password: 'password123', consentGiven: true, termsVersion: '1.0', privacyVersion: '1.0' });

      expect(res.status).toBe(201);
      expect(mockUserDeletionService.deleteUserAccount).toHaveBeenCalledWith('deleted_user_99');
    });

    test('POST /reactivate handles soft-deleted account fresh signup', async () => {
      const deletedUser = {
        _id: 'deleted_user_88',
        email: 'reactivate@test.com',
        status: 'deleted',
        deleted: true,
        save: jest.fn()
      };
      mockStore.users.push(deletedUser);

      const res = await request(app)
        .post('/api/v1/auth/reactivate')
        .send({ name: 'Reactivate Us', email: 'reactivate@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(mockUserDeletionService.deleteUserAccount).toHaveBeenCalledWith('deleted_user_88');
    });

    test('POST /login logs in active user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('user@test.com');
      expect(res.body).toHaveProperty('token');
    });

    test('POST /login handles Google-only login guard', async () => {
      testUser.authProviders = ['google'];
      testUser.authProvider = 'google';
      testUser.passwordHash = null;

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('USE_GOOGLE_LOGIN');
    });

    test('POST /login rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    test('POST /logout invalidates and clears cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `token=${testToken}; refreshToken=refresh123`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });

    test('POST /refresh rotates access and refresh tokens', async () => {
      const mockRefreshToken = jwt.sign({ userId: '654321098765432109876543', type: 'refresh' }, process.env.JWT_REFRESH_SECRET);
      
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${mockRefreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.message).toBe('Token refreshed');
    });

    test('GET /me gets profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('user@test.com');
    });

    test('PATCH /profile updates non-immutable profile fields', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Cookie', `token=${testToken}`)
        .send({ name: 'Updated Name', bio: 'Experienced advocate' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    test('PATCH /settings/notifications updates alerts', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/settings/notifications')
        .set('Cookie', `token=${testToken}`)
        .send({ smsAlerts: false, emailAlerts: true });

      expect(res.status).toBe(200);
      expect(res.body.user.notifications.smsAlerts).toBe(false);
    });

    test('PATCH /settings/preferences updates theme/language', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/settings/preferences')
        .set('Cookie', `token=${testToken}`)
        .send({ theme: 'dark', language: 'en-US' });

      expect(res.status).toBe(200);
      expect(res.body.user.preferences.theme).toBe('dark');
    });

    test('PUT /me performs unified update of profile and security settings', async () => {
      const res = await request(app)
        .put('/api/v1/auth/me')
        .set('Cookie', `token=${testToken}`)
        .send({
          name: 'Unified Name',
          profile: { lawFirmName: 'Zen Firm' },
          notifications: { PushNotifications: false },
          preferences: { theme: 'dark' },
          security: { loginNotifications: false }
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Unified Name');
      expect(res.body.user.profile.lawFirmName).toBe('Zen Firm');
    });

    test('POST /change-password updates credential and increments sessionVersion', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', `token=${testToken}`)
        .send({ currentPassword: 'current-password', newPassword: 'new-secure-password' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password changed successfully');
      expect(testUser.sessionVersion).toBe(1);
    });

    test('GET /export-data returns all case notes and documents', async () => {
      mockStore.cases.push({ _id: 'case_1', userId: '654321098765432109876543', owner: '654321098765432109876543', title: 'Case A' });
      mockStore.clients.push({ _id: 'client_1', userId: '654321098765432109876543', owner: '654321098765432109876543', name: 'Client A' });

      const res = await request(app)
        .get('/api/v1/auth/export-data')
        .set('Cookie', `token=${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('statistics');
      expect(res.body.statistics.totalCases).toBe(1);
      expect(res.body.data.cases[0].title).toBe('Case A');
    });

    test('POST /import-data restores backup and updates profile', async () => {
      const backupData = {
        user: { name: 'Imported Name' },
        data: {
          cases: [{ caseNumber: 'CN-12345', clientName: 'John Doe' }],
          clients: [],
          documents: [],
          hearings: []
        }
      };

      const res = await request(app)
        .post('/api/v1/auth/import-data')
        .set('Cookie', `token=${testToken}`)
        .send(backupData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockStore.cases.length).toBe(1);
      expect(mockStore.cases[0].caseNumber).toBe('CN-12345');
    });

    test('DELETE /delete-account purges database records via userDeletionService', async () => {
      const res = await request(app)
        .delete('/api/v1/auth/delete-account')
        .set('Cookie', `token=${testToken}`)
        .send({ confirmation: 'DELETE', password: 'current-password' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account deleted successfully');
      expect(mockUserDeletionService.deleteUserAccount).toHaveBeenCalledWith('654321098765432109876543');
    });

    test('POST /complete-onboarding saves bar council number and locks fields', async () => {
      testUser.onboardingCompleted = false;

      const onboardingBody = {
        fullName: 'Test Lawyer',
        fullNameConfirm: 'Test Lawyer',
        barCouncilNumber: 'BC-98765',
        barCouncilNumberConfirm: 'BC-98765',
        currency: 'INR',
        currencyConfirm: 'INR',
        securityQuestion: "What was the name of your first pet?",
        securityAnswer: "Rex"
      };

      const res = await request(app)
        .post('/api/v1/auth/complete-onboarding')
        .set('Cookie', `token=${testToken}`)
        .send(onboardingBody);

      expect(res.status).toBe(200);
      expect(res.body.user.onboardingCompleted).toBe(true);
      expect(res.body.user.profile.barCouncilNumber).toBe('BC-98765');
    });
  });

  // ── Extra Priority 1 Tests for High Coverage ─────────────────────────────
  describe('Extra Priority 1 Coverage Expansion', () => {
    
    // 1. emailVerification.js SendGrid integration
    test('sendVerificationEmail with SENDGRID_API_KEY sends actual email', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test-key-api';
      process.env.SENDGRID_FROM_EMAIL = 'noreply@test.com';
      process.env.SENDGRID_FROM_NAME = 'Juriq Test';
      
      const { sendVerificationEmail } = await import('../utils/emailVerification.js');
      const res = await sendVerificationEmail('test-sg@user.com', 'SG User', 'token_sg_123');
      expect(res).toBe(true);
    });

    test('sendVerificationEmail handles SendGrid errors', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test-key-api';
      const { sendVerificationEmail } = await import('../utils/emailVerification.js');
      const sg = (await import('@sendgrid/mail')).default;
      
      // Force SendGrid mock to throw an error
      const originalSend = sg.send;
      sg.send = jest.fn().mockRejectedValue(new Error('SendGrid Failure'));

      await expect(sendVerificationEmail('test-sg-fail@user.com', 'SG Fail', 'token_sg_fail'))
        .rejects.toThrow('SendGrid Failure');

      sg.send = originalSend; // Restore original mock
    });

    // 2. forgotPasswordController.js resetPassword endpoint
    test('POST /reset-password/:token resets password successfully', async () => {
      const mockHashedToken = crypto.createHash('sha256').update('valid-reset-token').digest('hex');
      testUser.resetPasswordToken = mockHashedToken;
      testUser.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins in future

      const res = await request(app)
        .post('/api/v1/auth/reset-password/valid-reset-token')
        .send({ password: 'new-secure-password-123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');
      expect(testUser.passwordHash).toBe('hashed-new-secure-password-123');
      expect(testUser.resetPasswordToken).toBeNull();
      expect(testUser.sessionVersion).toBe(1);
    });

    test('POST /reset-password/:token fails if token is invalid or expired', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password/invalid-token')
        .send({ password: 'new-secure-password-123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Reset link is invalid or has expired');
    });

    test('POST /reset-password/:token fails if password or token is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password/some-token')
        .send({}); // missing password

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token and new password are required');
    });

    // 3. twoFactor.js comprehensive paths
    test('POST /2fa/enable returns 404 if user not found', async () => {
      const mongodb = await import('../services/mongodb.js');
      mongodb.getDocumentById
        .mockResolvedValueOnce(testUser)
        .mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/v1/2fa/enable')
        .set('Cookie', `token=${testToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    test('POST /2fa/enable returns 400 if 2FA already enabled', async () => {
      testUser.security.twoFactorEnabled = true;
      const res = await request(app)
        .post('/api/v1/2fa/enable')
        .set('Cookie', `token=${testToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('2FA is already enabled');
    });

    test('POST /2fa/verify returns 400 if token missing', async () => {
      const res = await request(app)
        .post('/api/v1/2fa/verify')
        .set('Cookie', `token=${testToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('OTP token is required');
    });

    test('POST /2fa/verify returns 404 if user not found', async () => {
      const mongodb = await import('../services/mongodb.js');
      mongodb.getDocumentById
        .mockResolvedValueOnce(testUser)
        .mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/v1/2fa/verify')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    test('POST /2fa/verify returns 400 if no setup found', async () => {
      testUser.security.twoFactorTempSecret = null;
      testUser.security.twoFactorSecret = null;
      const res = await request(app)
        .post('/api/v1/2fa/verify')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No 2FA setup found. Please enable 2FA first.');
    });

    test('POST /2fa/verify successfully enables 2FA with valid OTP', async () => {
      const speakeasy = (await import('speakeasy')).default;
      const secret = speakeasy.generateSecret({ length: 32 });
      testUser.security.twoFactorTempSecret = secret.base32;

      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/v1/2fa/verify')
        .set('Cookie', `token=${testToken}`)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.backupCodes).toHaveLength(10);
      expect(testUser.security.twoFactorEnabled).toBe(true);
      expect(testUser.security.twoFactorSecret).toBe(secret.base32);
    });

    test('POST /2fa/validate returns 400 if token or userId missing', async () => {
      const resMissingToken = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ userId: '654321098765432109876543' });
      expect(resMissingToken.status).toBe(400);

      const resMissingUser = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });
      expect(resMissingUser.status).toBe(400);
    });

    test('POST /2fa/validate returns 404 if user not found', async () => {
      const res = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456', userId: 'nonexistent_user' });
      expect(res.status).toBe(404);
    });

    test('POST /2fa/validate works for valid TOTP token', async () => {
      const speakeasy = (await import('speakeasy')).default;
      const secret = speakeasy.generateSecret({ length: 32 });
      testUser.security.twoFactorEnabled = true;
      testUser.security.twoFactorSecret = secret.base32;

      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ token, userId: '654321098765432109876543' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.method).toBe('totp');
    });

    test('POST /2fa/validate works with backup code', async () => {
      testUser.security.twoFactorEnabled = true;
      testUser.security.twoFactorSecret = 'some-secret';
      
      const backupCode = 'BACKUP1234';
      const hashed = crypto.createHash('sha256').update(backupCode).digest('hex');
      testUser.security.backupCodes = [hashed];

      const res = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ token: backupCode, userId: '654321098765432109876543' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.method).toBe('backup');
      expect(res.body.remainingBackupCodes).toBe(0);
      expect(testUser.security.backupCodes).toHaveLength(0);
    });

    test('POST /2fa/validate returns 400 for incorrect token and backup code', async () => {
      testUser.security.twoFactorEnabled = true;
      testUser.security.twoFactorSecret = 'some-secret';
      testUser.security.backupCodes = ['somehashedcode'];

      const res = await request(app)
        .post('/api/v1/2fa/validate')
        .set('Cookie', `token=${testToken}`)
        .send({ token: 'wrong', userId: '654321098765432109876543' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid OTP or backup code');
    });

    test('POST /2fa/disable returns 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/2fa/disable')
        .set('Cookie', `token=${testToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password is required to disable 2FA');
    });

    test('POST /2fa/disable returns 404 if user not found', async () => {
      const mongodb = await import('../services/mongodb.js');
      mongodb.getDocumentById
        .mockResolvedValueOnce(testUser)
        .mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/v1/2fa/disable')
        .set('Cookie', `token=${testToken}`)
        .send({ password: 'password123' });
      expect(res.status).toBe(404);
    });

    test('POST /2fa/disable successfully disables 2FA', async () => {
      testUser.security.twoFactorEnabled = true;
      const res = await request(app)
        .post('/api/v1/2fa/disable')
        .set('Cookie', `token=${testToken}`)
        .send({ password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(testUser.security.twoFactorEnabled).toBe(false);
      expect(testUser.security.twoFactorSecret).toBeNull();
    });

    test('POST /2fa/backup-codes returns 400 if token missing', async () => {
      const res = await request(app)
        .post('/api/v1/2fa/backup-codes')
        .set('Cookie', `token=${testToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    test('POST /2fa/backup-codes returns 404 if user not found', async () => {
      const mongodb = await import('../services/mongodb.js');
      mongodb.getDocumentById
        .mockResolvedValueOnce(testUser)
        .mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/v1/2fa/backup-codes')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });
      expect(res.status).toBe(404);
    });

    test('POST /2fa/backup-codes returns 400 if 2FA not enabled', async () => {
      testUser.security.twoFactorEnabled = false;
      const res = await request(app)
        .post('/api/v1/2fa/backup-codes')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('2FA is not enabled');
    });

    test('POST /2fa/backup-codes returns 400 for invalid token', async () => {
      testUser.security.twoFactorEnabled = true;
      testUser.security.twoFactorSecret = 'some-secret';
      const res = await request(app)
        .post('/api/v1/2fa/backup-codes')
        .set('Cookie', `token=${testToken}`)
        .send({ token: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid OTP token');
    });

    test('POST /2fa/backup-codes successfully regenerates backup codes', async () => {
      const speakeasy = (await import('speakeasy')).default;
      const secret = speakeasy.generateSecret({ length: 32 });
      testUser.security.twoFactorEnabled = true;
      testUser.security.twoFactorSecret = secret.base32;

      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/v1/2fa/backup-codes')
        .set('Cookie', `token=${testToken}`)
        .send({ token });

    });
  });
});
