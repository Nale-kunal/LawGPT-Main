import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import mongoose from 'mongoose';

// ── 1. Mocking Logger, Env, Sentry, Ingestors, and Globals ──────────────────────
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({})
});

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  }
}));

jest.unstable_mockModule('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-minimum-32-chars-long!!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars-long!!',
    JWT_KEYS: null
  }
}));

jest.unstable_mockModule('../workers/emailWorker.js', () => ({
  getEmailQueue: jest.fn().mockReturnValue({
    add: jest.fn().mockResolvedValue(true)
  })
}));

jest.unstable_mockModule('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn().mockImplementation((cb) => {
    const scope = {
      setUser: jest.fn(),
      setTag: jest.fn(),
      setExtra: jest.fn()
    };
    cb(scope);
  }),
  captureException: jest.fn()
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: '123' })
    })
  }
}));

jest.unstable_mockModule('https', () => ({
  default: {
    get: jest.fn().mockImplementation((url, cb) => {
      if (cb) {cb({ statusCode: 200 });}
      return { on: jest.fn().mockReturnThis() };
    })
  },
  get: jest.fn().mockImplementation((url, cb) => {
    if (cb) {cb({ statusCode: 200 });}
    return { on: jest.fn().mockReturnThis() };
  })
}));

jest.unstable_mockModule('http', () => ({
  default: {
    get: jest.fn().mockImplementation((url, cb) => {
      if (cb) {cb({ statusCode: 500 });}
      return {
        on: jest.fn().mockImplementation((evt, handler) => {
          if (evt === 'error') {handler(new Error('http error'));}
          return { on: jest.fn() };
        })
      };
    })
  },
  get: jest.fn().mockImplementation((url, cb) => {
    if (cb) {cb({ statusCode: 500 });}
    return {
      on: jest.fn().mockImplementation((evt, handler) => {
        if (evt === 'error') {handler(new Error('http error'));}
        return { on: jest.fn() };
      })
    };
  })
}));

jest.unstable_mockModule('../services/legalIngestion/indiaCodeIngestor.js', () => ({
  ingestIndiaCode: jest.fn().mockResolvedValue(5)
}));
jest.unstable_mockModule('../services/legalIngestion/supremeCourtIngestor.js', () => ({
  ingestSupremeCourt: jest.fn().mockResolvedValue(5)
}));
jest.unstable_mockModule('../services/legalIngestion/ecourtsIngestor.js', () => ({
  ingestECourts: jest.fn().mockResolvedValue(5)
}));
jest.unstable_mockModule('../services/semanticSearch/vectorStore.js', () => ({
  generateAndStoreEmbeddings: jest.fn().mockResolvedValue(true)
}));

// ── 2. Mocking Database and Models ──────────────────────────────────────────────
const mockDb = {
  users: [],
  cases: [],
  documents: [],
  auditlogs: [],
  alertqueues: [],
  subscriptions: [],
  paymentinvoices: [],
  paymentlogs: [],
  refundlogs: [],
  settlementlogs: [],
  hearings: [],
  activities: [],
  userpresences: [],
  usersessions: [],
  legalacts: [],
  caselaws: []
};

function resetMockDb() {
  Object.keys(mockDb).forEach(k => {
    mockDb[k] = [];
  });
}

function createQueryObj(wrapped) {
  const query = {
    select: () => query,
    lean: () => query,
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    exec: () => Promise.resolve(wrapped),
    then: (resolve, reject) => Promise.resolve(wrapped).then(resolve, reject),
    catch: (reject) => Promise.resolve(wrapped).catch(reject),
  };
  return query;
}

function createRejectedQueryObj(err) {
  const query = {
    select: () => query,
    lean: () => query,
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    exec: () => Promise.reject(err),
    then: (resolve, reject) => Promise.reject(err).then(resolve, reject),
    catch: (reject) => Promise.reject(err).catch(reject),
  };
  return query;
}


function makeModelMock(collectionName) {
  const modelMock = {
    findById: jest.fn().mockImplementation((id) => {
      const doc = mockDb[collectionName].find(x => String(x._id) === String(id));
      return createQueryObj(doc);
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id, update) => {
      const doc = mockDb[collectionName].find(x => String(x._id) === String(id));
      if (doc && update.$set) {
        Object.assign(doc, update.$set);
      }
      return Promise.resolve(doc);
    }),
    updateOne: jest.fn().mockImplementation(async (filter, update) => {
      const doc = mockDb[collectionName].find(x => String(x._id) === String(filter._id));
      if (doc && update.$set) {
        Object.assign(doc, update.$set);
      }
      return { modifiedCount: 1 };
    }),
    findOneAndUpdate: jest.fn().mockImplementation((filter, update, options) => {
      let doc = mockDb[collectionName].find(x => String(x.userId) === String(filter.userId));
      if (!doc && options?.upsert) {
        doc = { _id: 'upserted_' + Math.random(), ...filter };
        mockDb[collectionName].push(doc);
      }
      if (doc) {
        if (update.$set) {Object.assign(doc, update.$set);}
        if (update.$addToSet) {
          Object.entries(update.$addToSet).forEach(([k, v]) => {
            if (!doc[k]) {doc[k] = [];}
            if (!doc[k].includes(v)) {doc[k].push(v);}
          });
        }
      }
      return createQueryObj(doc);
    }),
    findOne: jest.fn().mockImplementation((filter) => {
      const doc = mockDb[collectionName].find(x => {
        return Object.entries(filter).every(([k, v]) => String(x[k]) === String(v));
      });
      return createQueryObj(doc);
    }),
    find: jest.fn().mockImplementation((filter) => {
      const docs = mockDb[collectionName];
      return createQueryObj(docs);
    }),
    countDocuments: jest.fn().mockImplementation(async (filter) => {
      return mockDb[collectionName].length;
    }),
    create: jest.fn().mockImplementation(async (data) => {
      const doc = { ...data, _id: data._id || 'id_' + Math.random().toString(36).substring(2, 9) };
      mockDb[collectionName].push(doc);
      return doc;
    }),
    aggregate: jest.fn().mockResolvedValue([{ total: 100 * 1024 * 1024 }]),
  };
  return modelMock;
}

const UserMock = makeModelMock('users');
const CaseMock = makeModelMock('cases');
const DocumentMock = makeModelMock('documents');
const AuditLogMock = makeModelMock('auditlogs');
const AlertQueueMock = makeModelMock('alertqueues');
const SubscriptionMock = makeModelMock('subscriptions');
const PaymentInvoiceMock = makeModelMock('paymentinvoices');
const PaymentLogMock = makeModelMock('paymentlogs');
const RefundLogMock = makeModelMock('refundlogs');
const SettlementLogMock = makeModelMock('settlementlogs');
const UserPresenceMock = makeModelMock('userpresences');
const UserSessionMock = makeModelMock('usersessions');
const LegalActsMock = makeModelMock('legalacts');
const CaseLawsMock = makeModelMock('caselaws');

jest.unstable_mockModule('../models/User.js', () => ({ default: UserMock }));
jest.unstable_mockModule('../models/Case.js', () => ({ default: CaseMock }));
jest.unstable_mockModule('../models/Document.js', () => ({ default: DocumentMock }));
jest.unstable_mockModule('../models/AuditLog.js', () => ({ default: AuditLogMock }));
jest.unstable_mockModule('../models/AlertQueue.js', () => ({ default: AlertQueueMock }));
jest.unstable_mockModule('../models/Subscription.js', () => ({ default: SubscriptionMock }));
jest.unstable_mockModule('../models/PaymentInvoice.js', () => ({ default: PaymentInvoiceMock }));
jest.unstable_mockModule('../models/PaymentLog.js', () => ({ default: PaymentLogMock }));
jest.unstable_mockModule('../models/RefundLog.js', () => ({ default: RefundLogMock }));
jest.unstable_mockModule('../models/SettlementLog.js', () => ({ default: SettlementLogMock }));
jest.unstable_mockModule('../community/models/UserPresence.js', () => ({ default: UserPresenceMock }));
jest.unstable_mockModule('../community/models/UserSession.js', () => ({ default: UserSessionMock }));
jest.unstable_mockModule('../models/LegalActs.js', () => ({ default: LegalActsMock }));
jest.unstable_mockModule('../models/CaseLaws.js', () => ({ default: CaseLawsMock }));

// Mock Redis
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  incrby: jest.fn().mockResolvedValue(1),
  decrby: jest.fn().mockResolvedValue(1),
  zadd: jest.fn().mockResolvedValue(1),
  zremrangebyrank: jest.fn().mockResolvedValue(1),
  zrangebyscore: jest.fn().mockResolvedValue([]),
  isAvailable: jest.fn().mockReturnValue(true),
  raw: jest.fn().mockReturnValue({
    scan: jest.fn().mockResolvedValue(['0', []]),
    del: jest.fn().mockResolvedValue(1),
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue('user_001'),
    hdel: jest.fn().mockResolvedValue(1),
    mget: jest.fn().mockResolvedValue([null]),
    set: jest.fn().mockResolvedValue('OK')
  }),
  pipeline: jest.fn().mockReturnValue({
    get: jest.fn(),
    del: jest.fn(),
    exec: jest.fn().mockResolvedValue([['err', '10']])
  })
};
jest.unstable_mockModule('../utils/redis.js', () => ({
  redis: mockRedis,
  default: mockRedis,
  connectRedis: jest.fn().mockResolvedValue(undefined)
}));

// Mock MongoDB Service
jest.unstable_mockModule('../services/mongodb.js', () => {
  return {
    COLLECTIONS: {
      USERS: 'users',
      CASES: 'cases',
      DOCUMENTS: 'documents',
      HEARINGS: 'hearings'
    },
    MODELS: {
      USERS: 'users',
      CASES: 'cases',
      DOCUMENTS: 'documents',
      HEARINGS: 'hearings',
      ACTIVITIES: 'activities'
    },
    getDocumentById: jest.fn().mockImplementation(async (col, id) => {
      return mockDb[col]?.find(x => String(x._id) === String(id)) || null;
    }),
    updateDocument: jest.fn().mockImplementation(async (col, id, update) => {
      const doc = mockDb[col]?.find(x => String(x._id) === String(id));
      if (doc) {
        Object.assign(doc, update);
      }
      return doc;
    }),
    createDocument: jest.fn().mockImplementation(async (col, data) => {
      const doc = { ...data, _id: 'doc_' + Math.random().toString(36).substring(2, 9) };
      if (!mockDb[col]) {mockDb[col] = [];}
      mockDb[col].push(doc);
      return doc;
    }),
    queryDocuments: jest.fn().mockImplementation(async (col, filters) => {
      return mockDb[col] || [];
    })
  };
});

describe('Juriq Backend Global Coverage Boost', () => {
  beforeEach(() => {
    resetMockDb();
    jest.clearAllMocks();
  });

  // ── 2. Middlewares Tests ────────────────────────────────────────────────────
  describe('Middlewares', () => {
    test('checkPlanAccess', async () => {
      const { checkPlanAccess } = await import('../middleware/checkPlanAccess.js');
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 1. Missing user / userId
      let next = jest.fn();
      await checkPlanAccess('documents')({}, res, next);
      expect(next).toHaveBeenCalled();

      // 2. User not found
      next = jest.fn();
      await checkPlanAccess('documents')({ user: { userId: 'missing_user' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 3. User under plan limits, planEndDate not expired, can access
      next = jest.fn();
      mockDb.users.push({
        _id: 'user_plan_ok',
        subscriptionPlan: 'pro',
        planEndDate: new Date(Date.now() + 100000)
      });
      await checkPlanAccess('documents')({ user: { userId: 'user_plan_ok' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 4. Plan expired -> revert to free -> free can't access pro-only feature 'documents' -> returns 403
      next = jest.fn();
      mockDb.users.push({
        _id: 'user_plan_expired',
        subscriptionPlan: 'pro',
        planEndDate: new Date(Date.now() - 100000)
      });
      await checkPlanAccess('documents')({ user: { userId: 'user_plan_expired' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 5. Plan expired with findByIdAndUpdate throwing an error (catch block in expiry revert)
      UserMock.findByIdAndUpdate.mockRejectedValueOnce(new Error('Update Error'));
      await checkPlanAccess('documents')({ user: { userId: 'user_plan_expired' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 6. Unknown featureName fallback to 'free'
      next = jest.fn();
      await checkPlanAccess('unknown_feature')({ user: { userId: 'user_plan_ok' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 7. General catch block (e.g. findById throws)
      next = jest.fn();
      UserMock.findById.mockReturnValueOnce(createRejectedQueryObj(new Error('DB Error')));
      await checkPlanAccess('documents')({ user: { userId: 'user_plan_ok' } }, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('enforcePlanLimits', async () => {
      const { enforcePlanLimits, trackAiUsage } = await import('../middleware/planEnforcement.js');
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      // 1. Missing user / userId
      let next = jest.fn();
      await enforcePlanLimits('case')({}, res, next);
      expect(next).toHaveBeenCalled();

      // 2. User not found
      next = jest.fn();
      await enforcePlanLimits('case')({ user: { userId: 'missing_user' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 3. User with plan limits, below limits
      const userObj = {
        _id: 'user_limit_test',
        plan: {
          type: 'pro',
          limits: { cases: 2, documents: 2, storageMB: 5, aiDailyCap: 2 }
        }
      };
      mockDb.users.push(userObj);

      // Case check under limits
      next = jest.fn();
      await enforcePlanLimits('case')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(next).toHaveBeenCalled();

      // Case check limit exceeded
      CaseMock.countDocuments.mockResolvedValueOnce(6);
      await enforcePlanLimits('case')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // Document check under limits
      next = jest.fn();
      DocumentMock.countDocuments.mockResolvedValueOnce(1);
      DocumentMock.aggregate.mockResolvedValueOnce([{ total: 1 * 1024 * 1024 }]);
      await enforcePlanLimits('document')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(next).toHaveBeenCalled();

      // Document count exceeded
      DocumentMock.countDocuments.mockResolvedValueOnce(3);
      await enforcePlanLimits('document')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // Document size/storage exceeded
      next = jest.fn();
      DocumentMock.countDocuments.mockResolvedValueOnce(1);
      DocumentMock.aggregate.mockResolvedValueOnce([{ total: 10 * 1024 * 1024 }]);
      await enforcePlanLimits('document')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // AI check under limits
      next = jest.fn();
      mockRedis.get.mockResolvedValueOnce('1');
      await enforcePlanLimits('ai')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(next).toHaveBeenCalled();

      // AI limit exceeded
      mockRedis.get.mockResolvedValueOnce('3');
      await enforcePlanLimits('ai')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // Trigger catch blocks
      next = jest.fn();
      UserMock.findById.mockReturnValueOnce(createRejectedQueryObj(new Error('DB Error')));
      await enforcePlanLimits('case')({ user: { userId: 'user_limit_test' } }, res, next);
      expect(next).toHaveBeenCalled();

      // trackAiUsage catch block
      mockRedis.incr.mockRejectedValueOnce(new Error('Redis Error'));
      await trackAiUsage('user_limit_test');
      
      // trackAiUsage success
      mockRedis.incr.mockResolvedValueOnce(1);
      await trackAiUsage('user_limit_test');
    });

    test('securityHeaders', async () => {
      process.env.NODE_ENV = 'production';
      const { generateNonce, applySecurityHeaders, cspReportHandler } = await import('../middleware/securityHeaders.js');
      process.env.NODE_ENV = 'test';
      
      // 1. generateNonce
      const reqNonce = { path: '/api/v1/cases' };
      const resNonce = { locals: {} };
      const nextNonce = jest.fn();
      generateNonce(reqNonce, resNonce, nextNonce);
      expect(resNonce.locals.nonce).toBeDefined();

      // 2. applySecurityHeaders in development with /api/ path
      const reqDev = { path: '/api/v1/cases' };
      const resDev = {
        locals: { nonce: 'test-nonce' },
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const nextDev = jest.fn();
      process.env.NODE_ENV = 'development';
      applySecurityHeaders(reqDev, resDev, nextDev);
      expect(resDev.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(resDev.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      // 3. applySecurityHeaders in production with non-api path
      const reqProd = { path: '/health' };
      const resProd = {
        locals: {},
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const nextProd = jest.fn();
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://sentry-mock-dsn';
      applySecurityHeaders(reqProd, resProd, nextProd);
      expect(resProd.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

      // 4. cspReportHandler - No body / no report
      const resReport = {
        status: jest.fn().mockReturnThis(),
        end: jest.fn()
      };
      cspReportHandler({ body: null }, resReport);
      expect(resReport.status).toHaveBeenCalledWith(400);

      // 5. cspReportHandler - Chrome Extension (ignored)
      const chromeReport = {
        body: {
          'csp-report': {
            'blocked-uri': 'chrome-extension://malicious'
          }
        }
      };
      cspReportHandler(chromeReport, resReport);
      expect(resReport.status).toHaveBeenCalledWith(204);

      // 6. cspReportHandler - Real violation (logged)
      const realReport = {
        body: {
          'csp-report': {
            'document-uri': 'http://app.com',
            'blocked-uri': 'http://evil.com',
            'violated-directive': 'script-src'
          }
        }
      };
      cspReportHandler(realReport, resReport);
      expect(resReport.status).toHaveBeenCalledWith(204);

      // 7. cspReportHandler - Body root parsing fallback
      const rootReport = {
        body: {
          'document-uri': 'http://app.com',
          'blocked-uri': 'http://evil.com'
        }
      };
      cspReportHandler(rootReport, resReport);
      expect(resReport.status).toHaveBeenCalledWith(204);

      // 8. cspReportHandler - Error handling (catch block)
      const errorReport = {
        get body() {
          throw new Error('simulate property getter crash');
        }
      };
      cspReportHandler(errorReport, resReport);
      expect(resReport.status).toHaveBeenCalledWith(204);
      process.env.NODE_ENV = 'test';
    });

    test('activityLogger', async () => {
      const { logActivity, createActivityLogger, logActivityAfterResponse } = await import('../middleware/activityLogger.js');
      
      // 1. logActivity success
      await logActivity('user_001', 'login', 'Logged in', 'user', 'user_001');

      // 2. logActivity error path
      const { createDocument } = await import('../services/mongodb.js');
      createDocument.mockRejectedValueOnce(new Error('simulate MongoDB save failure'));
      await logActivity('user_001', 'login', 'Logged in', 'user', 'user_001');

      // 3. createActivityLogger with parameter resolution and body/params fallback
      const req = { body: { id: 'body_123' }, params: {}, user: { userId: 'user_001' } };
      const res = {
        statusCode: 200,
        send: jest.fn().mockImplementation((data) => data)
      };
      const next = jest.fn();
      createActivityLogger('login', 'user')('Logged in', null)(req, res, next);
      expect(req.activityData.entityId).toBe('body_123');

      // createActivityLogger with params fallback
      const reqParam = { body: {}, params: { id: 'param_123' } };
      createActivityLogger('login', 'user')('Logged in', null)(reqParam, res, next);
      expect(reqParam.activityData.entityId).toBe('param_123');

      // createActivityLogger catch block
      const reqCrash = {
        get body() {
          throw new Error('simulate req body read crash');
        }
      };
      createActivityLogger('login', 'user')('Logged in', null)(reqCrash, res, next);
      expect(next).toHaveBeenCalled();

      // 4. logActivityAfterResponse with valid response
      const reqLogger = {
        activityData: { type: 'login', message: 'Logged in', entityType: 'user', entityId: 'user_001', metadata: {} },
        user: { userId: 'user_001' }
      };
      const resLogger = {
        statusCode: 200,
        send: (data) => data
      };
      logActivityAfterResponse(reqLogger, resLogger, next);
      
      // Call send to trigger the overridden method
      resLogger.send({ success: true });

      // 5. logActivityAfterResponse with error statusCode (should skip logging)
      const resLoggerError = {
        statusCode: 400,
        send: (data) => data
      };
      logActivityAfterResponse(reqLogger, resLoggerError, next);
      resLoggerError.send({ error: true });
    });

    test('accountLockout', async () => {
      const { checkAccountLockout, trackFailedLogin, clearFailedLogins } = await import('../middleware/accountLockout.js');
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 1. checkAccountLockout - no identifier
      let next = jest.fn();
      const middleware = checkAccountLockout();
      await middleware({ body: {} }, res, next);
      expect(next).toHaveBeenCalled();

      // 2. checkAccountLockout - not locked
      next = jest.fn();
      mockRedis.get.mockResolvedValueOnce(null);
      await middleware({ body: { email: 'lock@test.com' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 3. checkAccountLockout - locked
      const mockLockTime = Date.now() + 100000;
      mockRedis.get.mockResolvedValueOnce(String(mockLockTime));
      await middleware({ body: { email: 'lock@test.com' }, ip: '127.0.0.1', headers: {} }, res, next);
      expect(res.status).toHaveBeenCalledWith(423);

      // 4. trackFailedLogin - no identifier
      await trackFailedLogin({}, null);

      // 5. trackFailedLogin - count === 1 (first failure, should set expire)
      mockRedis.incr.mockResolvedValueOnce(1);
      await trackFailedLogin({ ip: '127.0.0.1', headers: {} }, 'lock@test.com');
      expect(mockRedis.expire).toHaveBeenCalled();

      // 6. trackFailedLogin - count === 3 (below limit)
      mockRedis.incr.mockResolvedValueOnce(3);
      await trackFailedLogin({ ip: '127.0.0.1', headers: {} }, 'lock@test.com');

      // 7. trackFailedLogin - count === 5 (locks account, deletes failures)
      mockRedis.incr.mockResolvedValueOnce(5);
      await trackFailedLogin({ ip: '127.0.0.1', headers: {} }, 'lock@test.com');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();

      // 8. clearFailedLogins - no identifier
      await clearFailedLogins(null);

      // 9. clearFailedLogins - success
      await clearFailedLogins('lock@test.com');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    test('requestId', async () => {
      const { requestId, requestLogger } = await import('../middleware/requestId.js');
      const res = { setHeader: jest.fn() };

      // 1. No headers (randomUUID)
      const req1 = { headers: {} };
      const next = jest.fn();
      requestId(req1, res, next);
      expect(req1.requestId).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req1.requestId);

      // 2. X-Request-Id header
      const req2 = { headers: { 'x-request-id': 'req_abc' } };
      requestId(req2, res, next);
      expect(req2.requestId).toBe('req_abc');

      // 3. X-Trace-Id header
      const req3 = { headers: { 'x-trace-id': 'trace_abc' } };
      requestId(req3, res, next);
      expect(req3.requestId).toBe('trace_abc');

      // 4. Traceparent header
      const req4 = { headers: { 'traceparent': 'parent_abc' } };
      requestId(req4, res, next);
      expect(req4.requestId).toBe('parent_abc');

      // 5. requestLogger with req.log having child function
      const childLog = { info: jest.fn() };
      const reqLogger1 = {
        requestId: 'id_1',
        log: {
          child: jest.fn().mockReturnValue(childLog)
        }
      };
      const logger1 = requestLogger(reqLogger1);
      expect(logger1).toBe(childLog);
      expect(reqLogger1.log.child).toHaveBeenCalledWith({ requestId: 'id_1' });

      // 6. requestLogger with req.log not having child function
      const reqLogger2 = {
        requestId: 'id_2',
        log: {
          info: jest.fn()
        }
      };
      const logger2 = requestLogger(reqLogger2);
      expect(logger2).toBe(reqLogger2.log);

      // 7. requestLogger fallback (no req.log)
      const reqLogger3 = {
        requestId: 'id_3'
      };
      const loggerPromise = requestLogger(reqLogger3);
      expect(loggerPromise).toBeInstanceOf(Promise);
      const logger3 = await loggerPromise;
      expect(logger3).toBeDefined();
    });

    test('requirePlan', async () => {
      const { requirePlan } = await import('../middleware/requirePlan.js');
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Startup validation: invalid plan
      expect(() => requirePlan('invalid')).toThrow('requirePlan: unknown plan');
      expect(() => requirePlan.atLeast('invalid')).toThrow('requirePlan.atLeast: unknown plan');

      const middlewarePro = requirePlan('pro');
      const middlewareAtLeastPro = requirePlan.atLeast('pro');

      // 1. requirePlan - unauthenticated (no user)
      let next = jest.fn();
      await middlewarePro({}, res, next);
      expect(res.status).toHaveBeenCalledWith(401);

      // 2. requirePlan - resolved user is free, pro is required (denied)
      next = jest.fn();
      mockDb.users.push({
        _id: 'user_free_role',
        subscriptionPlan: 'free'
      });
      await middlewarePro({ user: { userId: 'user_free_role' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 3. requirePlan - resolved user has expired plan -> falls back to free -> denied
      next = jest.fn();
      mockDb.users.push({
        _id: 'user_expired_role',
        subscriptionPlan: 'pro',
        planEndDate: new Date(Date.now() - 100000)
      });
      await middlewarePro({ user: { userId: 'user_expired_role' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 4. Expiry update error (catch block path in resolveEffectivePlan)
      next = jest.fn();
      UserMock.updateOne.mockRejectedValueOnce(new Error('Update failed'));
      await middlewarePro({ user: { userId: 'user_expired_role' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 5. User not found (defaults to free)
      next = jest.fn();
      await middlewarePro({ user: { userId: 'nonexistent_user' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 6. requirePlan - database error during fetch (fail-open)
      next = jest.fn();
      UserMock.findById.mockReturnValueOnce(createRejectedQueryObj(new Error('DB Query Failed')));
      await middlewarePro({ user: { userId: 'user_free_role' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 7. requirePlan.atLeast - unauthenticated (no user)
      await middlewareAtLeastPro({}, res, next);
      expect(res.status).toHaveBeenCalledWith(401);

      // 8. requirePlan.atLeast - resolved user is free, pro is required (denied)
      next = jest.fn();
      await middlewareAtLeastPro({ user: { userId: 'user_free_role' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);

      // 9. requirePlan.atLeast - database error during fetch (fail-open)
      next = jest.fn();
      UserMock.findById.mockReturnValueOnce(createRejectedQueryObj(new Error('DB Query Failed')));
      await middlewareAtLeastPro({ user: { userId: 'user_free_role' } }, res, next);
      expect(next).toHaveBeenCalled();

      // 10. requirePlan - user is allowed
      next = jest.fn();
      mockDb.users.push({
        _id: 'user_elite_role',
        subscriptionPlan: 'pro'
      });
      await middlewarePro({ user: { userId: 'user_elite_role' } }, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('audit', async () => {
      jest.useFakeTimers();
      const { auditLog, auditMiddleware } = await import('../middleware/audit.js');

      // 1. auditLog with full fields, req.user.userId, req.ip, headers
      const req1 = {
        user: { userId: 'user_001' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Chrome' }
      };
      auditLog(req1, 'login', 'user', 'res_001', { extra: 1 });
      jest.runAllTimers();

      // 2. auditLog with req.user._id, req.connection.remoteAddress
      const req2 = {
        user: { _id: 'user_id_field' },
        connection: { remoteAddress: '10.0.0.1' }
      };
      auditLog(req2, 'logout', 'user', null);
      jest.runAllTimers();

      // 3. auditLog with no user info, connection info
      const req3 = {};
      auditLog(req3, 'unauthorized_action', 'user', null);
      jest.runAllTimers();

      // 4. auditLog database write exception (catch block path)
      AuditLogMock.create.mockRejectedValueOnce(new Error('Audit DB write error'));
      auditLog(req1, 'login', 'user', 'res_001');
      jest.runAllTimers();

      // 5. auditMiddleware with custom getResourceId and getMetadata, 200 OK
      const getResId = jest.fn().mockReturnValue('custom_res_id');
      const getMeta = jest.fn().mockReturnValue({ custom: 'meta' });
      const reqMid1 = { params: { id: 'param_id' } };
      const resMid1 = {
        statusCode: 200,
        json: jest.fn().mockImplementation((x) => x)
      };
      const nextMid1 = jest.fn();

      const middleware1 = auditMiddleware('delete', 'document', getResId, getMeta);
      middleware1(reqMid1, resMid1, nextMid1);
      resMid1.json({ deleted: true });
      expect(getResId).toHaveBeenCalled();
      expect(getMeta).toHaveBeenCalled();

      // 6. auditMiddleware default extractors, 400 Bad Request (should not log)
      const reqMid2 = { params: { id: 'param_id' } };
      const resMid2 = {
        statusCode: 400,
        json: jest.fn().mockImplementation((x) => x)
      };
      const nextMid2 = jest.fn();

      const middleware2 = auditMiddleware('create', 'document');
      middleware2(reqMid2, resMid2, nextMid2);
      resMid2.json({ error: 'invalid data' });

      jest.useRealTimers();
    });
  });

  // ── 3. Utilities Tests ─────────────────────────────────────────────────────
  describe('Utilities', () => {
    test('cache', async () => {
      const { cache } = await import('../utils/cache.js');
      const fetchFn = jest.fn().mockResolvedValue({ val: 42 });

      // 1. Cache miss - store data
      mockRedis.get.mockResolvedValueOnce(null);
      const data1 = await cache.getOrSet('test_key', 300, fetchFn);
      expect(data1.val).toBe(42);
      expect(fetchFn).toHaveBeenCalled();

      // 2. Cache hit
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ val: 42 }));
      const data2 = await cache.getOrSet('test_key', 300, fetchFn);
      expect(data2.val).toBe(42);

      // 3. Cache read error (catch block)
      mockRedis.get.mockRejectedValueOnce(new Error('Redis Read Error'));
      const fetchFn2 = jest.fn().mockResolvedValue({ val: 99 });
      const data3 = await cache.getOrSet('test_key', 300, fetchFn2);
      expect(data3.val).toBe(99);

      // 4. Cache write error (catch block)
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.set.mockRejectedValueOnce(new Error('Redis Write Error'));
      const data4 = await cache.getOrSet('test_key', 300, fetchFn2);
      expect(data4.val).toBe(99);

      // 5. Cache invalidate key error (catch block)
      mockRedis.del.mockRejectedValueOnce(new Error('Redis Del Error'));
      await cache.invalidate('test_key');

      // 6. invalidatePattern - redis not available
      mockRedis.isAvailable.mockReturnValueOnce(false);
      await cache.invalidatePattern('prefix_');

      // 7. invalidatePattern - rawClient not available
      mockRedis.isAvailable.mockReturnValueOnce(true);
      const originalRaw = mockRedis.raw;
      mockRedis.raw = jest.fn().mockReturnValueOnce(null);
      await cache.invalidatePattern('prefix_');
      mockRedis.raw = originalRaw;

      // 8. invalidatePattern - success, multiple keys found and deleted
      mockRedis.isAvailable.mockReturnValueOnce(true);
      const rawMock = {
        scan: jest.fn()
          .mockResolvedValueOnce(['next_cursor', ['key1', 'key2']])
          .mockResolvedValueOnce(['0', []]),
        del: jest.fn().mockResolvedValue(2)
      };
      mockRedis.raw = jest.fn().mockReturnValue(rawMock);
      await cache.invalidatePattern('prefix_');
      expect(rawMock.scan).toHaveBeenCalled();
      expect(rawMock.del).toHaveBeenCalledWith('key1', 'key2');
      mockRedis.raw = originalRaw;

      // 9. invalidatePattern - error path (catch block)
      mockRedis.isAvailable.mockReturnValueOnce(true);
      mockRedis.raw = jest.fn().mockImplementationOnce(() => {
        throw new Error('Raw client error');
      });
      await cache.invalidatePattern('prefix_');
      mockRedis.raw = originalRaw;

      // 10. Key namespacing edge cases
      expect(cache.key.user('1')).toBe('user:1');
      expect(cache.key.userList('own', 2)).toBe('users:list:own:2');
      expect(cache.key.dashboard('1')).toBe('dashboard:metrics:1');
      expect(cache.key.cases('own', 3)).toBe('cases:own:3');
      expect(cache.key.clients('own', 3)).toBe('clients:own:3');
      expect(cache.key.documents('own', null, 3)).toBe('docs:own:root:3');
      expect(cache.key.documents('own', 'folder1', 3)).toBe('docs:own:folder1:3');
      expect(cache.key.invoices('own', 3)).toBe('invoices:own:3');
    });

    test('conflictDetection', async () => {
      const {
        getConflictScopes,
        checkTimeOverlap,
        convertToUTC,
        computeHearingTimes,
        checkHearingConflicts,
        validateHearingData
      } = await import('../utils/conflictDetection.js');

      expect(getConflictScopes()).toContain('courtroom');
      expect(checkTimeOverlap(new Date(100), new Date(200), new Date(150), new Date(250))).toBe(true);

      const utcDate = convertToUTC('2026-06-10', '10:00', 'Asia/Kolkata');
      expect(utcDate).toBeDefined();

      const computed = computeHearingTimes('2026-06-10', '10:00', 'Asia/Kolkata', 60);
      expect(computed.startAt).toBeDefined();

      const conflicts = await checkHearingConflicts('user_001', new Date(), new Date(), {}, null);
      expect(conflicts).toHaveLength(0);

      const validation = validateHearingData({ startAt: new Date(), endAt: new Date(Date.now() + 1000) });
      expect(validation.valid).toBe(true);
    });

    test('encryption', async () => {
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const { encrypt, decrypt, blindHash } = await import('../utils/encryption.js');

      const text = 'hello secret';
      const enc = encrypt(text);
      expect(decrypt(enc)).toBe(text);
      expect(blindHash(text)).toBeDefined();
    });

    test('env', async () => {
      const { getFirebaseWebApiKey, ensureFirebaseWebApiKey } = await import('../utils/env.js');

      // 1. When FIREBASE_WEB_API_KEY is defined
      process.env.FIREBASE_WEB_API_KEY = 'web-key';
      expect(getFirebaseWebApiKey()).toBe('web-key');
      expect(ensureFirebaseWebApiKey()).toBe('web-key');

      // 2. When FIREBASE_WEB_API_KEY is not defined, but FIREBASE_API_KEY is defined
      delete process.env.FIREBASE_WEB_API_KEY;
      process.env.FIREBASE_API_KEY = 'api-key';
      expect(getFirebaseWebApiKey()).toBe('api-key');

      // 3. When both are missing
      delete process.env.FIREBASE_API_KEY;
      expect(getFirebaseWebApiKey()).toBe('');

      // 4. In development, both missing (should warn and return '')
      process.env.NODE_ENV = 'development';
      const warnKey = ensureFirebaseWebApiKey();
      expect(warnKey).toBe('');

      // 5. In production, both missing, with requireInProduction = true (should throw)
      process.env.NODE_ENV = 'production';
      expect(() => ensureFirebaseWebApiKey()).toThrow('FIREBASE_WEB_API_KEY');

      // 6. In production, both missing, but requireInProduction = false (should warn and return '')
      const noThrowKey = ensureFirebaseWebApiKey({ requireInProduction: false });
      expect(noThrowKey).toBe('');
      process.env.NODE_ENV = 'test';
    });

    test('keepAlive', async () => {
      jest.useFakeTimers();
      const { startKeepAlive } = await import('../utils/keepAlive.js');
      
      // 1. Not in production
      process.env.NODE_ENV = 'development';
      startKeepAlive();

      // 2. Production but no GOOGLE_CALLBACK_URL
      process.env.NODE_ENV = 'production';
      delete process.env.GOOGLE_CALLBACK_URL;
      startKeepAlive();

      // 3. Production, GOOGLE_CALLBACK_URL set, HTTPS protocol
      process.env.GOOGLE_CALLBACK_URL = 'https://my-app.render.com/oauth/google/callback';
      startKeepAlive();
      jest.advanceTimersByTime(14 * 60 * 1000 + 100);

      // 4. Production, GOOGLE_CALLBACK_URL set, HTTP protocol, non-200 / error path
      process.env.GOOGLE_CALLBACK_URL = 'http://my-app.render.com/oauth/google/callback';
      startKeepAlive();
      jest.advanceTimersByTime(14 * 60 * 1000 + 100);

      // 5. Invalid URL path for url parse error
      process.env.GOOGLE_CALLBACK_URL = 'invalid-url';
      startKeepAlive();

      process.env.NODE_ENV = 'test';
      jest.useRealTimers();
    });

    test('keyStore', async () => {
      process.env.JWT_SECRET = 'my-jwt-secret-minimum-32-chars-long!!';
      process.env.JWT_REFRESH_SECRET = 'my-jwt-refresh-secret-minimum-32-chars-long!!';
      const { signToken, verifyToken, signRefreshToken, verifyRefreshToken, getActiveKid } = await import('../utils/keyStore.js');

      const token = signToken({ userId: '123' });
      expect(verifyToken(token).userId).toBe('123');

      const rToken = signRefreshToken({ userId: '123' });
      expect(verifyRefreshToken(rToken).userId).toBe('123');

      expect(getActiveKid()).toBeDefined();
    });

    test('mailer', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      const { sendPasswordResetEmail } = await import('../utils/mailer.js');

      const res = await sendPasswordResetEmail({ to: 'user@test.com', resetUrl: 'http://test.com' });
      expect(res.ok).toBe(true);
    });

    test('startupChecks', async () => {
      const { runStartupChecks } = await import('../utils/startupChecks.js');
      runStartupChecks();
    });

    test('alerting', async () => {
      const { sendAlert, alertCritical, alertWarning } = await import('../utils/alerting.js');
      await sendAlert({ level: 'warning', title: 'Test warning', message: 'Something is wrong' });
      await alertCritical('Critical issue', 'Action required');
      await alertWarning('Warning issue', 'Check logs');
    });

    test('businessMetrics', async () => {
      const { businessMetrics } = await import('../utils/businessMetrics.js');
      businessMetrics.loginSuccess.inc({ method: 'password' });
      expect(businessMetrics.loginSuccess).toBeDefined();
    });

    test('userCache', async () => {
      const { getCachedUser, setCachedUser, invalidateUserCache } = await import('../utils/userCache.js');
      
      // Positive flows
      await setCachedUser('user_001', { _id: 'user_001', email: 'user@test.com' });
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ userId: 'user_001', email: 'user@test.com' }));
      const cached = await getCachedUser('user_001');
      expect(cached.email).toBe('user@test.com');
      await invalidateUserCache('user_001');

      // redis not available flows
      mockRedis.isAvailable.mockReturnValueOnce(false);
      await setCachedUser('user_001', { _id: 'user_001', email: 'user@test.com' });
      mockRedis.isAvailable.mockReturnValueOnce(false);
      const cachedUnavailable = await getCachedUser('user_001');
      expect(cachedUnavailable).toBeNull();
      mockRedis.isAvailable.mockReturnValueOnce(false);
      await invalidateUserCache('user_001');

      // Redis errors / exceptions flows
      mockRedis.set.mockRejectedValueOnce(new Error('Redis Write Error'));
      await setCachedUser('user_001', { _id: 'user_001', email: 'user@test.com' });

      mockRedis.get.mockRejectedValueOnce(new Error('Redis Read Error'));
      const cachedError = await getCachedUser('user_001');
      expect(cachedError).toBeNull();

      mockRedis.del.mockRejectedValueOnce(new Error('Redis Del Error'));
      await invalidateUserCache('user_001');
    });
  });

  // ── 4. Services Tests ──────────────────────────────────────────────────────
  describe('Services', () => {
    test('notificationService', async () => {
      const { notifyUser } = await import('../services/notificationService.js');
      mockDb.users.push({ _id: 'user_001', email: 'user@test.com', name: 'Test User' });

      await notifyUser('user_001', 'payment_success', { amountPaise: 49900 });
      await notifyUser('user_001', 'refund_processed', { amountPaise: 49900, refundId: 'rfnd_1' });
      await notifyUser('user_001', 'abuse_blocked');
    });

    test('backupService', async () => {
      const { runBackup, startBackupJob } = await import('../services/backupService.js');
      await runBackup();
      startBackupJob();
    });

    test('alertQueueService', async () => {
      const { enqueueAlert, startAlertWorker } = await import('../services/alertQueueService.js');
      await enqueueAlert('security_log', { severity: 'HIGH' });
      startAlertWorker();
    });

    test('emailService', async () => {
      const { sendEmail, queueEmail } = await import('../services/emailService.js');
      const res = await sendEmail({ to: 'user@test.com', subject: 'Hello', html: '<p>Hi</p>' });
      expect(res.success).toBe(true);

      await queueEmail({ to: 'user@test.com', subject: 'Hello Async', html: '<p>Hi</p>' });
    });

    test('invoiceService', async () => {
      const { generatePaymentInvoice, getInvoiceById, getInvoicesForUser } = await import('../services/invoiceService.js');
      mockDb.users.push({ _id: 'user_001', email: 'user@test.com', name: 'Test User' });

      const invoice = await generatePaymentInvoice({
        userId: 'user_001',
        subscriptionId: 'sub_123',
        razorpayPaymentId: 'pay_123',
        planType: 'pro',
        billingCycle: 'monthly',
        totalPaise: 58880,
        paymentDate: new Date()
      });
      expect(invoice).toBeDefined();

      const fetched = await getInvoiceById(invoice._id, 'user_001');
      expect(fetched).toBeDefined();

      const userList = await getInvoicesForUser('user_001');
      expect(userList.total).toBe(1);
    });

    test('reconciliation and sync', async () => {
      const { runReconciliationJob, runSyncJob } = await import('../services/reconciliation.js');
      mockDb.subscriptions.push({
        _id: 'sub_001',
        userId: 'user_001',
        razorpaySubscriptionId: 'sub_rzp_123',
        planType: 'pro',
        billingCycle: 'monthly',
        status: 'created'
      });

      await runReconciliationJob();
      await runSyncJob();
    });

    test('settlementService', async () => {
      const { syncSettlements, startSettlementJob } = await import('../services/settlementService.js');
      await syncSettlements();
      startSettlementJob();
    });

    test('metricsService', async () => {
      const { inc, dec, getSnapshot, resetMetrics } = await import('../services/metricsService.js');
      await inc('webhooks_received', 1);
      await dec('webhooks_received', 1);
      const snapshot = await getSnapshot();
      expect(snapshot.uptimeSeconds).toBeDefined();
      await resetMetrics();
    });

    test('legalDataService', async () => {
      const { updateLegalActs, updateCaseLaws, runFullRefresh } = await import('../services/legalDataService.js');
      await updateLegalActs();
      await updateCaseLaws();
      await runFullRefresh();
    });
  });

  // ── 5. Community Services Tests ─────────────────────────────────────────────
  describe('Community Services', () => {
    test('observabilityService', async () => {
      const { observability } = await import('../community/services/observabilityService.js');
      observability.debug({}, 'debug msg');
      observability.info({}, 'info msg');
      observability.warn({}, 'warn msg');
      observability.error(new Error('tamper'), 'error msg', { userId: 'user_001', conversationId: 'conv_123', action: 'test' });
    });

    test('encryptionService', async () => {
      const {
        encryptMessage,
        decryptMessage,
        encryptAttachmentMetadata,
        decryptAttachmentMetadata,
        decryptMessages,
        generatePreview,
        isNonceReplayed
      } = await import('../community/services/encryptionService.js');

      const enc = encryptMessage('plain', 'conv_001');
      const dec = decryptMessage(enc.ciphertext, enc.iv, enc.authTag, 'conv_001', enc.keyVersion);
      expect(dec).toBe('plain');

      const encMeta = encryptAttachmentMetadata('filename.pdf', 'http://url.com', 'conv_001');
      const decMeta = decryptAttachmentMetadata(encMeta.encryptedData, encMeta.iv, encMeta.authTag, 'conv_001', encMeta.keyVersion);
      expect(decMeta.filename).toBe('filename.pdf');

      const list = decryptMessages([{ encryptedContent: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, conversationId: 'conv_001' }]);
      expect(list[0].content).toBe('plain');

      expect(generatePreview('image', 't')).toBe('📷 Image');
      expect(generatePreview('text', 'hello')).toBe('hello');

      const replayed = await isNonceReplayed('conv_001', 'iv_001');
      expect(replayed).toBe(false);
    });

    test('presenceService', async () => {
      const { setUserOnline, setSocketOffline, refreshPresence, getUserPresence, getBulkPresence } = await import('../community/services/presenceService.js');
      await setUserOnline('user_001', 'socket_123', 'web', 'Mozilla...', '127.0.0.1');
      await refreshPresence('user_001');
      await getUserPresence('user_001');
      await getBulkPresence(['user_001']);
      await setSocketOffline('socket_123');
    });
  });
});
