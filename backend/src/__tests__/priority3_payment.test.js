import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  subscriptions: [],
  couponlogs: [],
  paymentlogs: [],
  refundlogs: [],
  settlementlogs: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.subscriptions = [];
  mockStore.couponlogs = [];
  mockStore.paymentlogs = [];
  mockStore.refundlogs = [];
  mockStore.settlementlogs = [];
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
  if (wrapped) {
    Object.assign(query, wrapped);
  }
  return query;
}

function createMockModel(storeName) {
  function MockClass(data) {
    Object.assign(this, data);
  }
  MockClass.prototype.save = jest.fn().mockImplementation(async function() {
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId().toString();
      mockStore[storeName].push(this);
    }
    return this;
  });
  MockClass.findById = jest.fn().mockImplementation((id) => {
    const doc = mockStore[storeName].find(x => String(x._id) === String(id) || String(x.id) === String(id));
    const wrapped = doc ? {
      ...doc,
      save: jest.fn().mockImplementation(async function() {
        Object.assign(doc, this);
        return doc;
      }),
    } : null;
    return createQueryObj(wrapped);
  });
  MockClass.findByIdAndUpdate = jest.fn().mockImplementation((id, update) => {
    const doc = mockStore[storeName].find(x => String(x._id) === String(id) || String(x.id) === String(id));
    if (doc) {
      if (update.$push) {
        for (const [k, v] of Object.entries(update.$push)) {
          if (!doc[k]) {doc[k] = [];}
          doc[k].push(v);
        }
      }
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
    }
    return Promise.resolve(doc);
  });
  MockClass.findOneAndUpdate = jest.fn().mockImplementation((query, update) => {
    // Basic query match
    const doc = mockStore[storeName].find(x => {
      const matchQuery = query._id ? (String(x._id) === String(query._id)) : true;
      return matchQuery;
    });
    if (doc && update.$set) {
      Object.assign(doc, update.$set);
    }
    return createQueryObj(doc);
  });
  MockClass.findOne = jest.fn().mockImplementation((query) => {
    const doc = mockStore[storeName].find(x => {
      return Object.entries(query).every(([k, v]) => {
        const val = x[k];
        if (v === false || v === 'false') {
          return !val || String(val) === 'false';
        }
        if (v && typeof v === 'object' && v.$in) {
          return v.$in.includes(val);
        }
        return String(val) === String(v);
      });
    });
    const wrapped = doc ? {
      ...doc,
      save: jest.fn().mockImplementation(async function() {
        Object.assign(doc, this);
        return doc;
      }),
    } : null;
    return createQueryObj(wrapped);
  });
  MockClass.find = jest.fn().mockImplementation((query) => {
    const list = mockStore[storeName].filter(x => {
      return Object.entries(query).every(([k, v]) => String(x[k]) === String(v));
    });
    return createQueryObj(list);
  });
  MockClass.create = jest.fn().mockImplementation(async (data) => {
    const doc = { ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() };
    mockStore[storeName].push(doc);
    return doc;
  });
  MockClass.countDocuments = jest.fn().mockImplementation(async (query) => {
    return mockStore[storeName].length;
  });
  MockClass.updateOne = jest.fn().mockImplementation((query, update) => {
    const docs = mockStore[storeName].filter(x => {
      return Object.entries(query).every(([k, v]) => String(x[k]) === String(v));
    });
    const setNested = (obj, path, value) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {current[parts[i]] = {};}
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    };
    const incNested = (obj, path, value) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {current[parts[i]] = {};}
        current = current[parts[i]];
      }
      const last = parts[parts.length - 1];
      current[last] = (current[last] || 0) + value;
    };
    const unsetNested = (obj, path) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current) {current = current[parts[i]];}
      }
      if (current) {delete current[parts[parts.length - 1]];}
    };
    for (const doc of docs) {
      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          setNested(doc, k, v);
        }
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          incNested(doc, k, v);
        }
      }
      if (update.$unset) {
        for (const k of Object.keys(update.$unset)) {
          unsetNested(doc, k);
        }
      }
    }
    return Promise.resolve({ modifiedCount: docs.length });
  });
  return { default: MockClass };
}

jest.unstable_mockModule('../models/User.js', () => createMockModel('users'));
jest.unstable_mockModule('../models/Subscription.js', () => createMockModel('subscriptions'));
jest.unstable_mockModule('../models/CouponUsageLog.js', () => createMockModel('couponlogs'));
jest.unstable_mockModule('../models/PaymentLog.js', () => createMockModel('paymentlogs'));
jest.unstable_mockModule('../models/RefundLog.js', () => createMockModel('refundlogs'));
jest.unstable_mockModule('../models/SettlementLog.js', () => createMockModel('settlementlogs'));

// Mock Razorpay
const mockRzpSubscriptionsCreate = jest.fn().mockResolvedValue({ id: 'sub_rzp_123', customer_id: 'cust_123' });
const mockRzpSubscriptionsCancel = jest.fn().mockResolvedValue({ status: 'cancelled' });
const mockRzpSubscriptionsFetch = jest.fn().mockResolvedValue({ status: 'active', id: 'sub_rzp_123' });
const mockRzpPaymentsFetch = jest.fn().mockResolvedValue({ status: 'captured', created_at: Math.floor(Date.now() / 1000), amount: 49900 });
const mockRzpPaymentsRefund = jest.fn().mockResolvedValue({ id: 'rfnd_123' });

class MockRazorpay {
  constructor() {
    this.subscriptions = {
      create: mockRzpSubscriptionsCreate,
      cancel: mockRzpSubscriptionsCancel,
      fetch: mockRzpSubscriptionsFetch,
    };
    this.payments = {
      fetch: mockRzpPaymentsFetch,
      refund: mockRzpPaymentsRefund,
    };
  }
}

jest.unstable_mockModule('razorpay', () => ({
  default: MockRazorpay,
}));

// Mock services & utilities
jest.unstable_mockModule('../services/notificationService.js', () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/metricsService.js', () => ({
  inc: jest.fn(),
  getSnapshot: jest.fn().mockResolvedValue({ refunds: 0, payments: 100 }),
}));

jest.unstable_mockModule('../services/invoiceService.js', () => ({
  generatePaymentInvoice: jest.fn().mockResolvedValue({}),
}));

jest.unstable_mockModule('../utils/userCache.js', () => ({
  getCachedUser: jest.fn().mockImplementation(async (id) => {
    const user = mockStore.users.find(u => String(u._id) === String(id));
    return user || null;
  }),
  setCachedUser: jest.fn().mockResolvedValue(undefined),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../utils/redis.js', () => ({
  redis: {
    exists: jest.fn().mockResolvedValue(0),
    isAvailable: jest.fn().mockReturnValue(false),
  },
  default: {
    exists: jest.fn().mockResolvedValue(0),
    isAvailable: jest.fn().mockReturnValue(false),
  }
}));

jest.unstable_mockModule('../middleware/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const mockSession = {
  withTransaction: jest.fn().mockImplementation(async (fn) => { await fn(); }),
  endSession: jest.fn().mockResolvedValue(undefined),
};

jest.unstable_mockModule('mongoose', () => ({
  default: {
    ...mongoose,
    startSession: jest.fn().mockResolvedValue(mockSession),
  },
  Types: mongoose.Types,
  Schema: mongoose.Schema,
}));

// ── 2. Express App Building ──────────────────────────────────────────────────

async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.NODE_ENV = 'test';
  process.env.RAZORPAY_KEY_ID = 'test-key-id';
  process.env.RAZORPAY_KEY_SECRET = 'test-key-secret';
  process.env.RAZORPAY_PLAN_ID_PRO = 'plan_pro_123';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: subscriptionRouter } = await import('../routes/subscription.js');
  const { default: paymentRouter } = await import('../routes/payment.js');
  const { default: adminPaymentRouter } = await import('../routes/adminPayment.js');

  app.use('/api/v1/subscription', subscriptionRouter);
  app.use('/api/v1/payment', paymentRouter);
  app.use('/api/v1/admin/payment', adminPaymentRouter);

  return app;
}

// ── 3. Test Cases ────────────────────────────────────────────────────────────

describe('Priority 3 — Subscription and Payment Lifecycle', () => {
  let app;
  let userAToken;
  let adminToken;
  const userAId = '654321098765432109876543';
  const adminId = '987654321098765432109876';

  beforeAll(async () => {
    app = await buildApp();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();

    mockStore.users.push(
      { _id: userAId, id: userAId, email: 'userA@test.com', role: 'lawyer', status: 'active', subscriptionPlan: 'free', securityFlags: { blocked: false, abuseScore: 0 } },
      { _id: adminId, id: adminId, email: 'admin@test.com', role: 'admin', status: 'active', subscriptionPlan: 'free', securityFlags: { blocked: false, abuseScore: 0 } }
    );

    userAToken = jwt.sign({ userId: userAId, email: 'userA@test.com', role: 'lawyer' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: adminId, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET);
  });

  // ── 3.1 Plan Mutations (planService) ───────────────────────────────────────
  describe('planService Direct Tests', () => {
    test('updateUserPlan upgrades user plan info', async () => {
      const { updateUserPlan, getUserPlanInfo } = await import('../services/planService.js');
      const updated = await updateUserPlan(userAId, 'pro', 'monthly');
      
      expect(updated.subscriptionPlan).toBe('pro');
      const info = await getUserPlanInfo(userAId);
      expect(info.plan).toBe('pro');
    });

    test('revertToFree downgrades user to free plan', async () => {
      const { updateUserPlan, revertToFree, getUserPlanInfo } = await import('../services/planService.js');
      await updateUserPlan(userAId, 'pro', 'monthly');
      const reverted = await revertToFree(userAId);

      expect(reverted.subscriptionPlan).toBe('free');
      const info = await getUserPlanInfo(userAId);
      expect(info.plan).toBe('free');
    });

    test('flagUserAbuse increases abuse score and auto-blocks user', async () => {
      const { flagUserAbuse } = await import('../services/planService.js');
      
      // Call twice to exceed threshold of 50
      await flagUserAbuse(userAId, 30);
      await flagUserAbuse(userAId, 30);

      const user = mockStore.users.find(u => u._id === userAId);
      expect(user.securityFlags.blocked).toBe(true);
      expect(user.subscriptionPlan).toBe('free');
    });
  });

  // ── 3.2 Subscription Routes ────────────────────────────────────────────────
  describe('Subscription Routes', () => {
    test('GET /plan returns current user plan info', async () => {
      const res = await request(app)
        .get('/api/v1/subscription/plan')
        .set('Cookie', `token=${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.plan).toBe('free');
    });

    test('POST /apply-coupon applies coupon to grant elite plan access', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/apply-coupon')
        .set('Cookie', `token=${userAToken}`)
        .send({ couponCode: 'WELCOMETOJURIQ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.plan.plan).toBe('elite');
    });

    test('POST /apply-coupon rejects invalid coupon code', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/apply-coupon')
        .set('Cookie', `token=${userAToken}`)
        .send({ couponCode: 'INVALIDCODE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_COUPON');
    });
  });

  // ── 3.3 Payment Routes ─────────────────────────────────────────────────────
  describe('Payment Routes', () => {
    test('POST /create-subscription initiates a Razorpay subscription', async () => {
      const res = await request(app)
        .post('/api/v1/payment/create-subscription')
        .set('Cookie', `token=${userAToken}`)
        .send({ planKey: 'pro' });

      expect(res.status).toBe(201);
      expect(res.body.subscriptionId).toBe('sub_rzp_123');
      expect(res.body.planType).toBe('pro');
    });

    test('POST /verify-payment validates the Razorpay checkout signature', async () => {
      // Create subscription in store first
      const SubscriptionModel = (await import('../models/Subscription.js')).default;
      const sub = await SubscriptionModel.create({
        userId: userAId,
        razorpaySubscriptionId: 'sub_rzp_verified',
        razorpayPlanId: 'plan_pro_123',
        planType: 'pro',
        billingCycle: 'monthly',
        amountPaise: 49900,
        status: 'created',
      });

      const keySecret = 'test-key-secret';
      const body = `pay_123|sub_rzp_verified`;
      const signature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payment/verify-payment')
        .set('Cookie', `token=${userAToken}`)
        .send({
          razorpay_payment_id: 'pay_123',
          razorpay_subscription_id: 'sub_rzp_verified',
          razorpay_signature: signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
    });
  });

  // ── 3.4 Admin Payment Oversight Routes ──────────────────────────────────────
  describe('Admin Payment Oversight Routes', () => {
    let sub;

    beforeEach(async () => {
      const SubscriptionModel = (await import('../models/Subscription.js')).default;
      sub = await SubscriptionModel.create({
        userId: userAId,
        razorpaySubscriptionId: 'sub_rzp_refund',
        razorpayPlanId: 'plan_pro_123',
        planType: 'pro',
        billingCycle: 'monthly',
        amountPaise: 49900,
        status: 'active',
        lastPaymentId: 'pay_refund_123',
      });
    });

    test('POST /refund/:subscriptionId issues a refund and reverts user plan', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/payment/refund/${sub._id}`)
        .set('Cookie', `token=${adminToken}`)
        .send({ reason: 'Refunding customer request due to change of mind' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      
      const user = mockStore.users.find(u => u._id === userAId);
      expect(user.subscriptionPlan).toBe('free');
    });

    test('GET /logs returns PaymentLog history', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payment/logs')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('GET /metrics returns payment snapshot metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payment/metrics?range=24h')
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
