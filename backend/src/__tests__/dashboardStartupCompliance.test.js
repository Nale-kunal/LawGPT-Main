import { jest, describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  cases: [],
  clients: [],
  alerts: [],
  hearings: [],
  documents: [],
  folders: [],
  activities: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.cases = [];
  mockStore.clients = [];
  mockStore.alerts = [];
  mockStore.hearings = [];
  mockStore.documents = [];
  mockStore.folders = [];
  mockStore.activities = [];
}

// Mock database services
jest.unstable_mockModule('../services/mongodb.js', () => {
  const collections = {
    USERS: 'users',
    CASES: 'cases',
    CLIENTS: 'clients',
    DOCUMENTS: 'documents',
    FOLDERS: 'folders',
    HEARINGS: 'hearings',
    ALERTS: 'alerts',
    ACTIVITIES: 'activities',
    LEGAL_SECTIONS: 'legalSections',
    PASSWORD_RESETS: 'passwordResets',
  };
  return {
    COLLECTIONS: collections,
    MODELS: collections,
    getDocumentById: jest.fn().mockImplementation(async (col, id) => {
      return (
        mockStore[col]?.find((x) => String(x._id) === String(id) || String(x.id) === String(id)) ||
        null
      );
    }),
    updateDocument: jest.fn().mockImplementation(async (col, id, update) => {
      const doc = mockStore[col]?.find(
        (x) => String(x._id) === String(id) || String(x.id) === String(id)
      );
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
    deleteDocument: jest.fn().mockImplementation(async (col, id) => {
      if (mockStore[col]) {
        const idx = mockStore[col].findIndex(
          (x) => String(x._id) === String(id) || String(x.id) === String(id)
        );
        if (idx !== -1) {
          mockStore[col].splice(idx, 1);
          return true;
        }
      }
      return false;
    }),
    deleteManyDocuments: jest.fn().mockImplementation(async (col, filter) => {
      return 0;
    }),
    queryDocuments: jest.fn().mockImplementation(async (col, queries) => {
      let docs = mockStore[col] || [];
      if (queries && Array.isArray(queries)) {
        for (const q of queries) {
          if (q.operator === '==') {
            docs = docs.filter((doc) => String(doc[q.field]) === String(q.value));
          } else if (q.operator === '!=') {
            docs = docs.filter((doc) => String(doc[q.field]) !== String(q.value));
          }
        }
      }
      return docs;
    }),
    getAllDocuments: jest.fn().mockImplementation(async (col) => {
      return mockStore[col] || [];
    }),
    batchWrite: jest.fn().mockResolvedValue(true),
    default: {},
  };
});

// Mock Mongoose models
const mockUserFindById = jest.fn();
jest.unstable_mockModule('../models/User.js', () => {
  return {
    default: {
      findById: mockUserFindById,
      findByIdAndUpdate: jest.fn().mockImplementation(async (id, update) => {
        const user = mockStore.users.find(
          (u) => String(u._id) === String(id) || String(u.id) === String(id)
        );
        if (user) {
          if (update.$set) {
            Object.assign(user, update.$set);
          } else {
            Object.assign(user, update);
          }
        }
        return user;
      }),
      updateOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  };
});

// Mock token service
jest.unstable_mockModule('../services/tokenService.js', () => {
  return {
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  };
});

// Mock ownershipService
jest.unstable_mockModule('../services/ownershipService.js', () => ({
  validateFolderOwnership: jest.fn().mockResolvedValue(true),
  validateCaseOwnership: jest.fn().mockResolvedValue(true),
  validateDocumentOwnership: jest.fn().mockResolvedValue(true),
  validateClientOwnership: jest.fn().mockResolvedValue(true),
}));

// Mock plan enforcement
jest.unstable_mockModule('../middleware/planEnforcement.js', () => ({
  enforcePlanLimits: () => (req, res, next) => next(),
}));
jest.unstable_mockModule('../middleware/checkPlanAccess.js', () => ({
  checkPlanAccess: () => (req, res, next) => next(),
}));

// Mock community routes entirely to bypass complex controllers and models
jest.unstable_mockModule('../community/routes/index.js', () => {
  const router = express.Router();

  router.get('/conversations', async (req, res, next) => {
    try {
      const { requireAuth } = await import('../middleware/auth-jwt.js');
      await requireAuth(req, res, () => {
        res.json([]);
      });
    } catch (err) {
      next(err);
    }
  });

  return { default: router };
});

// Mock other unrelated middlewares
jest.unstable_mockModule('../middleware/audit.js', () => {
  return { auditLog: jest.fn() };
});
jest.unstable_mockModule('../middleware/csrf.js', () => {
  return { csrfProtection: (req, res, next) => next() };
});
jest.unstable_mockModule('../middleware/abuseDetection.js', () => {
  return { abuseDetection: (req, res, next) => next() };
});

// Mock socket/sockets
jest.unstable_mockModule('../community/socket/socketServer.js', () => {
  return { disconnectUserSockets: jest.fn() };
});

// ── 2. Build Express App ──────────────────────────────────────────────────────

async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars-long!!';
  process.env.NODE_ENV = 'test';
  process.env.TEST_ENFORCE_CONSENT = 'true';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount routers
  const { default: caseRoutes } = await import('../routes/cases.js');
  const { default: clientRoutes } = await import('../routes/clients.js');
  const { default: alertRoutes } = await import('../routes/alerts.js');
  const { default: hearingRoutes } = await import('../routes/hearings.js');
  const { default: dashboardRoutes } = await import('../routes/dashboard.js');
  const { default: communityRoutes } = await import('../community/routes/index.js');
  const { default: subscriptionRoutes } = await import('../routes/subscription.js');

  app.use('/api/v1/cases', caseRoutes);
  app.use('/api/v1/clients', clientRoutes);
  app.use('/api/v1/alerts', alertRoutes);
  app.use('/api/v1/hearings', hearingRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/community', communityRoutes);
  app.use('/api/v1/subscription', subscriptionRoutes);

  return app;
}

// ── 3. Test Cases ────────────────────────────────────────────────────────────

describe('Dashboard Startup Gating integration tests', () => {
  let app;
  let testUser;
  let testToken;
  let originalRequiredConsents;

  const targetEndpoints = [
    { name: 'GET /api/v1/cases', path: '/api/v1/cases', method: 'get' },
    { name: 'GET /api/v1/clients', path: '/api/v1/clients', method: 'get' },
    { name: 'GET /api/v1/alerts', path: '/api/v1/alerts', method: 'get' },
    { name: 'GET /api/v1/hearings', path: '/api/v1/hearings', method: 'get' },
    {
      name: 'GET /api/v1/dashboard/notifications',
      path: '/api/v1/dashboard/notifications',
      method: 'get',
    },
    {
      name: 'GET /api/v1/community/conversations',
      path: '/api/v1/community/conversations',
      method: 'get',
    },
    { name: 'GET /api/v1/subscription/plan', path: '/api/v1/subscription/plan', method: 'get' },
  ];

  beforeAll(async () => {
    app = await buildApp();
    const { REQUIRED_SIGNUP_CONSENTS } = await import('../config/policyVersions.js');
    originalRequiredConsents = JSON.parse(JSON.stringify(REQUIRED_SIGNUP_CONSENTS));
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();

    testUser = {
      _id: '654321098765432109876543',
      id: '654321098765432109876543',
      email: 'lawyer@test.com',
      name: 'Test Lawyer',
      role: 'lawyer',
      status: 'active',
      sessionVersion: 0,
      legalConsents: [
        { policyType: 'terms', version: '1.0', acceptedAt: new Date() },
        { policyType: 'privacy', version: '1.0', acceptedAt: new Date() },
      ],
      save: jest.fn().mockImplementation(async function () {
        return this;
      }),
      toObject: function () {
        return this;
      },
    };

    mockStore.users.push(testUser);
    mockUserFindById.mockImplementation((id) => {
      const user = mockStore.users.find((u) => String(u._id) === String(id));
      return {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockImplementation(async () => user || null),
        exec: jest.fn().mockImplementation(async () => user || null),
        then: (resolve) => resolve(user ? { ...user, toObject: () => user } : null),
      };
    });

    testToken = jwt.sign(
      { userId: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET
    );
  });

  afterEach(async () => {
    // Restore config policy versions
    const { REQUIRED_SIGNUP_CONSENTS } = await import('../config/policyVersions.js');
    REQUIRED_SIGNUP_CONSENTS.length = 0;
    originalRequiredConsents.forEach((c) => REQUIRED_SIGNUP_CONSENTS.push(c));
  });

  describe('Scenario 1: Authenticated and compliant user', () => {
    targetEndpoints.forEach((endpoint) => {
      test(`allows access to ${endpoint.name}`, async () => {
        const req = request(app);
        const res = await req[endpoint.method](endpoint.path)
          .set('Cookie', `token=${testToken}`);

        // Compliant user should not get a 403 compliance warning.
        // It could return 200, 404 (if not found in DB), or other logic depending on route,
        // but definitely NOT 403 POLICY_UPDATE_REQUIRED.
        expect(res.status).not.toBe(403);
        if (res.status === 403) {
          expect(res.body.errorCode).not.toBe('POLICY_UPDATE_REQUIRED');
        }
      });
    });
  });

  describe('Scenario 2: Authenticated and non-compliant user', () => {
    beforeEach(() => {
      testUser.legalConsents = []; // User has not accepted any policies
    });

    targetEndpoints.forEach((endpoint) => {
      test(`blocks access to ${endpoint.name} with POLICY_UPDATE_REQUIRED`, async () => {
        const req = request(app);
        const res = await req[endpoint.method](endpoint.path)
          .set('Cookie', `token=${testToken}`);

        expect(res.status).toBe(403);
        expect(res.body.errorCode).toBe('POLICY_UPDATE_REQUIRED');
      });
    });
  });

  describe('Scenario 3: Expired policy version (system upgraded to v2)', () => {
    beforeEach(async () => {
      // User only accepted v1.0
      testUser.legalConsents = [
        { policyType: 'terms', version: '1.0', acceptedAt: new Date() },
        { policyType: 'privacy', version: '1.0', acceptedAt: new Date() },
      ];
      // System upgraded to require terms v2.0
      const { REQUIRED_SIGNUP_CONSENTS } = await import('../config/policyVersions.js');
      REQUIRED_SIGNUP_CONSENTS[0].version = '2.0';
    });

    targetEndpoints.forEach((endpoint) => {
      test(`blocks access to ${endpoint.name} because version v1.0 is expired`, async () => {
        const req = request(app);
        const res = await req[endpoint.method](endpoint.path)
          .set('Cookie', `token=${testToken}`);

        expect(res.status).toBe(403);
        expect(res.body.errorCode).toBe('POLICY_UPDATE_REQUIRED');
      });
    });
  });
});
