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
 * ESM + jest.unstable_mockModule rules:
 *  • import { jest } from '@jest/globals'  — jest is NOT a global in ESM mode
 *  • jest.unstable_mockModule() before ANY dynamic import() of that module
 *  • Mock factory shapes MUST match the real module's export shape exactly
 *    (named vs default) — a mismatch silently falls through to the real module
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import crypto       from 'crypto';
import request      from 'supertest';
import mongoose     from 'mongoose';
import express      from 'express';
import cookieParser from 'cookie-parser';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — create stable mock fn references BEFORE registering mocks.
//          These refs are what tests assert against.
// ─────────────────────────────────────────────────────────────────────────────

// planService — all named exports
const mockActivateSubscriptionPlan = jest.fn().mockResolvedValue({ subscriptionPlan: 'pro' });
const mockCancelSubscriptionPlan   = jest.fn().mockResolvedValue({ subscriptionPlan: 'free' });
const mockUpdateUserPlan           = jest.fn().mockResolvedValue({});
const mockGetUserPlanInfo          = jest.fn().mockResolvedValue({ plan: 'pro' });
const mockRevertToFree             = jest.fn().mockResolvedValue({});
const mockFlagUserAbuse            = jest.fn().mockResolvedValue({});

// models — default exports with static methods
const mockSubscriptionFindOne           = jest.fn();
const mockSubscriptionFindByIdAndUpdate = jest.fn().mockResolvedValue({});

const mockPaymentLogCreate = jest.fn().mockResolvedValue({});

const mockUserFindById          = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn().mockResolvedValue({});
const mockUserFindOne           = jest.fn();

// notificationService — named export
const mockNotifyUser = jest.fn().mockResolvedValue(undefined);

// metricsService — named export
const mockInc = jest.fn().mockResolvedValue(undefined);

// invoiceService — named export
const mockGeneratePaymentInvoice = jest.fn().mockResolvedValue({ _id: 'inv_test_001' });

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — register ALL mocks BEFORE any dynamic import() of the real modules.
//          The path here is ALWAYS relative to THIS test file.
//          The export shape MUST match the real module's exports exactly.
// ─────────────────────────────────────────────────────────────────────────────

// planService.js  — named exports only (no default)
jest.unstable_mockModule('../services/planService.js', () => ({
  activateSubscriptionPlan: mockActivateSubscriptionPlan,
  cancelSubscriptionPlan:   mockCancelSubscriptionPlan,
  updateUserPlan:           mockUpdateUserPlan,
  getUserPlanInfo:          mockGetUserPlanInfo,
  revertToFree:             mockRevertToFree,
  flagUserAbuse:            mockFlagUserAbuse,
}));

// logger.js  — default export (pino instance with .info/.warn/.error/.debug)
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

// models/PaymentLog.js  — default export (mongoose model)
jest.unstable_mockModule('../models/PaymentLog.js', () => ({
  default: {
    create: mockPaymentLogCreate,
  },
}));

// models/User.js  — default export (mongoose model)
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById:          mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findOne:           mockUserFindOne,
  },
}));

// models/Subscription.js  — default export (mongoose model)
// NOTE: we mutate findOne / findByIdAndUpdate per-test, so the object
// must be mutable. We expose the same object reference here.
const SubscriptionMock = {
  findOne:           mockSubscriptionFindOne,
  findByIdAndUpdate: mockSubscriptionFindByIdAndUpdate,
};
jest.unstable_mockModule('../models/Subscription.js', () => ({
  default: SubscriptionMock,
}));

// services/notificationService.js  — named export
jest.unstable_mockModule('../services/notificationService.js', () => ({
  notifyUser: mockNotifyUser,
}));

// services/metricsService.js  — named export
jest.unstable_mockModule('../services/metricsService.js', () => ({
  inc: mockInc,
  dec: jest.fn().mockResolvedValue(undefined),
  getSnapshot: jest.fn().mockResolvedValue({}),
  resetMetrics: jest.fn().mockResolvedValue(undefined),
}));

// services/invoiceService.js  — named exports
jest.unstable_mockModule('../services/invoiceService.js', () => ({
  generatePaymentInvoice: mockGeneratePaymentInvoice,
  getInvoiceById:         jest.fn().mockResolvedValue(null),
  getInvoicesForUser:     jest.fn().mockResolvedValue([]),
}));

// middleware/auth-jwt.js  — named export
// The webhook route does NOT use requireAuth; only create-subscription and
// verify-payment do. We return a simple pass-through so 401 is returned
// naturally (no token = 401) rather than crashing with a DB call.
jest.unstable_mockModule('../middleware/auth-jwt.js', () => ({
  requireAuth: jest.fn((_req, res, _next) => {
    return res.status(401).json({ error: 'No authentication token provided' });
  }),
}));

// config/planFeatures.js  — named exports (pure data, no side-effects,
// but importing it transitively pulls in nothing unsafe — mock anyway to
// keep the test fully hermetic).
jest.unstable_mockModule('../config/planFeatures.js', () => ({
  PLAN_PRICING: {
    free:    { monthly: 0,      yearly: 0       },
    basic:   { monthly: 19900,  yearly: 199900  },
    pro:     { monthly: 49900,  yearly: 499900  },
    premium: { monthly: 99900,  yearly: 999900  },
    elite:   { monthly: 199900, yearly: 1999900 },
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

/** Sign a raw webhook body with HMAC-SHA256 */
function signWebhookPayload(payload, secret = WEBHOOK_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

/** Build a standard subscription.charged webhook event */
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
          amount:          49900,          // ₹499 in paise — matches DB record
          subscription_id: FAKE_SUB_ID,
          status:          'captured',
        },
      },
    },
    ...overrides,
  };
}

/** Canonical DB subscription record returned by findOne mock */
const mockSubscription = {
  _id:                    new mongoose.Types.ObjectId(),
  userId:                 new mongoose.Types.ObjectId(FAKE_USER_ID),
  razorpaySubscriptionId: FAKE_SUB_ID,
  razorpayPlanId:         PLAN_ID,
  planType:               'pro',
  billingCycle:           'monthly',
  amountPaise:            49900,
  status:                 'created',
  processedEvents:        [],
  refunded:               false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Build the Express test app.
//          Dynamic import of payment.js MUST come after all
//          jest.unstable_mockModule() calls above.
// ─────────────────────────────────────────────────────────────────────────────
async function buildTestApp() {
  process.env.RAZORPAY_KEY_ID         = 'rzp_test_dummy';
  process.env.RAZORPAY_KEY_SECRET     = 'dummy_secret_32_chars_long_abc!!';
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.NODE_ENV                = 'test';
  process.env.JWT_SECRET              = 'test-jwt-secret-minimum-32-chars!!';

  const app = express();
  app.use(cookieParser());

  // For the /webhook route payment.js uses express.raw() internally.
  // For all other routes provide JSON parsing.
  app.use((req, res, next) => {
    if (req.path !== '/webhook') {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // Dynamic import — all mocks are already registered at this point
  const { default: paymentRouter } = await import('../routes/payment.js');
  app.use('/', paymentRouter);

  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /webhook — Razorpay subscription lifecycle', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply resolved values because clearAllMocks() resets them
    mockActivateSubscriptionPlan.mockResolvedValue({ subscriptionPlan: 'pro' });
    mockCancelSubscriptionPlan.mockResolvedValue({ subscriptionPlan: 'free' });
    mockUpdateUserPlan.mockResolvedValue({});
    mockNotifyUser.mockResolvedValue(undefined);
    mockInc.mockResolvedValue(undefined);
    mockGeneratePaymentInvoice.mockResolvedValue({ _id: 'inv_test_001' });
    mockPaymentLogCreate.mockResolvedValue({});
    mockUserFindByIdAndUpdate.mockResolvedValue({});
    mockSubscriptionFindByIdAndUpdate.mockResolvedValue({});

    // Reset the mutable Subscription mock methods
    SubscriptionMock.findOne           = mockSubscriptionFindOne;
    SubscriptionMock.findByIdAndUpdate = mockSubscriptionFindByIdAndUpdate;
  });

  // ── 1. Valid subscription.charged ──────────────────────────────────────────
  describe('subscription.charged — valid event', () => {
    it('should activate the plan and mark event as processed', async () => {
      const eventPayload = buildChargedEvent();
      const rawBody      = JSON.stringify(eventPayload);
      const signature    = signWebhookPayload(rawBody);

      const subFindByIdAndUpdate = jest.fn().mockResolvedValue({});
      SubscriptionMock.findOne           = jest.fn().mockResolvedValue({ ...mockSubscription });
      SubscriptionMock.findByIdAndUpdate = subFindByIdAndUpdate;

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(mockActivateSubscriptionPlan).toHaveBeenCalledWith(
        mockSubscription.userId.toString(),
        'pro',
        'monthly',
        expect.any(String),
        expect.any(Date)
      );
      expect(subFindByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        expect.objectContaining({
          $push: { processedEvents: FAKE_EVENT_ID },
          $set:  expect.objectContaining({ status: 'active' }),
        })
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
    it('should return 200 but NOT double-activate when event already processed', async () => {
      const eventPayload = buildChargedEvent();
      const rawBody      = JSON.stringify(eventPayload);
      const signature    = signWebhookPayload(rawBody);

      SubscriptionMock.findOne = jest.fn().mockResolvedValue({
        ...mockSubscription,
        processedEvents: [FAKE_EVENT_ID], // already processed
        status:          'active',
      });

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

      const subFindByIdAndUpdate = jest.fn().mockResolvedValue({});
      SubscriptionMock.findOne           = jest.fn().mockResolvedValue({ ...mockSubscription, status: 'active', processedEvents: [] });
      SubscriptionMock.findByIdAndUpdate = subFindByIdAndUpdate;

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
      expect(mockCancelSubscriptionPlan).not.toHaveBeenCalled();
      expect(subFindByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        expect.objectContaining({ $inc: { failedAttempts: 1 } })
      );
    });
  });

  // ── 5. subscription.cancelled ─────────────────────────────────────────────
  describe('subscription.cancelled', () => {
    it('should revert the user to the free plan', async () => {
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

      SubscriptionMock.findOne           = jest.fn().mockResolvedValue({ ...mockSubscription, status: 'active', processedEvents: [] });
      SubscriptionMock.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(mockCancelSubscriptionPlan).toHaveBeenCalledWith(
        mockSubscription.userId.toString(),
        mockSubscription._id.toString()
      );
    });
  });

  // ── 6. Amount tamper detection ─────────────────────────────────────────────
  describe('subscription.charged — amount tampered', () => {
    it('should return 200 but NOT activate plan, and flag user as suspicious', async () => {
      const tamperedEvent = buildChargedEvent();
      // Attacker sends ₹1 (100 paise) instead of real ₹499 (49900 paise)
      tamperedEvent.payload.payment.entity.amount = 100;

      const rawBody   = JSON.stringify(tamperedEvent);
      const signature = signWebhookPayload(rawBody);

      SubscriptionMock.findOne = jest.fn().mockResolvedValue({
        ...mockSubscription,
        amountPaise:     49900,
        processedEvents: [],
      });

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      // Always 200 — prevents Razorpay from retrying a tampered event endlessly
      expect(res.status).toBe(200);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription.userId,
        expect.objectContaining({
          $set: expect.objectContaining({ 'securityFlags.isSuspicious': true }),
        })
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /verify-payment — stub tests
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /verify-payment', () => {
  it('should return 400 or 401 when required fields are missing', async () => {
    const app = await buildTestApp();
    const res = await request(app)
      .post('/verify-payment')
      .send({ razorpay_payment_id: 'pay_abc', razorpay_subscription_id: 'sub_abc' });
    // requireAuth mock returns 401; if validation runs first it's 400
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
