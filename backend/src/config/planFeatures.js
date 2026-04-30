/**
 * planFeatures.js — Single Source of Truth for Subscription Plans
 *
 * This file defines the plan hierarchy, feature access map, plan pricing,
 * and durations. ALL middleware and routes MUST import from here.
 *
 * DO NOT add features that don't exist as real routes/pages in the app.
 */

// ─── Tier Order (lowest → highest) ───────────────────────────────────────────
export const PLAN_HIERARCHY = ['free', 'basic', 'pro', 'premium', 'elite'];

// ─── Minimum plan required to access each feature ────────────────────────────
// Features are mapped ONLY to real existing modules detected from the codebase:
// routes: cases, clients, calendar, dashboard, settings,
//         billing, invoices, documents, legal-research (legal routes),
//         hearings, templates, notes (casenotes)
export const FEATURE_MAP = {
  // Free tier — always accessible
  dashboard:       'free',
  calendar:        'free',
  cases:           'free',
  clients:         'free',
  settings:        'free',

  // Basic tier
  billing:         'basic',
  invoices:        'basic',

  // Pro tier
  documents:       'pro',
  'legal-research':'pro',
  hearings:        'pro',

  // Premium tier
  templates:       'premium',
  notes:           'premium',

  // Elite tier
  news:            'elite',
};

// ─── Case creation limit per plan ────────────────────────────────────────────
export const CASE_LIMITS = {
  free:    5,
  basic:   50,
  pro:     200,
  premium: 1000,
  elite:   Infinity,
};

// ─── Pricing (INR, amount in paise for Razorpay) ─────────────────────────────
export const PLAN_PRICING = {
  free:    { monthly: 0,       yearly: 0 },
  basic:   { monthly: 19900,   yearly: 199900  },  // ₹199/mo, ₹1999/yr
  pro:     { monthly: 49900,   yearly: 499900  },  // ₹499/mo, ₹4999/yr
  premium: { monthly: 99900,   yearly: 999900  },  // ₹999/mo, ₹9999/yr
  elite:   { monthly: 199900,  yearly: 1999900 },  // ₹1999/mo, ₹19999/yr
};

// ─── Plan duration in days ────────────────────────────────────────────────────
export const PLAN_DURATION_DAYS = {
  monthly: 30,
  yearly:  365,
};

// ─── Coupon definitions ───────────────────────────────────────────────────────
export const COUPONS = {
  WELCOMETOJURIQ: {
    grantPlan:    'elite',
    durationDays: 90,       // 3 months
    maxUses:      null,     // no global cap — enforced per user
    description:  'Welcome coupon — 3 months Elite access',
  },
};

// ─── Helper: check if planA can access features requiring planB ───────────────
export function planCanAccess(userPlan, requiredPlan) {
  const userIdx     = PLAN_HIERARCHY.indexOf(userPlan  || 'free');
  const requiredIdx = PLAN_HIERARCHY.indexOf(requiredPlan || 'free');
  return userIdx >= requiredIdx;
}

// ─── Helper: resolve effective plan (respects expiry) ────────────────────────
export function getEffectivePlan(user) {
  const raw = user.subscriptionPlan || 'free';
  const end = user.planEndDate ? new Date(user.planEndDate) : null;

  if (end && end < new Date()) {
    return 'free'; // expired → revert
  }
  return raw;
}
