/**
 * legal.js — Legal compliance endpoints (spec #6, compliance phases 3, 5)
 * Serves versioned policy metadata, consent requirements, and consent recording.
 * All five policies carry explicit version numbers and SHA-256 hashes for consent audit compliance.
 *
 * Routes (public, no auth required):
 *   GET  /api/v1/legal/                     — list all policies (metadata only)
 *   GET  /api/v1/legal/terms                — Terms of Service
 *   GET  /api/v1/legal/privacy              — Privacy Policy
 *   GET  /api/v1/legal/refund-policy        — Refund Policy
 *   GET  /api/v1/legal/data-processing      — Data Processing Agreement
 *   GET  /api/v1/legal/cookie-policy        — Cookie Policy
 *   GET  /api/v1/legal/consent-requirements — Current versions requiring explicit signup consent
 *
 * Routes (authenticated):
 *   GET  /api/v1/legal/my-consents          — Authenticated user's consent audit trail
 *   GET  /api/v1/legal/check-consent        — Check if user has accepted current required policies
 *   POST /api/v1/legal/record-consent       — Record explicit consent for one or more policies
 */

import express from 'express';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middleware/auth-jwt.js';
import User from '../models/User.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import { computePolicyHash } from '../config/policyVersions.js';
import { invalidateUserCache } from '../utils/userCache.js';

const consentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP/user to 30 consent modifications per 15 minutes
  message: { error: 'Too many consent updates. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// ── Versioned Policy Registry ──────────────────────────────────────────────────
// Version and effectiveDate must be kept in sync with the frontend policy pages.
// When updating a policy: increment version, update effectiveDate, add canonical text, notify users.

const POLICIES = {
  terms: {
    version:              '1.0',
    effectiveDate:        '2026-06-01',
    lastUpdated:          '2026-06-01',
    title:                'Terms of Service',
    summary:              'Governs use of the Juriq platform by enrolled legal professionals. Juriq is a practice management tool, not a law firm or legal advisor.',
    fullTextUrl:          '/terms',
    requiresSignupConsent: true,
    policyHash:           computePolicyHash('terms', '1.0'),
  },

  privacy: {
    version:              '1.0',
    effectiveDate:        '2026-06-01',
    lastUpdated:          '2026-06-01',
    title:                'Privacy Policy',
    summary:              'Describes how Juriq collects, uses, and protects personal data in accordance with the DPDP Act 2023 (India). Data is stored on India-based infrastructure. Juriq does not sell user data.',
    fullTextUrl:          '/privacy',
    requiresSignupConsent: true,
    policyHash:           computePolicyHash('privacy', '1.0'),
  },

  'refund-policy': {
    version:              '1.0',
    effectiveDate:        '2026-06-01',
    lastUpdated:          '2026-06-01',
    title:                'Refund Policy',
    summary:              '7-day refund window from first subscription charge. Contact support@juriq.in with Razorpay Payment ID. Renewals, coupon plans, and partial periods are not refundable.',
    fullTextUrl:          '/refund-policy',
    requiresSignupConsent: false,
    policyHash:           computePolicyHash('refund-policy', '1.0'),
  },

  'data-processing': {
    version:              '1.0',
    effectiveDate:        '2026-06-01',
    lastUpdated:          '2026-06-01',
    title:                'Data Processing Agreement',
    summary:              'Describes data controller/processor roles, sub-processors (Razorpay, MongoDB Atlas India), data localisation, technical security controls, and data subject rights.',
    fullTextUrl:          '/data-processing',
    requiresSignupConsent: false,
    policyHash:           computePolicyHash('data-processing', '1.0'),
  },

  'cookie-policy': {
    version:              '1.0',
    effectiveDate:        '2026-06-01',
    lastUpdated:          '2026-06-01',
    title:                'Cookie Policy',
    summary:              'Juriq uses only strictly necessary and functional cookies. No advertising or third-party tracking cookies are used.',
    fullTextUrl:          '/cookie-policy',
    requiresSignupConsent: false,
    policyHash:           computePolicyHash('cookie-policy', '1.0'),
  },
};

// ── Helper — check if a user has accepted the required version for a policy ───
function userHasAcceptedPolicy(userConsents, policyType, requiredVersion) {
  if (!Array.isArray(userConsents)) return false;
  return userConsents.some(
    (c) => c.policyType === policyType && c.version === requiredVersion
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/v1/legal/ — index of all policies (metadata only, no full content)
router.get('/', (req, res) => {
  const index = Object.entries(POLICIES).map(([key, p]) => ({
    key,
    title:                p.title,
    version:              p.version,
    effectiveDate:        p.effectiveDate,
    lastUpdated:          p.lastUpdated,
    summary:              p.summary,
    fullTextUrl:          p.fullTextUrl,
    requiresSignupConsent: p.requiresSignupConsent,
    policyHash:           p.policyHash,
    url:                  `/api/v1/legal/${key}`,
  }));
  res.json({ ok: true, policies: index });
});

// GET /api/v1/legal/consent-requirements — current required versions for signup consent
router.get('/consent-requirements', (req, res) => {
  const required = Object.entries(POLICIES)
    .filter(([, p]) => p.requiresSignupConsent)
    .map(([key, p]) => ({
      policyType:    key,
      title:         p.title,
      version:       p.version,
      effectiveDate: p.effectiveDate,
      fullTextUrl:   p.fullTextUrl,
      policyHash:    p.policyHash,
    }));
  res.json({ ok: true, requirements: required });
});

// GET /api/v1/legal/check-consent — authenticated: checks if user has accepted current required policies
// Returns { compliant: boolean, missing: [{ policyType, version, title }] }
router.get('/check-consent', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('legalConsents')
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const required = Object.entries(POLICIES).filter(([, p]) => p.requiresSignupConsent);
    const missing = required
      .filter(([key, p]) => !userHasAcceptedPolicy(user.legalConsents, key, p.version))
      .map(([key, p]) => ({
        policyType:  key,
        title:       p.title,
        version:     p.version,
        fullTextUrl: p.fullTextUrl,
        policyHash:  p.policyHash,
      }));

    return res.json({
      ok:        true,
      compliant: missing.length === 0,
      missing,
    });
  } catch (err) {
    logger.error({ err }, 'check-consent error');
    return res.status(500).json({ ok: false, error: 'Failed to check consent status' });
  }
});

// POST /api/v1/legal/record-consent — authenticated: record explicit consent for one or more policies
// Body: { consents: [{ policyType: 'terms' | 'privacy' | ..., version: '1.0' }] }
router.post('/record-consent', requireAuth, consentLimiter, async (req, res) => {
  try {
    const { consents } = req.body;

    if (!Array.isArray(consents) || consents.length === 0) {
      return res.status(400).json({ ok: false, error: 'consents must be a non-empty array' });
    }

    // Validate each entry
    const validPolicyTypes = Object.keys(POLICIES);
    for (const c of consents) {
      if (!c.policyType || !c.version) {
        return res.status(400).json({ ok: false, error: 'Each consent entry must have policyType and version' });
      }
      if (!validPolicyTypes.includes(c.policyType)) {
        return res.status(400).json({ ok: false, error: `Unknown policyType: ${c.policyType}` });
      }
      const policy = POLICIES[c.policyType];
      if (c.version !== policy.version) {
        return res.status(400).json({
          ok:    false,
          error: `Version mismatch for ${c.policyType}: expected ${policy.version}, got ${c.version}`,
        });
      }
    }

    const user = await User.findById(req.user.userId).select('legalConsents');
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const consentTimestamp = new Date();
    const clientIp  = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    let recordedCount = 0;
    let renewedCount  = 0;

    for (const c of consents) {
      const policy     = POLICIES[c.policyType];
      const policyHash = computePolicyHash(c.policyType, c.version);

      // Check if already accepted at this version
      const existing = user.legalConsents?.find(
        (lc) => lc.policyType === c.policyType && lc.version === c.version
      );

      if (existing) {
        // Already accepted — idempotent, skip duplicate
        continue;
      }

      // Check if user had a previous version (renewal)
      const hadPrevious = user.legalConsents?.some((lc) => lc.policyType === c.policyType);
      const action      = hadPrevious ? 'consent_renewed' : 'consent_accepted';

      const newConsent = {
        policyType:        c.policyType,
        version:           c.version,
        policyHash:        policyHash || undefined,
        acceptedAt:        consentTimestamp,
        acceptedFromIp:    clientIp,
        acceptedUserAgent: userAgent,
        method:            'explicit_gate',
      };

      user.legalConsents = user.legalConsents || [];
      user.legalConsents.push(newConsent);

      if (hadPrevious) {
        renewedCount++;
      } else {
        recordedCount++;
      }

      // Audit trail — non-blocking
      auditLog(req, action, 'consent', `${c.policyType}:${c.version}`, {
        policyType: c.policyType,
        version:    c.version,
        policyHash: policyHash || null,
        title:      policy.title,
      });
    }

    await user.save();
    await invalidateUserCache(req.user.userId);

    logger.info(
      { userId: req.user.userId, recordedCount, renewedCount },
      'Consent recorded via explicit gate'
    );

    return res.json({
      ok:           true,
      message:      'Consent recorded successfully',
      recordedCount,
      renewedCount,
    });
  } catch (err) {
    logger.error({ err }, 'record-consent error');
    return res.status(500).json({ ok: false, error: 'Failed to record consent' });
  }
});

// GET /api/v1/legal/my-consents — authenticated: returns user's consent audit trail
router.get('/my-consents', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('legalConsents email')
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const consents = (user.legalConsents ?? []).map((c) => ({
      policyType:  c.policyType,
      version:     c.version,
      policyHash:  c.policyHash || null,
      acceptedAt:  c.acceptedAt,
      method:      c.method,
      // IP and user-agent are omitted from client-facing response for privacy
    }));

    // Enrich with current policy versions so the UI can detect outdated consents
    const currentVersions = Object.fromEntries(
      Object.entries(POLICIES).map(([key, p]) => [key, { version: p.version, policyHash: p.policyHash }])
    );

    return res.json({
      ok: true,
      consents,
      currentVersions,
    });
  } catch (err) {
    logger.error({ err }, 'my-consents error');
    return res.status(500).json({ ok: false, error: 'Failed to retrieve consent records' });
  }
});

// PATCH /api/v1/legal/cookie-consent — authenticated: update cookie preferences
router.patch('/cookie-consent', requireAuth, consentLimiter, async (req, res) => {
  try {
    const { analytics, preferences } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const oldConsent = {
      analytics: user.cookieConsent?.analytics ?? false,
      preferences: user.cookieConsent?.preferences ?? true,
    };

    user.cookieConsent = {
      version: '1.0',
      acceptedAt: new Date(),
      functional: true,
      analytics: typeof analytics === 'boolean' ? analytics : user.cookieConsent?.analytics ?? false,
      preferences: typeof preferences === 'boolean' ? preferences : user.cookieConsent?.preferences ?? true,
    };

    await user.save();
    await invalidateUserCache(user.id);

    // Audit log - fire-and-forget
    auditLog(req, 'cookie_consent_updated', 'user', user.id, {
      oldValue: oldConsent,
      newValue: {
        analytics: user.cookieConsent.analytics,
        preferences: user.cookieConsent.preferences,
      },
    });

    return res.json({ ok: true, cookieConsent: user.cookieConsent });
  } catch (err) {
    logger.error({ err }, 'cookie-consent update error');
    return res.status(500).json({ ok: false, error: 'Failed to update cookie preferences' });
  }
});

// PATCH /api/v1/legal/communication-consent — authenticated: update communication preferences
router.patch('/communication-consent', requireAuth, consentLimiter, async (req, res) => {
  try {
    const { productAnnouncements, newsletters, featureUpdates } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const now = new Date();
    const prev = user.communicationConsent || {};
    const oldConsent = {
      productAnnouncements: prev.productAnnouncements ?? false,
      newsletters: prev.newsletters ?? false,
      featureUpdates: prev.featureUpdates ?? false,
    };

    // Only update fields that were explicitly passed; track per-field timestamps
    const updated = {
      productAnnouncements:   typeof productAnnouncements === 'boolean' ? productAnnouncements : (prev.productAnnouncements ?? false),
      productAnnouncementsAt: typeof productAnnouncements === 'boolean' && productAnnouncements !== prev.productAnnouncements
                                ? now : (prev.productAnnouncementsAt ?? null),
      newsletters:            typeof newsletters === 'boolean' ? newsletters : (prev.newsletters ?? false),
      newslettersAt:          typeof newsletters === 'boolean' && newsletters !== prev.newsletters
                                ? now : (prev.newslettersAt ?? null),
      featureUpdates:         typeof featureUpdates === 'boolean' ? featureUpdates : (prev.featureUpdates ?? false),
      featureUpdatesAt:       typeof featureUpdates === 'boolean' && featureUpdates !== prev.featureUpdates
                                ? now : (prev.featureUpdatesAt ?? null),
      updatedAt:              now,
    };

    user.communicationConsent = updated;
    await user.save();
    await invalidateUserCache(user.id);

    // Audit trail — non-blocking
    auditLog(req, 'communication_consent_updated', 'user', user.id, {
      oldValue: oldConsent,
      newValue: {
        productAnnouncements: updated.productAnnouncements,
        newsletters:          updated.newsletters,
        featureUpdates:       updated.featureUpdates,
      },
    });

    return res.json({ ok: true, communicationConsent: user.communicationConsent });
  } catch (err) {
    logger.error({ err }, 'communication-consent update error');
    return res.status(500).json({ ok: false, error: 'Failed to update communication consent' });
  }
});

// Individual policy endpoints
router.get('/terms', (req, res) => {
  res.json({ ok: true, policy: POLICIES.terms });
});

router.get('/privacy', (req, res) => {
  res.json({ ok: true, policy: POLICIES.privacy });
});

router.get('/refund-policy', (req, res) => {
  res.json({ ok: true, policy: POLICIES['refund-policy'] });
});

router.get('/data-processing', (req, res) => {
  res.json({ ok: true, policy: POLICIES['data-processing'] });
});

router.get('/cookie-policy', (req, res) => {
  res.json({ ok: true, policy: POLICIES['cookie-policy'] });
});

export { POLICIES, computePolicyHash };
export default router;
