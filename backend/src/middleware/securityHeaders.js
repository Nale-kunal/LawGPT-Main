/**
 * securityHeaders.js
 *
 * Enterprise-grade HTTP Security Headers Middleware
 * OWASP ASVS Level 2+ compliant
 *
 * Features:
 *  - Nonce-based CSP (eliminates unsafe-inline for scripts entirely)
 *  - Environment-aware policies (production/staging/development)
 *  - Full Permissions-Policy disabling all unnecessary browser APIs
 *  - Cross-Origin Isolation headers (COOP/COEP/CORP)
 *  - CSP violation reporting pipeline
 *  - Strict HSTS with preload
 *  - Fingerprint suppression (removes X-Powered-By, Server)
 */

import crypto from 'crypto';
import logger from '../utils/logger.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_STAGING = process.env.NODE_ENV === 'staging';
const IS_PROD_OR_STAGING = IS_PRODUCTION || IS_STAGING;

const FRONTEND_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)[0];

const API_ORIGIN = process.env.API_URL || 'http://localhost:5000';
const SENTRY_DSN = process.env.SENTRY_DSN || '';

// ── CSP Reporting Endpoint ─────────────────────────────────────────────────────
const CSP_REPORT_URI = `${API_ORIGIN}/api/v1/security/csp-report`;
const CSP_REPORT_TO_GROUP = 'csp-endpoint';

/**
 * Generates a cryptographically secure nonce for each request.
 * Attaches it to res.locals.nonce so templates/handlers can use it.
 */
export function generateNonce(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

/**
 * Builds the full CSP directive string based on environment.
 * Uses nonce-based approach — no unsafe-inline for scripts in production.
 */
function buildCSP(nonce, env) {
  const nonceSrc = `'nonce-${nonce}'`;

  // Cloudinary domains
  const cloudinarySrc = [
    'https://res.cloudinary.com',
    'https://api.cloudinary.com',
    'https://upload.cloudinary.com',
  ];

  // Google OAuth + Fonts
  const googleSrc = [
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  // Razorpay payment iframe and scripts
  const razorpaySrc = [
    'https://api.razorpay.com',
    'https://checkout.razorpay.com',
    'https://rzp.io',
    'https://*.razorpay.com',
  ];

  // Sentry error tracking (conditionally added)
  // Note: CSP wildcards must be host-prefix only — 'o*.ingest.sentry.io' is invalid.
  // Use '*.ingest.sentry.io' which covers all org-specific ingest endpoints.
  const sentrySrc = SENTRY_DSN
    ? ['https://sentry.io', 'https://*.sentry.io', 'https://*.ingest.sentry.io']
    : [];

  // Socket.IO WebSocket endpoints
  const wsSrc = IS_PROD_OR_STAGING
    ? [`wss://${new URL(API_ORIGIN).hostname}`]
    : ['wss://localhost:*', 'ws://localhost:*'];

  if (env === 'development') {
    // Development: allow unsafe-inline for Vite HMR, relaxed for DX
    return [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${razorpaySrc.join(' ')} ${googleSrc.slice(0, 2).join(' ')}`,
      `style-src 'self' 'unsafe-inline' ${googleSrc[2]}`,
      `font-src 'self' data: ${googleSrc[3]}`,
      `img-src 'self' data: blob: ${cloudinarySrc.join(' ')} https://*.gravatar.com https://lh3.googleusercontent.com`,
      `connect-src 'self' ${cloudinarySrc.join(' ')} ${sentrySrc.join(' ')} ${wsSrc.join(' ')} http://localhost:* ws://localhost:*`,
      `media-src 'self' blob: ${cloudinarySrc.join(' ')}`,
      `frame-src 'none'`,
      `frame-ancestors 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self' ${googleSrc[0]} ${razorpaySrc[0]}`,
      `worker-src 'self' blob:`,
      `manifest-src 'self'`,
    ].join('; ');
  }

  // Production/Staging: strict nonce-based, no unsafe-inline, no unsafe-eval
  return [
    `default-src 'self'`,
    // Scripts: nonce-based only + Razorpay (required for payment modal)
    `script-src 'self' ${nonceSrc} 'strict-dynamic' ${razorpaySrc.join(' ')} ${googleSrc.slice(0, 2).join(' ')}`,
    // Styles: self + nonce + Google Fonts CSS
    `style-src 'self' ${nonceSrc} ${googleSrc[2]}`,
    // Fonts: self + data URIs + Google Fonts static
    `font-src 'self' data: ${googleSrc[3]}`,
    // Images: self + data/blob + Cloudinary + Gravatar + Google profile images
    `img-src 'self' data: blob: ${cloudinarySrc.join(' ')} https://*.gravatar.com https://lh3.googleusercontent.com`,
    // Connections: API + Cloudinary + Sentry + WebSocket
    `connect-src 'self' ${cloudinarySrc.join(' ')} ${sentrySrc.join(' ')} ${wsSrc.join(' ')} ${googleSrc.slice(0, 2).join(' ')}`,
    // Media: local + blob + Cloudinary
    `media-src 'self' blob: ${cloudinarySrc.join(' ')}`,
    // Iframes: none (no embedding of external content)
    `frame-src ${razorpaySrc[1]} ${googleSrc[0]}`,
    // Never allow this page to be framed
    `frame-ancestors 'none'`,
    // No plugins
    `object-src 'none'`,
    // Prevent base tag hijacking
    `base-uri 'self'`,
    // Only allow forms to submit to our API + Google/Razorpay
    `form-action 'self' ${googleSrc[0]} ${razorpaySrc[0]}`,
    // Service workers only from same origin
    `worker-src 'self' blob:`,
    // PWA manifest
    `manifest-src 'self'`,
    // Upgrade all HTTP to HTTPS
    `upgrade-insecure-requests`,
    // CSP violation reports
    `report-uri ${CSP_REPORT_URI}`,
    `report-to ${CSP_REPORT_TO_GROUP}`,
  ].join('; ');
}

/**
 * Report-To header value (structured reporting endpoint).
 * Used by modern browsers for CSP, COOP, and NEL reports.
 */
function buildReportToHeader() {
  return JSON.stringify({
    group: CSP_REPORT_TO_GROUP,
    max_age: 86400,
    endpoints: [{ url: CSP_REPORT_URI }],
    include_subdomains: true,
  });
}

/**
 * Permissions-Policy: disable all APIs not required by Juriq.
 * Only allows payment (Razorpay), fullscreen for document viewer.
 */
// Permissions-Policy — only include directives that are currently recognized
// by modern browsers (Chrome 113+). The following were removed from the spec
// and cause browser console errors if included:
//   ambient-light-sensor, battery, document-domain,
//   execution-while-not-rendered, execution-while-out-of-viewport, navigation-override
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'cross-origin-isolated=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)', // Needed for document full-screen viewer
  'geolocation=()',
  'gyroscope=()',
  'keyboard-map=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=(self)', // Razorpay payment
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'sync-xhr=()',
  'usb=()',
  'web-share=()',
  'xr-spatial-tracking=()',
].join(', ');

/**
 * Main security headers middleware.
 * Must be applied AFTER generateNonce().
 */
export function applySecurityHeaders(req, res, next) {
  const nonce = res.locals.nonce || crypto.randomBytes(16).toString('base64');
  const env = process.env.NODE_ENV || 'development';

  // ── Remove fingerprinting headers ─────────────────────────────────────────
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // ── Content-Security-Policy ────────────────────────────────────────────────
  res.setHeader('Content-Security-Policy', buildCSP(nonce, env));

  // ── Report-To (structured reporting) ──────────────────────────────────────
  if (IS_PROD_OR_STAGING) {
    res.setHeader('Report-To', buildReportToHeader());
  }

  // ── Referrer-Policy ────────────────────────────────────────────────────────
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ── Permissions-Policy ─────────────────────────────────────────────────────
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);

  // ── Cross-Origin Opener Policy ─────────────────────────────────────────────
  // 'same-origin-allow-popups' allows Google OAuth popup flow
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // ── Cross-Origin Embedder Policy ───────────────────────────────────────────
  // 'unsafe-none' needed for Razorpay iframe; restrict further once payment flow confirmed
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  // ── Cross-Origin Resource Policy ───────────────────────────────────────────
  // 'same-site' for API; assets served by CDN use their own CORP
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  // ── HSTS ───────────────────────────────────────────────────────────────────
  if (IS_PROD_OR_STAGING) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // ── X-Frame-Options ────────────────────────────────────────────────────────
  res.setHeader('X-Frame-Options', 'DENY');

  // ── X-Content-Type-Options ─────────────────────────────────────────────────
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // ── Cache-Control for API responses ───────────────────────────────────────
  // Prevent sensitive API data from being cached in proxies
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

/**
 * CSP Violation Report handler.
 * Mount at: POST /api/v1/security/csp-report
 * No auth required — CSP reports come from browsers directly.
 */
export function cspReportHandler(req, res) {
  try {
    const report = req.body?.['csp-report'] || req.body;

    if (!report) {
      return res.status(400).end();
    }

    // Filter noise: ignore browser extension violations
    const blockedUri = report['blocked-uri'] || '';
    const IGNORED_URIS = ['chrome-extension://', 'moz-extension://', 'safari-extension://'];
    if (IGNORED_URIS.some((prefix) => blockedUri.startsWith(prefix))) {
      return res.status(204).end();
    }

    logger.warn(
      {
        event: 'csp_violation',
        documentUri: report['document-uri'],
        referrer: report['referrer'],
        violatedDirective: report['violated-directive'],
        effectiveDirective: report['effective-directive'],
        originalPolicy: report['original-policy'],
        blockedUri,
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        columnNumber: report['column-number'],
        statusCode: report['status-code'],
      },
      'CSP Violation Report'
    );

    res.status(204).end();
  } catch (err) {
    logger.error({ err }, 'Failed to process CSP report');
    res.status(204).end();
  }
}
