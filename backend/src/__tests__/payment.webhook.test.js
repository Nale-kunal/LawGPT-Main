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
 * ESM note: in --experimental-vm-modules mode, `jest` is NOT a global.
 * It must be explicitly imported from '@jest/globals', and all module-level
 * mock functions must be created after that import.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import crypto       from 'crypto';
import request      from 'supertest';
import mongoose     from 'mongoose';
import express      from 'express';
import cookieParser from 'cookie-parser';

// ── Stable mock function references ──────────────────────────────────────────
// These are defined here (after the @jest/globals import) so:
//   a) jest.fn() is available  b) the same reference is used in assertions

const mockActivateSubscriptionPlan = jest.fn().mockResolvedValue({ subscriptionPlan: 'pro' });
const mockCancelSubscriptionPlan   = jest.fn().mockResolvedValue({ subscriptionPlan: 'free' });
const mockUpdateUserPlan           = jest.fn().mockResolvedValue({});
const mockGetUserPlanInfo          = jest.fn().mockResolvedValue({ plan: 'pro' });
const mockRevertToFree             = jest.fn().mockResolvedValue({});

const mockPaymentLogCreate     = jest.fn().mockResolvedValue({});

const mockUserFindById          = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn().mockResolvedValue({});
const mockUserFindOne           = jest.fn();

// ── ESM-compatible module mocks ───────────────────────────────────────────────
// jest.unstable_mockModule() must be called before any dynamic import()
// of the modules being mocked.

jest.unstable_mockModule('../services/planService.js', () => ({
  activateSubscriptionPlan: mockActivateSubscriptionPlan,
  cancelSubscriptionPlan:   mockCancelSubscriptionPlan,
  updateUserPlan:           mockUpdateUserPlan,
  getUserPlanInfo:          mockGetUserPlanInfo,
  revertToFree:             mockRevertToFree,
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.unstable_mockModule('../models/PaymentLog.js', () => ({
  default: { create: mockPaymentLogCreate },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById:          mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findOne:           mockUserFindOne,
  },
}));

// ── Shared test constants ─────────────────────────────────────────────────────
const WEBHOOK_SECRET  = 'test_webhook_secret_32_chars_long!!';
const FAKE_USER_ID    = new mongoose.Types.ObjectId().toString();
const FAKE_SUB_ID     = 'sub_test_1234567890';
const FAKE_PAYMENT_ID = 'pay_test_1234567890';
const FAKE_EVENT_ID   = 'evt_test_1234567890';
const PLAN_ID         = 'plan_test_pro';

// ── HMAC helper ───────────────────────────────────────────────────────────────
function signWebhookPayload(payload, secret = WEBHOOK_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

// ── Build a standard subscription.charged event ───────────────────────────────
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

// ── Subscription DB mock shape ────────────────────────────────────────────────
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

// ── Build a minimal Express app with the real payment router ──────────────────
async function buildTestApp() {
  process.env.RAZORPAY_KEY_ID         = 'rzp_test_dummy';
  process.env.RAZORPAY_KEY_SECRET     = 'dummy_secret_32_chars_long_abc!!';
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.NODE_ENV                = 'test';

  const app = express();
  app.use(cookieParser());

  // Raw body for /webhook; parsed JSON for everything else
  app.use((req, res, next) => {
    if (req.path !== '/webhook') {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // Dynamic import AFTER mocks are registered
  const { default: paymentRouter } = await import('../routes/payment.js');
  app.use('/', paymentRouter);

  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite — webhook lifecycle
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /webhook — Razorpay subscription lifecycle', () => {
  let app;
  let Subscription;

  beforeAll(async () => {
    // All dynamic imports MUST come after jest.unstable_mockModule() calls above
    app          = await buildTestApp();
    Subscription = (await import('../models/Subscription.js')).default;
  });

  beforeEach(() => {
    // Reset call history; re-apply resolved values because clearAllMocks
    // resets implementations too
    jest.clearAllMocks();
    mockActivateSubscriptionPlan.mockResolvedValue({ subscriptionPlan: 'pro' });
    mockCancelSubscriptionPlan.mockResolvedValue({ subscriptionPlan: 'free' });
    mockUpdateUserPlan.mockResolvedValue({});
    mockUserFindByIdAndUpdate.mockResolvedValue({});
    mockPaymentLogCreate.mockResolvedValue({});
  });

  // ── 1. Valid subscription.charged ────────────────────────────────────────
  describe('subscription.charged — valid event', () => {
    it('should activate the plan and mark event as processed', async () => {
      const eventPayload = buildChargedEvent();
      const rawBody      = JSON.stringify(eventPayload);
      const signature    = signWebhookPayload(rawBody);

      Subscription.findOne           = jest.fn().mockResolvedValue({ ...mockSubscription });
      Subscription.findByIdAndUpdate = jest.fn().mockResolvedValue({});

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
      expect(Subscription.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        expect.objectContaining({
          $push: { processedEvents: FAKE_EVENT_ID },
          $set:  expect.objectContaining({ status: 'active' }),
        })
      );
    });
  });

  // ── 2. Invalid HMAC signature ────────────────────────────────────────────
  describe('webhook — invalid signature', () => {
    it('should return 400 and NOT activate plan', async () => {
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
        .send(rawBody); // no x-razorpay-signature header

      expect(res.status).toBe(400);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
    });
  });

  // ── 3. Duplicate event (idempotency) ─────────────────────────────────────
  describe('webhook — duplicate event', () => {
    it('should return 200 but NOT double-activate the plan', async () => {
      const eventPayload = buildChargedEvent();
      const rawBody      = JSON.stringify(eventPayload);
      const signature    = signWebhookPayload(rawBody);

      // Subscription already has this event ID in processedEvents
      Subscription.findOne = jest.fn().mockResolvedValue({
        ...mockSubscription,
        processedEvents: [FAKE_EVENT_ID],
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

  // ── 4. payment.failed ────────────────────────────────────────────────────
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

      Subscription.findOne           = jest.fn().mockResolvedValue({ ...mockSubscription, status: 'active', processedEvents: [] });
      Subscription.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(mockActivateSubscriptionPlan).not.toHaveBeenCalled();
      expect(mockCancelSubscriptionPlan).not.toHaveBeenCalled();
      expect(Subscription.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        expect.objectContaining({ $inc: { failedAttempts: 1 } })
      );
    });
  });

  // ── 5. subscription.cancelled ────────────────────────────────────────────
  describe('subscription.cancelled', () => {
    it('should revert user to free plan', async () => {
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

      Subscription.findOne           = jest.fn().mockResolvedValue({ ...mockSubscription, status: 'active', processedEvents: [] });
      Subscription.findByIdAndUpdate = jest.fn().mockResolvedValue({});

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

  // ── 6. Amount tamper detection ───────────────────────────────────────────
  describe('subscription.charged — amount tampered', () => {
    it('should return 200 but NOT activate plan, and flag user as suspicious', async () => {
      const tamperedEvent = buildChargedEvent();
      // Attacker sends ₹1 (100 paise) instead of the real ₹499 (49900 paise)
      tamperedEvent.payload.payment.entity.amount = 100;

      const rawBody   = JSON.stringify(tamperedEvent);
      const signature = signWebhookPayload(rawBody);

      Subscription.findOne = jest.fn().mockResolvedValue({
        ...mockSubscription,
        amountPaise:     49900,
        processedEvents: [],
      });

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      // Always return 200 to prevent Razorpay from retrying a tampered event
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
    // 401 because no auth token in unit-test context; 400 if validation runs first
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
