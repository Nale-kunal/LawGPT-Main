import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// ── Step 1: Mock State & Store ───────────────────────────────────────────────
const mockStore = {
  users: [],
  clients: [],
  cases: [],
  documents: [],
  folders: [],
  hearings: [],
  casenotes: [],
  alerts: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.clients = [];
  mockStore.cases = [];
  mockStore.documents = [];
  mockStore.folders = [];
  mockStore.hearings = [];
  mockStore.casenotes = [];
  mockStore.alerts = [];
}

// ── Step 2: Register Mocks BEFORE any dynamic imports ──────────────────────────
jest.unstable_mockModule('../services/mongodb.js', () => {
  const mockMongodb = {
    MODELS: {
      USERS: 'users',
      CLIENTS: 'clients',
      CASES: 'cases',
      DOCUMENTS: 'documents',
      FOLDERS: 'folders',
      HEARINGS: 'hearings',
      ALERTS: 'alerts',
      PASSWORD_RESETS: 'password_resets',
    },
    COLLECTIONS: {
      USERS: 'users',
      CLIENTS: 'clients',
      CASES: 'cases',
      DOCUMENTS: 'documents',
      FOLDERS: 'folders',
      HEARINGS: 'hearings',
      ALERTS: 'alerts',
      PASSWORD_RESETS: 'password_resets',
    },
    createDocument: jest.fn().mockImplementation(async (collection, data) => {
      const id = new mongoose.Types.ObjectId().toString();
      const doc = { ...data, _id: id, id };
      mockStore[collection]?.push(doc);
      return doc;
    }),
    getDocumentById: jest.fn().mockImplementation(async (collection, id) => {
      return mockStore[collection]?.find(d => String(d._id) === String(id) || String(d.id) === String(id)) || null;
    }),
    updateDocument: jest.fn().mockImplementation(async (collection, id, updates) => {
      const doc = mockStore[collection]?.find(d => String(d._id) === String(id) || String(d.id) === String(id));
      if (doc) {
        Object.assign(doc, updates);
      }
      return doc;
    }),
    deleteDocument: jest.fn().mockImplementation(async (collection, id) => {
      const index = mockStore[collection]?.findIndex(d => String(d._id) === String(id) || String(d.id) === String(id));
      if (index !== -1 && index !== undefined) {
        mockStore[collection].splice(index, 1);
      }
      return { ok: true };
    }),
    deleteManyDocuments: jest.fn().mockImplementation(async (collection, filter) => {
      let count = 0;
      if (mockStore[collection]) {
        const initialLen = mockStore[collection].length;
        mockStore[collection] = mockStore[collection].filter(d => {
          for (const [k, v] of Object.entries(filter)) {
            if (String(d[k]) === String(v)) {return false;}
          }
          return true;
        });
        count = initialLen - mockStore[collection].length;
      }
      return count;
    }),
    getAllDocuments: jest.fn().mockImplementation(async (collection, orderBy) => {
      return mockStore[collection] || [];
    }),
    batchWrite: jest.fn().mockResolvedValue(true),
    queryDocuments: jest.fn().mockImplementation(async (collection, filters) => {
      let list = mockStore[collection] || [];
      if (filters) {
        for (const filter of filters) {
          const { field, operator, value } = filter;
          if (operator === '==') {
            list = list.filter(item => String(item[field]) === String(value));
          }
        }
      }
      return list;
    }),
  };

  return {
    ...mockMongodb,
    default: mongoose,
  };
});

const UserMock = {
  findById: jest.fn().mockImplementation((id) => {
    const user = mockStore.users.find(u => String(u._id) === String(id));
    if (!user) {return { lean: () => null };}
    const wrapped = {
      ...user,
      save: jest.fn().mockImplementation(async function () {
        Object.assign(user, this);
        return user;
      }),
    };
    return {
      select: () => ({
        lean: () => wrapped,
      }),
      lean: () => wrapped,
      ...wrapped,
    };
  }),
  findByIdAndUpdate: jest.fn().mockImplementation((id, update) => {
    const user = mockStore.users.find(u => String(u._id) === String(id));
    if (!user) {return null;}
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        user[k] = (user[k] || 0) + v;
      }
    }
    if (update.$set) {
      Object.assign(user, update.$set);
    }
    return user;
  }),
  findOne: jest.fn().mockImplementation((query) => {
    const user = mockStore.users.find(u => {
      for (const [k, v] of Object.entries(query)) {
        if (String(u[k]) !== String(v)) {return false;}
      }
      return true;
    });
    return user ? {
      ...user,
      verifyPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(user),
    } : null;
  }),
  hashPassword: jest.fn().mockResolvedValue('mocked-hash'),
};

function createMongooseModelMock(collectionName) {
  const modelMock = {
    findById: jest.fn().mockImplementation((id) => {
      const doc = mockStore[collectionName]?.find(d => String(d._id) === String(id) || String(d.id) === String(id));
      return {
        lean: jest.fn().mockResolvedValue(doc || null),
        exec: jest.fn().mockResolvedValue(doc || null),
      };
    }),
    findOne: jest.fn().mockImplementation((query) => {
      const doc = mockStore[collectionName]?.find(d => {
        for (const [k, v] of Object.entries(query)) {
          if (String(d[k]) !== String(v)) {return false;}
        }
        return true;
      });
      return {
        lean: jest.fn().mockResolvedValue(doc || null),
        exec: jest.fn().mockResolvedValue(doc || null),
      };
    }),
  };
  return { default: modelMock };
}

jest.unstable_mockModule('../models/User.js', () => ({ default: UserMock }));
jest.unstable_mockModule('../models/Case.js', () => createMongooseModelMock('cases'));
jest.unstable_mockModule('../models/Client.js', () => createMongooseModelMock('clients'));
jest.unstable_mockModule('../models/Document.js', () => createMongooseModelMock('documents'));
jest.unstable_mockModule('../models/Folder.js', () => createMongooseModelMock('folders'));
jest.unstable_mockModule('../models/Hearing.js', () => createMongooseModelMock('hearings'));
jest.unstable_mockModule('../models/PasswordReset.js', () => ({ default: { deleteMany: jest.fn() } }));

const disconnectUserSocketsMock = jest.fn();
jest.unstable_mockModule('../community/socket/socketServer.js', () => ({
  disconnectUserSockets: disconnectUserSocketsMock,
  emitToUser: jest.fn(),
  emitToConversation: jest.fn(),
  default: {
    disconnectUserSockets: disconnectUserSocketsMock,
    emitToUser: jest.fn(),
    emitToConversation: jest.fn(),
  }
}));

jest.unstable_mockModule('../utils/userCache.js', () => ({
  getCachedUser: jest.fn().mockImplementation(async (userId) => {
    return mockStore.users.find(u => String(u._id) === String(userId)) || null;
  }),
  setCachedUser: jest.fn().mockResolvedValue(undefined),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../utils/redis.js', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    lpush: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    isAvailable: jest.fn().mockReturnValue(false),
  };
  return {
    redis: mockRedis,
    default: mockRedis,
    connectRedis: jest.fn().mockResolvedValue(undefined),
  };
});

jest.unstable_mockModule('../utils/mailer.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule('../config/cloudinary.js', () => {
  const mockCloudinary = {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
      upload_stream: jest.fn(),
    },
    url: jest.fn(),
  };
  return {
    uploadToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.com/test.pdf', public_id: 'test' }),
    uploadFileToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.com/test.pdf', public_id: 'test' }),
    deleteFromCloudinary: jest.fn().mockResolvedValue(true),
    extractPublicIdFromUrl: jest.fn().mockReturnValue('test'),
    getCloudinaryUrl: jest.fn().mockReturnValue('https://cloudinary.com/test.pdf'),
    default: mockCloudinary,
  };
});

jest.unstable_mockModule('../middleware/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../middleware/planEnforcement.js', () => ({
  enforcePlanLimits: () => (req, res, next) => next(),
}));

jest.unstable_mockModule('../middleware/checkPlanAccess.js', () => ({
  checkPlanAccess: () => (req, res, next) => next(),
}));

// ── Step 3: Express app builder ──────────────────────────────────────────────
async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.NODE_ENV = 'test';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount routers
  const { default: authRouter } = await import('../routes/auth-jwt.js');
  const { default: clientRouter } = await import('../routes/clients.js');
  const { default: caseRouter } = await import('../routes/cases.js');
  const { default: hearingRouter } = await import('../routes/hearings.js');
  const { default: documentRouter } = await import('../routes/documents.js');

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/clients', clientRouter);
  app.use('/api/v1/cases', caseRouter);
  app.use('/api/v1/hearings', hearingRouter);
  app.use('/api/v1/documents', documentRouter);

  return app;
}

// Helper to sign JWT token
function signToken(userId, email = 'user@test.com', role = 'lawyer') {
  return jwt.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// ── Step 4: Integration Tests ───────────────────────────────────────────────
describe('Juriq Security Integration Suite', () => {
  let app;
  let testUser;
  let anotherUser;
  let testToken;
  let anotherToken;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();

    // Create test users
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
    };

    anotherUser = {
      _id: '123456789012345678901234',
      id: '123456789012345678901234',
      email: 'other@test.com',
      name: 'Other Lawyer',
      role: 'lawyer',
      status: 'active',
      sessionVersion: 0,
      sessionVersionAt: null,
      accountStatus: { isSuspended: false },
      securityFlags: { blocked: false },
    };

    mockStore.users.push(testUser);
    mockStore.users.push(anotherUser);

    testToken = signToken(testUser._id, testUser.email);
    anotherToken = signToken(anotherUser._id, anotherUser.email);
  });

  // ── 1. Unified Account Status Check Tests ──────────────────────────────────
  describe('Account Status Checks (HTTP Middleware)', () => {
    test('should allow active user requests', async () => {
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Cookie', `token=${testToken}`);
      expect(res.status).toBe(200);
    });

    test('should block suspended user (status === "suspended")', async () => {
      testUser.status = 'suspended';
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Cookie', `token=${testToken}`);
      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCOUNT_SUSPENDED');
    });

    test('should block suspended user (accountStatus.isSuspended === true)', async () => {
      testUser.accountStatus.isSuspended = true;
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Cookie', `token=${testToken}`);
      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCOUNT_SUSPENDED');
    });

    test('should block deleted user', async () => {
      testUser.status = 'deleted';
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Cookie', `token=${testToken}`);
      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCOUNT_DELETED');
    });
  });

  // ── 2. IDOR Ownership Check Tests ──────────────────────────────────────────
  describe('IDOR & Cross-Tenant Access Controls', () => {
    let caseDoc;
    let clientDoc;

    beforeEach(async () => {
      // Setup Case and Client under testUser
      const { createDocument } = await import('../services/mongodb.js');
      clientDoc = await createDocument('clients', {
        name: 'John Doe',
        email: 'john@doe.com',
        phone: '1234567890',
        owner: testUser._id,
      });

      caseDoc = await createDocument('cases', {
        caseNumber: 'CASE-777',
        clientName: 'John Doe',
        owner: testUser._id,
      });
    });

    test('should allow owner to update client', async () => {
      const res = await request(app)
        .put(`/api/v1/clients/${clientDoc._id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ name: 'John Updated' });
      expect(res.status).toBe(200);
    });

    test('should reject non-owner trying to update client (IDOR)', async () => {
      const res = await request(app)
        .put(`/api/v1/clients/${clientDoc._id}`)
        .set('Cookie', `token=${anotherToken}`)
        .send({ name: 'Malicious Update' });
      expect(res.status).toBe(404); // returns 404 to hide resource existence
    });

    test('should reject non-owner trying to view client cases (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${clientDoc._id}/cases`)
        .set('Cookie', `token=${anotherToken}`);
      expect(res.status).toBe(404);
    });

    test('should reject non-owner trying to create hearing for case (IDOR)', async () => {
      const res = await request(app)
        .post('/api/v1/hearings')
        .set('Cookie', `token=${anotherToken}`)
        .send({
          caseId: caseDoc._id,
          hearingDate: new Date(Date.now() + 86400000).toISOString(),
          courtName: 'Supreme Court',
        });
      expect(res.status).toBe(404);
    });

    test('should reject non-owner trying to fetch hearings for case (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/hearings/case/${caseDoc._id}`)
        .set('Cookie', `token=${anotherToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ── 3. Folder and Document IDOR Checks ─────────────────────────────────────
  describe('Document & Folder IDOR Controls', () => {
    let folderDoc;
    let docFile;

    beforeEach(async () => {
      const { createDocument } = await import('../services/mongodb.js');
      folderDoc = await createDocument('folders', {
        name: 'Case Files',
        ownerId: testUser._id,
      });

      docFile = await createDocument('documents', {
        name: 'brief.pdf',
        mimetype: 'application/pdf',
        size: 500,
        url: 'https://cloudinary.com/brief.pdf',
        ownerId: testUser._id,
      });
    });

    test('should reject folder creation under another user parent folder (IDOR)', async () => {
      const res = await request(app)
        .post('/api/v1/documents/folders')
        .set('Cookie', `token=${anotherToken}`)
        .send({ name: 'Subfolder', parentId: folderDoc._id });
      expect(res.status).toBe(404);
    });

    test('should reject file update into another user folder (IDOR)', async () => {
      const res = await request(app)
        .put(`/api/v1/documents/files/${docFile._id}`)
        .set('Cookie', `token=${testToken}`) // Owner of file, but targeting another user folder
        .send({ folderId: new mongoose.Types.ObjectId().toString() }); // Random folderId
      expect(res.status).toBe(404);
    });

    test('should reject non-owner viewing document (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/files/${docFile._id}/view`)
        .set('Cookie', `token=${anotherToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ── 4. Session & Socket Invalidation Tests ──────────────────────────────────
  describe('Password Change & Reset Session/Socket Invalidation', () => {
    test('should increment sessionVersion and call socket disconnect on password change', async () => {
      const { invalidateUserCache } = await import('../utils/userCache.js');
      const { disconnectUserSockets } = await import('../community/socket/socketServer.js');

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', `token=${testToken}`)
        .send({ currentPassword: 'password123', newPassword: 'secureNewPassword123' });

      expect(res.status).toBe(200);

      // Verify sessionVersion is incremented in mocked User
      expect(testUser.sessionVersion).toBe(1);
      expect(testUser.sessionVersionAt).toBeInstanceOf(Date);

      // Verify Redis cache is invalidated and sockets are disconnected
      expect(invalidateUserCache).toHaveBeenCalledWith(testUser._id);
      expect(disconnectUserSockets).toHaveBeenCalledWith(testUser._id, 'SESSION_REVOKED');
    });
  });

  // ── 5. Socket Middleware Suspension Checks ──────────────────────────────────
  describe('Socket.IO Connection Hardening', () => {
    test('should accept active socket connections', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const mockSocket = {
        id: 'socket_active',
        handshake: {
          auth: { token: testToken },
          headers: {},
        },
        server: {
          sockets: {
            adapter: {
              rooms: new Map(),
            },
          },
        },
      };
      const next = jest.fn();

      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject suspended user socket connections', async () => {
      testUser.accountStatus.isSuspended = true;
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const mockSocket = {
        id: 'socket_suspended',
        handshake: {
          auth: { token: testToken },
          headers: {},
        },
        server: {
          sockets: {
            adapter: {
              rooms: new Map(),
            },
          },
        },
      };
      const next = jest.fn();

      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toBe('SOCKET_AUTH_ACCOUNT_SUSPENDED');
    });

    test('should reject blacklisted token', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const redisModule = await import('../utils/redis.js');
      redisModule.redis.exists.mockResolvedValueOnce(1);

      const mockSocket = {
        id: 'socket_blacklisted',
        handshake: {
          auth: { token: testToken },
          headers: {},
        },
        server: {
          sockets: {
            adapter: {
              rooms: new Map(),
            },
          },
        },
      };
      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('SOCKET_AUTH_REVOKED');
    });

    test('should reject connection when no token is provided', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const mockSocket = {
        id: 'socket_no_token',
        handshake: {
          auth: {},
          headers: {},
        },
      };
      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('SOCKET_AUTH_REQUIRED');
    });

    test('should reject invalid JWT token', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const mockSocket = {
        id: 'socket_invalid_jwt',
        handshake: {
          auth: { token: 'invalid.jwt.token' },
          headers: {},
        },
      };
      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('SOCKET_AUTH_INVALID');
    });

    test('should reject when user is not found in database', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const token = signToken('non-existent-user-id');
      const mockSocket = {
        id: 'socket_no_user',
        handshake: {
          auth: { token },
          headers: {},
        },
      };
      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('SOCKET_AUTH_USER_NOT_FOUND');
    });

    test('should reject when concurrency limit is exceeded', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const roomsMap = new Map();
      roomsMap.set(`user:${testUser._id}`, { size: 6 });

      const mockSocket = {
        id: 'socket_concurrency',
        handshake: {
          auth: { token: testToken },
          headers: {},
        },
        server: {
          sockets: {
            adapter: {
              rooms: roomsMap,
            },
          },
        },
      };
      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('SOCKET_LIMIT_EXCEEDED');
    });

    test('should handle unexpected error and call next with SOCKET_AUTH_ERROR', async () => {
      const { socketAuthMiddleware } = await import('../community/socket/socketAuth.js');
      const mongodbModule = await import('../services/mongodb.js');

      mongodbModule.getDocumentById.mockRejectedValueOnce(new Error('DB connection failed'));

      const mockSocket = {
        id: 'socket_error',
        handshake: {
          auth: { token: testToken },
          headers: {},
        },
        server: {
          sockets: {
            adapter: {
              rooms: new Map(),
            },
          },
        },
      };
      const next = jest.fn();
      await socketAuthMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('SOCKET_AUTH_ERROR');
    });
  });

  describe('accountStatus branch coverage', () => {
    test('should return USER_NOT_FOUND when user is null', async () => {
      const { checkAccountStatus } = await import('../utils/accountStatus.js');
      const res = checkAccountStatus(null);
      expect(res.active).toBe(false);
      expect(res.code).toBe('USER_NOT_FOUND');
    });

    test('should return ACCOUNT_DELETED when user.deleted is true', async () => {
      const { checkAccountStatus } = await import('../utils/accountStatus.js');
      const res = checkAccountStatus({ deleted: true });
      expect(res.active).toBe(false);
      expect(res.code).toBe('ACCOUNT_DELETED');
    });

    test('should return ACCOUNT_SUSPENDED when blocked is true', async () => {
      const { checkAccountStatus } = await import('../utils/accountStatus.js');
      const res = checkAccountStatus({ securityFlags: { blocked: true } });
      expect(res.active).toBe(false);
      expect(res.code).toBe('ACCOUNT_SUSPENDED');
    });

    test('should return ACCOUNT_SUSPENDED when temporarySuspensionUntil is in future', async () => {
      const { checkAccountStatus } = await import('../utils/accountStatus.js');
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const res = checkAccountStatus({ securityFlags: { temporarySuspensionUntil: futureDate } });
      expect(res.active).toBe(false);
      expect(res.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('ownershipService branch coverage', () => {
    test('should return false for missing or invalid parameters', async () => {
      const { validateClientOwnership, validateCaseOwnership, validateDocumentOwnership, validateFolderOwnership } = await import('../services/ownershipService.js');
      
      expect(await validateClientOwnership(null, '654321098765432109876543')).toBe(false);
      expect(await validateClientOwnership('invalid_id', '654321098765432109876543')).toBe(false);
      expect(await validateClientOwnership('6a27a12a5d943dc6dff8a7a3', null)).toBe(false);

      expect(await validateCaseOwnership(null, '654321098765432109876543')).toBe(false);
      expect(await validateCaseOwnership('invalid_id', '654321098765432109876543')).toBe(false);
      expect(await validateCaseOwnership('6a27a12a5d943dc6dff8a7a3', null)).toBe(false);

      expect(await validateDocumentOwnership(null, '654321098765432109876543')).toBe(false);
      expect(await validateDocumentOwnership('invalid_id', '654321098765432109876543')).toBe(false);
      expect(await validateDocumentOwnership('6a27a12a5d943dc6dff8a7a3', null)).toBe(false);

      expect(await validateFolderOwnership(null, '654321098765432109876543')).toBe(false);
      expect(await validateFolderOwnership('invalid_id', '654321098765432109876543')).toBe(false);
      expect(await validateFolderOwnership('6a27a12a5d943dc6dff8a7a3', null)).toBe(false);
    });

    test('should return false when document does not exist in DB', async () => {
      const { validateClientOwnership, validateCaseOwnership, validateDocumentOwnership, validateFolderOwnership } = await import('../services/ownershipService.js');
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      expect(await validateClientOwnership(nonExistentId, '654321098765432109876543')).toBe(false);
      expect(await validateCaseOwnership(nonExistentId, '654321098765432109876543')).toBe(false);
      expect(await validateDocumentOwnership(nonExistentId, '654321098765432109876543')).toBe(false);
      expect(await validateFolderOwnership(nonExistentId, '654321098765432109876543')).toBe(false);
    });

    test('should return false when DB model queries throw error for case, document, and folder', async () => {
      const { validateClientOwnership, validateCaseOwnership, validateDocumentOwnership, validateFolderOwnership } = await import('../services/ownershipService.js');
      
      const ClientModel = (await import('../models/Client.js')).default;
      const CaseModel = (await import('../models/Case.js')).default;
      const DocumentModel = (await import('../models/Document.js')).default;
      const FolderModel = (await import('../models/Folder.js')).default;

      const originalClientFindById = ClientModel.findById;
      const originalCaseFindById = CaseModel.findById;
      const originalDocumentFindById = DocumentModel.findById;
      const originalFolderFindById = FolderModel.findById;

      ClientModel.findById = jest.fn().mockImplementation(() => { throw new Error('DB Error'); });
      CaseModel.findById = jest.fn().mockImplementation(() => { throw new Error('DB Error'); });
      DocumentModel.findById = jest.fn().mockImplementation(() => { throw new Error('DB Error'); });
      FolderModel.findById = jest.fn().mockImplementation(() => { throw new Error('DB Error'); });

      const validId = new mongoose.Types.ObjectId().toString();
      expect(await validateClientOwnership(validId, '654321098765432109876543')).toBe(false);
      expect(await validateCaseOwnership(validId, '654321098765432109876543')).toBe(false);
      expect(await validateDocumentOwnership(validId, '654321098765432109876543')).toBe(false);
      expect(await validateFolderOwnership(validId, '654321098765432109876543')).toBe(false);

      ClientModel.findById = originalClientFindById;
      CaseModel.findById = originalCaseFindById;
      DocumentModel.findById = originalDocumentFindById;
      FolderModel.findById = originalFolderFindById;
    });
  });
});
