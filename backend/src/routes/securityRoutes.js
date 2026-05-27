/**
 * securityRoutes.js
 *
 * Security reporting endpoints for Juriq.
 * Mounts:
 *   POST /api/v1/security/csp-report    → CSP violation receiver
 *   GET  /api/v1/security/status        → Public security posture summary
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { cspReportHandler } from '../middleware/securityHeaders.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limit CSP reports: browsers can be noisy
const cspReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many CSP reports' },
});

/**
 * POST /api/v1/security/csp-report
 * Receives CSP violation reports from browsers.
 * Content-Type: application/csp-report OR application/json
 */
router.post(
  '/csp-report',
  cspReportLimiter,
  express.json({ type: ['application/csp-report', 'application/json'], limit: '16kb' }),
  cspReportHandler
);

/**
 * GET /api/v1/security/status
 * Public endpoint documenting Juriq's security posture.
 * Useful for security researchers and compliance auditors.
 */
router.get('/status', (_req, res) => {
  res.json({
    platform: 'Juriq',
    security: {
      https: true,
      hsts: 'max-age=63072000; includeSubDomains; preload',
      csp: 'nonce-based strict CSP',
      csrf: 'double-submit-cookie with timing-safe comparison',
      rateLimit: 'Redis-backed per-endpoint with IP escalation',
      mfa: 'TOTP (speakeasy) + Security Questions',
      oauth: 'Google OAuth 2.0 with PKCE',
      auditLog: true,
      encryptionAtRest: 'MongoDB Atlas + Cloudinary AES-256',
      vulnerabilityDisclosure: 'security@juriq.in',
    },
  });
});

export default router;
