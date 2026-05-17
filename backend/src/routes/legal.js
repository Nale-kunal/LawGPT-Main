/**
 * legal.js — Legal compliance endpoints (spec #6)
 * Serves static policy content. Must exist before accepting payments.
 *
 * Routes (public, no auth):
 *   GET /api/v1/legal/terms
 *   GET /api/v1/legal/privacy
 *   GET /api/v1/legal/refund-policy
 */

import express from 'express';

const router = express.Router();

// ── Static policy content ─────────────────────────────────────────────────────
// In production: replace with DB-fetched or CMS-fetched content.
// The version + lastUpdated fields are used for audit compliance.

const POLICIES = {
  terms: {
    version:     '1.0',
    lastUpdated: '2024-01-01',
    title:       'Terms of Service',
    content: `By using Juriq, you agree to these Terms of Service.
Juriq provides SaaS services for legal professionals.
Subscriptions are billed monthly or annually as selected.
You may cancel at any time; access continues until period end.
Juriq reserves the right to suspend accounts for policy violations.
Governing law: India. Jurisdiction: Maharashtra.`,
  },

  privacy: {
    version:     '1.0',
    lastUpdated: '2024-01-01',
    title:       'Privacy Policy',
    content: `Juriq collects only data necessary to provide its services.
Your data is stored securely on encrypted MongoDB servers.
Payment data is processed by Razorpay — we never store raw card details.
We do not sell your data to third parties.
You may request data deletion by contacting support@juriq.in.
Data retention: active accounts indefinitely; deleted accounts 30 days.`,
  },

  'refund-policy': {
    version:     '1.0',
    lastUpdated: '2024-01-01',
    title:       'Refund Policy',
    content: `Refunds are available within 24 hours of a subscription charge.
To request a refund, contact support@juriq.in with your payment ID.
Refunds are processed to the original payment method within 5-7 business days.
No refunds are issued for partial billing periods.
Abuse of the refund policy may result in account suspension.
All refund decisions are final.`,
  },
};

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/terms', (req, res) => {
  res.json({ ok: true, policy: POLICIES.terms });
});

router.get('/privacy', (req, res) => {
  res.json({ ok: true, policy: POLICIES.privacy });
});

router.get('/refund-policy', (req, res) => {
  res.json({ ok: true, policy: POLICIES['refund-policy'] });
});

// Convenience: list all policies with metadata only
router.get('/', (req, res) => {
  const index = Object.entries(POLICIES).map(([key, p]) => ({
    key,
    title:       p.title,
    version:     p.version,
    lastUpdated: p.lastUpdated,
    url:         `/api/v1/legal/${key}`,
  }));
  res.json({ ok: true, policies: index });
});

export default router;
