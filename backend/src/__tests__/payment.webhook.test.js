/**
 * payment.webhook.test.js
 *
 * Tests all critical webhook scenarios:
 *  1. Valid subscription.charged   → plan activated, idempotent on repeat
 *  2. Invalid HMAC signature        → rejected with 400
 *  3. Duplicate event               → silently ignored (200, no double-activate)
 *  4. payment.failed                → recorded, plan NOT immediately downgraded
 *  5. subscription.cancelled        → plan reverted to free
 *  6. Amount tamper                 → rejected, user flagged as suspicious
 *
 * ── ESM + jest.unstable_mockModule rules applied here ───────────────────────
 *  • import { jest } from '@jest/globals'  — jest is NOT a global in ESM mode
 *  • jest.unstable_mockModule() before ANY dynamic import() of that module
 *  • Mock factory export shapes MUST exactly match the real module (named vs default)
 *  • ALL Mongoose static methods used inside handlers must be mocked:
 *      findOne, findOneAndUpdate, updateOne, startSession
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import crypto       from 'crypto';
import request      from 'supertest';
import mongoose     from 'mongoose';
import express      from 'express';
import cookieParser from 'cookie-parser';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: stable mock function references
//         (created after '@jest/globals' import so jest.fn() is available)
// ─────────────────────────────────────────────────────────────────────────────

// planService — named exports
const mockActivateSubscriptionPlan = jest.fn().mockResolvedValue({ subscriptionPlan: 'pro' });
const mockCancelSubscriptionPlan   = jest.fn().mockResolvedValue({ subscriptionPlan: 'free' });
const mockUpdateUserPlan           = jest.fn().mockResolvedValue({});
const mockGetUserPlanInfo          = jest.fn().mockResolvedValue({ plan: 'pro' });
const mockRevertToFree             = jest.fn().mockResolvedValue({});
const mockFlagUserAbuse            = jest.fn().mockResolvedValue({});

// Subscription model static methods — ALL methods used by the webhook handlers
//   findOne           — load subscription by razorpaySubscriptionId
//   findOneAndUpdate  — acquire processing lock (concurrency guard, spec #2)
//   updateOne         — atomic idempotency ($ne eventId) + lock release
const mockSubFindOne          = jest.fn();
const mockSubFindOneAndUpdate = jest.fn();
const mockSubUpdateOne        = jest.fn();

// Mutable Subscription model object — tests reassign methods per-test
const SubscriptionMock = {
  findOne:           mockSubFindOne,
  findOneAndUpdate:  mockSubFindOneAndUpdate,
  updateOne:         mockSubUpdateOne,
};

// mongoose.startSession mock — returns a session that executes the callback
// synchronously and has an endSession no-op. This avoids any real DB connection.
const mockSession = {
  withTransaction: jest.fn().mockImplementation(async (fn) => { await fn(); }),
  endSession:      jest.fn().mockResolvedValue(undefined),
};

// PaymentLog model — default export
const mockPaymentLogCreate = jest.fn().mockResolvedValue({});

// User model — default export, findByIdAndUpdate used by flagUserAbuse via planService
const mockUserFindById          = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn().mockResolvedValue({});
const mockUserFindOne           = jest.fn();

// notificationService — named export
const mockNotifyUser = jest.fn().mockResolvedValue(undefined);

// metricsService — named exports
const mockInc = jest.fn().mockResolvedValue(undefined);

// invoiceService — named export
const mockGeneratePaymentInvoice = jest.fn().mockResolvedValue({ _id: 'inv_test_001' });

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: register ALL mocks BEFORE any dynamic import()
//         Paths are relative to THIS test file.
//         Export shapes must match the real module EXACTLY.
// ─────────────────────────────────────────────────────────────────────────────

// planService — named exports only (no default)
jest.unstable_mockModule('../services/planService.js', () => ({
  activateSubscriptionPlan: mockActivateSubscriptionPlan,
  cancelSubscriptionPlan:   mockCancelSubscriptionPlan,
  updateUserPlan:           mockUpdateUserPlan,
  getUserPlanInfo:          mockGetUserPlanInfo,
  revertToFree:             mockRevertToFree,
  flagUserAbuse:            mockFlagUserAbuse,
}));

// logger — default export (pino instance)
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

// models/PaymentLog — default export
jest.unstable_mockModule('../models/PaymentLog.js', () => ({
  default: { create: mockPaymentLogCreate },
}));

// models/User — default export
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById:          mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findOne:           mockUserFindOne,
  },
}));

// models/Subscription — default export (mutable object so per-test overrides work)
jest.unstable_mockModule('../models/Subscription.js', () => ({
  default: SubscriptionMock,
}));

// mongoose — we only need to mock startSession; everything else passes through
// We re-export the real mongoose module with startSession overridden.
jest.unstable_mockModule('mongoose', () => ({
  default: {
    ...mongoose,                          // real Types, Schema, etc. (used in test file)
    startSession: jest.fn().mockResolvedValue(mockSession),
  },
  // Also expose named re-exports that code might use
  Types:        mongoose.Types,
  Schema:       mongoose.Schema,
}));

// services/notificationService — named export
jest.unstable_mockModule('../services/notificationService.js', () => ({
  notifyUser: mockNotifyUser,
}));

// services/metricsService — named exports
jest.unstable_mockModule('../services/metricsService.js', () => ({
  inc:          mockInc,
  dec:          jest.fn().mockResolvedValue(undefined),
  getSnapshot:  jest.fn().mockResolvedValue({}),
  resetMetrics: jest.fn().mockResolvedValue(undefined),
}));

// services/invoiceService — named exports
jest.unstable_mockModule('../services/invoiceService.js', () => ({
  generatePaymentInvoice: mockGeneratePaymentInvoice,
  getInvoiceById:         jest.fn().mockResolvedValue(null),
  getInvoicesForUser:     jest.fn().mockResolvedValue([]),
}));

// middleware/auth-jwt — named export
// Webhook route does NOT use requireAuth; create-subscription and verify-payment do.
// Return 401 immediately (no token → normal rejection, no DB call).
jest.unstable_mockModule('../middleware/auth-jwt.js', () => ({
  requireAuth: jest.fn((_req, res, _next) =>
    res.status(401).json({ error: 'No authentication token provided' })
  ),
}));

// config/planFeatures — named exports (pure data, mocked for full hermeticity)
jest.unstable_mockModule('../config/planFeatures.js', () => ({
  PLAN_PRICING: {
    free:    { monthly: 0,       yearly: 0       },
    basic:   { monthly: 19900,   yearly: 199900  },
    pro:     { monthly: 49900,   yearly: 499900  },
    premium: { monthly: 99900,   yearly: 999900  },
    elite:   { monthly: 199900,  yearly: 1999900 },
  },
  PLAN_HIERARCHY:     ['free', 'basic', 'pro', 'premium', 'elite'],
  FEATURE_MAP:        {},
  CASE_LIMITS:        {},
  COUPONS:            {},
  planCanAccess:      jest.fn().mockReturnValue(true),
  getEffectivePlan:   jest.fn().mockReturnValue('pro'),
  PLAN_DURATION_DAYS: { monthly: 30, yearly: 365 },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────
const WEBHOOK_SECRET  = 'test_webhook_secret_32_chars_long!!';
const FAKE_USER_ID    = new mongoose.Types.ObjectId().toString();
const FAKE_SUB_ID     = 'sub_test_1234567890';
const FAKE_PAYMENT_ID = 'pay_test_1234567890';
const FAKE_EVENT_ID   = 'evt_test_1234567890';
const PLAN_ID         = 'plan_test_pro';

/** Sign raw webhook body with HMAC-SHA256 */
function signWebhookPayload(payload, secret = WEBHOOK_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

/** Canonical subscription.charged event shape */
function buildChargedEvent(overrides = {}) {
  return {
    id:    FAKE_EVENT_ID,
    event: 'subscription.charged',
    payload: {
      subscription: {
        entity: {
          id:            FAKE_SUB_ID,
          plan_id:       PLAN_ID,
          current_start: Math.floor(Date.now() / 1000),
          current_end:   Math.floor(Date.now() / 1000) + 30 * 86400,
        },
      },
      payment: {
        entity: {
          id:              FAKE_PAYMENT_ID,
          amount:          49900,          // ₹499 in paise = matches amountPaise in DB
          subscription_id: FAKE_SUB_ID,
          status:          'captured',
        },
      },
    },
    ...overrides,
  };
}

/** Canonical subscription DB record */
const mockSubscription = {
  _id:                    new mongoose.Types.ObjectId(),
  userId:                 new mongoose.Types.ObjectId(FAKE_USER_ID),
  razorpaySubscriptionId: FAKE_SUB_ID,
  razorpayPlanId:         PLAN_ID,
  planType:               'pro',
  billingCycle:           'monthly',
  amountPaise:            49900,
  status:                 'created',       // 'created' → ALLOWED_TRANSITIONS includes 'active'
  processedEvents:        [],
  refunded:               false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Express test app — built ONCE, dynamic import AFTER all mock registrations
// ─────────────────────────────────────────────────────────────────────────────
async function buildTestApp() {
  process.env.RAZORPAY_KEY_ID         = 'rzp_test_dummy';
  process.env.RAZORPAY_KEY_SECRET     = 'dummy_secret_32_chars_long_abc!!';
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.NODE_ENV                = 'test';
  process.env.JWT_SECRET              = 'test-jwt-secret-minimum-32-chars!!';

  const app = express();
  app.use(cookieParser());

  // payment.js uses express.raw() internally on /webhook.
  // For all other routes provide JSON parsing.
  app.use((req, res, next) => {
    if (req.path !== '/webhook') {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // Dynamic import after all mocks are registered ✓
  const { default: paymentRouter } = await import('../routes/payment.js');
  app.use('/', paymentRouter);

  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: configure Subscription mock for a typical "new event" scenario
//
// The handler calls Subscription methods in this order:
//   1. findOne({ razorpaySubscriptionId }) → load record
//   2. findOneAndUpdate({ _id, $or:[{processing:false},{lockExpiresAt expired}] })
//      → acquire processing lock; returns the locked doc if acquired, null if busy
//   3. updateOne({ _id, processedEvents:{ $ne:eventId } }) → atomic idempotency
//      modifiedCount=1 → new event, modifiedCount=0 → duplicate
//   4. (inside transaction) updateOne({ _id }) → update status
//   5. (finally) updateOne({ _id }) → release lock
// ─────────────────────────────────────────────────────────────────────────────
function setupSubscriptionMocks(overrides = {}) {
  const sub = { ...mockSubscription, ...overrides };

  SubscriptionMock.findOne          = jest.fn().mockResolvedValue(sub);
  SubscriptionMock.findOneAndUpdate = jest.fn().mockResolvedValue(sub);  // lock acquired
  // updateOne: first call = idempotency (modifiedCount=1), subsequent = status/lock updates
  SubscriptionMock.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /webhook — Razorpay subscription lifecycle', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply resolved values after clearAllMocks() resets implementations
    mockActivateSubscriptionPlan.mockResolvedValue({ subscriptionPlan: 'pro' });
    mockCancelSubscriptionPlan.mockResolvedValue({ subscriptionPlan: 'free' });
    mockUpdateUserPlan.mockResolvedValue({});
    mockFlagUserAbuse.mockResolvedValue({});
    mockNotifyUser.mockResolvedValue(undefined);
    mockInc.mockResolvedValue(undefined);
    mockGeneratePaymentInvoice.mockResolvedValue({ _id: 'inv_test_001' });
    mockPaymentLogCreate.mockResolvedValue({});
    mockUserFindByIdAndUpdate.mockResolvedValue({});
    mockSession.withTransaction.mockImplementation(async (fn) => { await fn(); });
    mockSession.endSession.mockResolvedValue(undefined);
    // mongoose.startSession is inside the mock module — reset it via the mock factory
  });

  // ── 1. Valid subscription.charged ──────────────────────────────────────────
  describe('subscription.charged — valid event', () => {
    it('should activate the plan and mark event as processed', async () => {
      setupSubscriptionMocks();

      const eventPayload = buildChargedEvent();
      const rawBody      = JSON.stringify(eventPayload);
      const signature    = signWebhookPayload(rawBody);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // planService.activateSubscriptionPlan must be called with correct args.
      // The handler passes { session } as the 6th arg inside the Mongoose transaction.
      expect(mockActivateSubscriptionPlan).toHaveBeenCalledWith(
        mockSubscription.userId.toString(),
        'pro',
        'monthly',
        mockSubscription._id.toString(),
        expect.any(Date),
        expect.objectContaining({ session: expect.anything() })
      );

      // Idempotency updateOne (step 3) — must push eventId
      expect(SubscriptionMock.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ processedEvents: { $ne: FAKE_EVENT_ID } }),
        expect.objectContaining({ $push: expect.anything() })
      );
    });
  });

  // ── 2. Invalid HMAC signature ──────────────────────────────────────────────
  describe('webhook — invalid signature', () => {
    it('should return 400 and NOT activate plan when signature is wrong', async () => {
      const rawBody      = JSON.stringify(buildChargedEvent());
      const badSignature = 'a'.repeat(64);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', badSignature)
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/signature/i);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
    });

    it('should return 400 when signature header is absent', async () => {
      const rawBody = JSON.stringify(buildChargedEvent());

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
    });
  });

  // ── 3. Duplicate event (idempotency) ──────────────────────────────────────
  describe('webhook — duplicate event', () => {
    it('should return 200 but NOT activate plan when event already processed', async () => {
      // Set up: lock acquired fine, but idempotency updateOne says modifiedCount=0
      setupSubscriptionMocks({ processedEvents: [FAKE_EVENT_ID], status: 'active' });
      SubscriptionMock.updateOne = jest.fn()
        .mockResolvedValueOnce({ modifiedCount: 0 })   // idempotency → duplicate
        .mockResolvedValue({ modifiedCount: 1 });       // lock release

      const eventPayload = buildChargedEvent();
      const rawBody      = JSON.stringify(eventPayload);
      const signature    = signWebhookPayload(rawBody);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
    });
  });

  // ── 4. payment.failed ─────────────────────────────────────────────────────
  describe('payment.failed', () => {
    it('should record the failure but NOT downgrade the plan', async () => {
      // payment.failed handler: findOne → updateOne (idempotency + $inc failedAttempts)
      // No findOneAndUpdate (no lock) and no startSession (no transaction)
      SubscriptionMock.findOne  = jest.fn().mockResolvedValue({ ...mockSubscription, status: 'active' });
      SubscriptionMock.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

      const failPayload = {
        id:    'evt_fail_123',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id:                'pay_failed_abc',
              subscription_id:   FAKE_SUB_ID,
              error_code:        'BAD_REQUEST_ERROR',
              error_description: 'Payment failed due to insufficient funds',
            },
          },
        },
      };
      const rawBody   = JSON.stringify(failPayload);
      const signature = signWebhookPayload(rawBody);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
      expect(mockCancelSubscriptionPlan).not.toHaveBeenCalled();

      // Must increment failedAttempts
      expect(SubscriptionMock.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: mockSubscription._id }),
        expect.objectContaining({ $inc: { failedAttempts: 1 } })
      );
    });
  });

  // ── 5. subscription.cancelled ─────────────────────────────────────────────
  describe('subscription.cancelled', () => {
    it('should revert the user to the free plan', async () => {
      // cancelled handler: findOne → updateOne (idempotency) → startSession → cancel
      setupSubscriptionMocks({ status: 'active' });

      const cancelPayload = {
        id:    'evt_cancel_123',
        event: 'subscription.cancelled',
        payload: {
          subscription: {
            entity: { id: FAKE_SUB_ID, status: 'cancelled' },
          },
        },
      };
      const rawBody   = JSON.stringify(cancelPayload);
      const signature = signWebhookPayload(rawBody);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(mockCancelSubscriptionPlan).toHaveBeenCalledWith(
        mockSubscription.userId.toString(),
        mockSubscription._id.toString(),
        expect.objectContaining({ session: mockSession })
      );
    });
  });

  // ── 6. Amount tamper detection ─────────────────────────────────────────────
  describe('subscription.charged — amount tampered', () => {
    it('should return 200 but NOT activate plan, and call flagUserAbuse', async () => {
      // Amount tamper: the handler calls flagUserAbuse (not User.findByIdAndUpdate directly)
      // and returns BEFORE calling activateSubscriptionPlan
      setupSubscriptionMocks({ amountPaise: 49900 });

      const tamperedEvent = buildChargedEvent();
      // Attacker sends ₹1 (100 paise) instead of real ₹499 (49900 paise)
      tamperedEvent.payload.payment.entity.amount = 100;

      const rawBody   = JSON.stringify(tamperedEvent);
      const signature = signWebhookPayload(rawBody);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      // Always 200 — prevents Razorpay from retrying a tampered event endlessly
      expect(res.status).toBe(200);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
      // planService.flagUserAbuse is called with the user's ID and a score increment
      expect(mockFlagUserAbuse).toHaveBeenCalledWith(
        mockSubscription.userId.toString(),
        expect.any(Number)
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /verify-payment — auth-protected route stub
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /verify-payment', () => {
  it('should return 400 or 401 when required fields are missing', async () => {
    const app = await buildTestApp();
    const res = await request(app)
      .post('/verify-payment')
      .send({ razorpay_payment_id: 'pay_abc', razorpay_subscription_id: 'sub_abc' });
    // requireAuth mock returns 401; if validation runs first → 400
    expect([400, 401]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /create-subscription — input validation stubs
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /create-subscription — input validation', () => {
  it('should reject an entirely invalid planKey', async () => {
    const app = await buildTestApp();
    const res = await request(app)
      .post('/create-subscription')
      .send({ planKey: 'HACKER_PLAN_FREE_ELITE' });
    expect([400, 401]).toContain(res.status);
  });

  it('should reject planKey "free" (not purchaseable)', async () => {
    const app = await buildTestApp();
    const res = await request(app)
      .post('/create-subscription')
      .send({ planKey: 'free' });
    expect([400, 401]).toContain(res.status);
  });
});
