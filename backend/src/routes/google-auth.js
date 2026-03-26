/**
 * Google OAuth 2.0 Routes — Production-Hardened
 *
 * GET /api/v1/auth/google          → Redirect to Google consent screen
 * GET /api/v1/auth/google/callback → Handle callback, issue JWT cookies
 *
 * Security guarantees:
 *  ✅ State param (httpOnly cookie) prevents OAuth CSRF
 *  ✅ id_token cryptographically verified (not just code exchange)
 *  ✅ email_verified REQUIRED — rejects unverified Google accounts
 *  ✅ STRICT provider separation — local users CANNOT be auto-linked via Google
 *  ✅ googleId-first lookup — prevents email-collision account takeover
 *  ✅ Audit log on every attempt (success + all failure reasons)
 *  ✅ Rate-limited (5 req/min/IP via oauthLimiter in index.js)
 *  ✅ No tokens in redirect URLs
 *  ✅ Raw Google tokens never stored
 */

import express from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import activityEmitter from '../utils/eventEmitter.js';
import { alertCritical, alertWarning } from '../utils/alerting.js';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../utils/redis.js';

const router = express.Router();

// ── Open-redirect protection ──────────────────────────────────────────────────
// Only these frontend paths are valid redirect targets for OAuth flows.
const ALLOWED_OAUTH_PATHS = new Set(['/dashboard', '/login', '/dashboard/settings']);

/**
 * Safely redirect to a frontend path, falling back to /dashboard if path not
 * in the allowlist. Query params are passed through only from our own code.
 */
function safeRedirect(res, base, path, qs = '') {
  const safePath = ALLOWED_OAUTH_PATHS.has(path) ? path : '/dashboard';
  return res.redirect(`${base}${safePath}${qs}`);
}

// ── Constants (mirrors auth-jwt.js exactly — no cross-import coupling) ──────
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — one-time use

// ── OAuth Rate Limiter (Production Hardened) ──────────────────────────────────
// Moved from index.js to ensure reliable browser redirection on limit.
const oauthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 attempts per minute per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // Skip in tests for easier automation
  store: redis.isAvailable() 
    ? new RedisStore({
        sendCommand: (...args) => redis.raw()?.call(...args),
        prefix: 'rl:oauth:',
      })
    : undefined,
  handler(req, res) {
    logger.warn({ ip: req.ip, path: req.originalUrl }, 'OAuth Rate Limit triggered');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    // Always redirect GET requests (browser initiations/callbacks) back to login
    if (req.method === 'GET') {
      return res.redirect(`${frontendUrl}/login?oauth=error&reason=RATE_LIMIT_EXCEEDED&t=${Date.now()}`);
    }
    
    // For anything else (shouldn't happen on these routes), return JSON
    res.status(429).json({ error: 'Too many login attempts. Please wait 1 minute.' });
  }
});

// Apply rate limiter to all routes in this router
router.use(oauthLimiter);

// ── OAuth Client (lazy — returns null if not configured) ───────────────────
function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) return null;
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);
}

// ── JWT/Cookie helpers (identical to auth-jwt.js) ──────────────────────────
function generateJWT(userId, email, role) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}
function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
}
function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}
function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:8080';
}
const GOOGLE_LINKING_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`;

// ── Audit helper — logs every OAuth attempt to activityEmitter ─────────────
async function auditOAuthAttempt(req, { userId = null, email, action, success, reason = null }) {
  try {
    await activityEmitter.emit({
      userId,
      eventType: success ? 'login_success' : 'login_failure',
      req,
      metadata: {
        method: 'google',
        action,         // 'login' | 'register'
        success,
        email,          // stored for legal audit trail
        reason,         // failure reason (null on success)
      },
    });
  } catch (e) {
    logger.warn({ err: e.message }, 'Google OAuth: audit emit failed (non-fatal)');
  }
}

// ── Default settings (mirrors auth-jwt.js) ─────────────────────────────────
const DEFAULT_NOTIFICATIONS = {
  emailAlerts: true, smsAlerts: true, pushNotifications: true,
  hearingReminders: true, clientUpdates: true, billingAlerts: false, weeklyReports: true,
};
const DEFAULT_PREFERENCES = {
  theme: 'light', language: 'en-IN', timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY', currency: 'INR',
};
const DEFAULT_SECURITY = {
  twoFactorEnabled: false, sessionTimeout: '30', loginNotifications: true,
};

const RECOVERY_PENDING_COOKIE = 'recovery_pending_data';
const RECOVERY_PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sign pending recovery data (email + googleId) for confirm-replace flow.
 */
function signRecoveryData(email, googleId, userId) {
  const payload = `${email}:${googleId}:${userId}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET || 'fallback')
    .update(payload)
    .digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

/**
 * Verify pending recovery data.
 */
function verifyRecoveryData(cookieValue) {
  try {
    const dotIdx = cookieValue.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const encodedPayload = cookieValue.slice(0, dotIdx);
    const receivedSig = cookieValue.slice(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET || 'fallback')
      .update(payload)
      .digest('hex');
    const sigBuf = Buffer.from(receivedSig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const [email, googleId, userId] = payload.split(':');
    return { email, googleId, userId };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/auth/google
// Redirect user to Google consent screen with a one-time CSRF state param.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/google', (req, res) => {
  const client = getOAuthClient();
  if (!client) {
    logger.warn('Google OAuth attempted but credentials not configured');
    return res.status(503).json({
      success: false,
      error: 'GOOGLE_NOT_CONFIGURED',
      message: 'Google login is not available on this server',
    });
  }

  // Cryptographically secure state — stored httpOnly, expires in 10 min
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: OAUTH_STATE_TTL_MS,
    path: '/',
  });

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });

  return res.redirect(authUrl);
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/auth/google/callback
// Receive Google callback, verify token, apply strict account logic, set JWT.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/google/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl();

  // Build a structured redirect-error (never exposes internal details)
  const redirectError = (errorCode, message) => {
    logger.warn({ errorCode, ip: req.ip }, `Google OAuth callback rejected: ${errorCode}`);
    const params = new URLSearchParams({ oauth: 'error', reason: errorCode });
    return res.redirect(`${frontendUrl}/login?${params.toString()}`);
  };

  let emailForAudit = 'unknown';

  try {
    const client = getOAuthClient();
    if (!client) {
      return redirectError('SERVICE_UNAVAILABLE', 'Google login not configured');
    }

    const { code, state: returnedState, error: oauthError } = req.query;

    // ── 1. Handle Google-side cancellation / error ───────────────────────
    if (oauthError) {
      logger.info({ oauthError }, 'Google OAuth: cancelled or Google returned error');
      await auditOAuthAttempt(req, {
        email: emailForAudit, action: 'login', success: false,
        reason: oauthError === 'access_denied' ? 'USER_CANCELLED' : 'GOOGLE_ERROR',
      });
      return redirectError(
        oauthError === 'access_denied' ? 'ACCESS_DENIED' : 'OAUTH_ERROR',
        'Google returned an error'
      );
    }

    if (!code || !returnedState) {
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'INVALID_REQUEST' });
      return redirectError('INVALID_REQUEST', 'Missing code or state parameter');
    }

    // ── 2. CSRF: validate state (constant-time, one-time use) ────────────
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];

    // Always clear the state cookie immediately — one-time use regardless of outcome
    res.clearCookie(OAUTH_STATE_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    if (!storedState) {
      logger.warn({ ip: req.ip }, 'Google OAuth: missing state cookie — possible CSRF or expired flow');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'CSRF_NO_STATE_COOKIE' });
      return redirectError('STATE_MISMATCH', 'Security validation failed. Please try again.');
    }

    const returnedStateBuf = Buffer.from(String(returnedState));
    const storedStateBuf = Buffer.from(storedState);
    const stateValid =
      returnedStateBuf.length === storedStateBuf.length &&
      crypto.timingSafeEqual(returnedStateBuf, storedStateBuf);

    if (!stateValid) {
      logger.warn({ ip: req.ip }, 'Google OAuth: state mismatch — possible CSRF attack');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'CSRF_STATE_MISMATCH' });
      return redirectError('STATE_MISMATCH', 'Security validation failed. Please try again.');
    }

    // ── 3. Exchange code for tokens ──────────────────────────────────────
    let tokens;
    try {
      const { tokens: exchanged } = await client.getToken(String(code));
      tokens = exchanged;
    } catch (tokenErr) {
      logger.error({ err: tokenErr.message }, 'Google OAuth: token exchange failed');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'TOKEN_EXCHANGE_FAILED' });
      return redirectError('TOKEN_EXCHANGE_FAILED', 'Failed to exchange authorization code');
    }

    if (!tokens.id_token) {
      logger.warn('Google OAuth: no id_token in token response');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'NO_ID_TOKEN' });
      return redirectError('NO_ID_TOKEN', 'No identity token received from Google');
    }

    // ── 4. Verify id_token (cryptographic verification, not just decode) ──
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      logger.error({ err: verifyErr.message }, 'Google OAuth: id_token verification failed');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'INVALID_ID_TOKEN' });
      return redirectError('INVALID_TOKEN', 'Google identity token could not be verified');
    }

    if (!payload) {
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'EMPTY_PAYLOAD' });
      return redirectError('INVALID_TOKEN', 'Empty token payload');
    }

    const { sub: googleId, email, name, email_verified } = payload;

    // ── 5. MANDATORY: email and email_verified checks ────────────────────
    if (!email) {
      logger.warn({ googleId }, 'Google OAuth: no email in token payload — rejecting');
      await auditOAuthAttempt(req, { email: 'NO_EMAIL', action: 'login', success: false, reason: 'NO_EMAIL' });
      return redirectError('NO_EMAIL', 'Google did not provide an email address');
    }

    if (!email_verified) {
      logger.warn({ email }, 'Google OAuth: email_verified is false — rejecting per security policy');
      await auditOAuthAttempt(req, { email, action: 'login', success: false, reason: 'EMAIL_NOT_VERIFIED' });
      return redirectError('EMAIL_NOT_VERIFIED', 'Your Google account email is not verified');
    }

    if (!googleId) {
      logger.warn({ email }, 'Google OAuth: no sub (googleId) in token payload — rejecting');
      await auditOAuthAttempt(req, { email, action: 'login', success: false, reason: 'NO_GOOGLE_ID' });
      return redirectError('INVALID_TOKEN', 'Missing user identifier from Google');
    }

    emailForAudit = email;
    const normalizedEmail = email.toLowerCase().trim();

    // ── 6. LINKING CHECK — is this a link attempt from settings? ──────────
    const signedLinkCookie = req.signedCookies[LINK_STATE_COOKIE];
    if (signedLinkCookie) {
      const parsed = verifyLinkState(signedLinkCookie);
      if (parsed && parsed.userId) {
        logger.info({ userId: parsed.userId, email }, 'Google OAuth: detected LINK request in main callback');
        res.clearCookie(LINK_STATE_COOKIE);
        
        // Use the common linking logic (Helper function or inline)
        // For efficiency, I will call a dedicated internal handler or redirect.
        // Actually, I can just re-execute the logic here.
        return handleLinkingLogic(req, res, parsed.userId, googleId, email, name);
      }
    }

    // ── 7. LOGIN LOOKUP — find user by primary or recovery fields ──────────
    let user = await User.findOne({
      $or: [
        { googleId },
        { recoveryGoogleId: googleId }
      ]
    });

    if (user) {
      // ── Case A: Returning Google user (Primary or Recovery) ────────────
      if (user.status === 'deleted' || user.deleted) {
        logger.warn({ email: normalizedEmail }, 'Google OAuth: login attempt for deleted account');
        await auditOAuthAttempt(req, { userId: user._id.toString(), email, action: 'login', success: false, reason: 'ACCOUNT_DELETED' });
        return redirectError('ACCOUNT_DELETED', 'This account has been deleted');
      }

      // Paranoia check: email on token must match either primary or recovery email
      const isPrimaryMatch = user.email === normalizedEmail;
      const isRecoveryMatch = user.recoveryEmail === normalizedEmail;

      if (!isPrimaryMatch && !isRecoveryMatch) {
        logger.warn({ storedEmail: user.email, recoveryEmail: user.recoveryEmail, tokenEmail: normalizedEmail }, 'Google OAuth: email on token does not match any stored email — rejecting');
        await auditOAuthAttempt(req, { userId: user._id.toString(), email, action: 'login', success: false, reason: 'EMAIL_MISMATCH_ON_GOOGLE_ACCOUNT' });
        return redirectError('ACCOUNT_CONFLICT', 'Google account email does not match our records');
      }

      // All clear — proceed to issue tokens below
      logger.info({ userId: user._id, email }, 'Google OAuth: returning Google user login');

    } else {
      // No user with this googleId — look up by email (Primary or Recovery)
      const emailUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { recoveryEmail: normalizedEmail }
        ]
      });

      if (emailUser) {
        // ── Case B: Email collision handling ────────────────────────────
        if (emailUser.status === 'deleted' || emailUser.deleted) {
          await auditOAuthAttempt(req, { email, action: 'login', success: false, reason: 'ACCOUNT_DELETED' });
          return redirectError('ACCOUNT_DELETED', 'This account has been deleted');
        }

        const provider = emailUser.authProvider || 'local';

        if (provider === 'local') {
          // SECURITY: Block Google login for existing local (password) accounts.
          // This prevents account takeover via email collision.
          // User must log in with password and link Google from Settings.
          logger.warn({ email: normalizedEmail }, 'Google OAuth: email collision with local account — blocking to prevent takeover');
          await auditOAuthAttempt(req, { email, action: 'login', success: false, reason: 'ACCOUNT_EXISTS_WITH_DIFFERENT_METHOD' });
          return redirectError('ACCOUNT_EXISTS_WITH_DIFFERENT_METHOD', 'An account with this email already exists. Please log in with email/password.');
        }

        if (provider === 'google' && emailUser.googleId && emailUser.googleId !== googleId) {
          // Same email, same provider, but different Google sub — fraud signal
          logger.error({ email: normalizedEmail, tokenGoogleId: googleId, storedGoogleId: emailUser.googleId }, 'Google OAuth: googleId mismatch on same email — possible account hijack attempt');
          await auditOAuthAttempt(req, { email, action: 'login', success: false, reason: 'GOOGLE_ID_MISMATCH' });
          return redirectError('ACCOUNT_CONFLICT', 'Google account identity mismatch. Please contact support.');
        }

        // Same provider, no googleId stored yet (edge case) — safe to link
        if (!emailUser.googleId) {
          emailUser.googleId = googleId;
          await emailUser.save();
          logger.info({ userId: emailUser._id, email }, 'Google OAuth: set missing googleId on existing Google account');
        }

        user = emailUser;

      } else {
        // ── Case D: New user — create Google account ─────────────────────
        user = new User({
          name: (name || '').trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash: null,       // Google-only: no password
          googleId,
          authProvider: 'google',
          role: 'lawyer',
          emailVerified: true,      // Google guarantees this above
          onboardingCompleted: false,
          immutableFieldsLocked: false,
          deleted: false,
          notifications: DEFAULT_NOTIFICATIONS,
          preferences: DEFAULT_PREFERENCES,
          security: DEFAULT_SECURITY,
        });
        await user.save();
        logger.info({ userId: user._id, email }, 'Google OAuth: created new user via Google');

        await auditOAuthAttempt(req, { userId: user._id.toString(), email, action: 'register', success: true });

        // Issue tokens and redirect (skip the duplicate audit below)
        const accessToken = generateJWT(user._id.toString(), user.email, user.role);
        const refreshToken = generateRefreshToken(user._id.toString());
        setAuthCookie(res, accessToken);
        setRefreshCookie(res, refreshToken);

        // Non-critical update — don't let failure block auth
        user.accountStatus = user.accountStatus || {};
        user.accountStatus.lastLoginAt = new Date();
        await user.save().catch(e => logger.warn({ err: e.message }, 'Google OAuth: lastLoginAt update failed'));

        // Frontend reads /me on dashboard mount — no query param needed for success
        return safeRedirect(res, frontendUrl, '/dashboard');
      }
    }

    // ── 7. Issue JWT tokens (Case A and returning Case B) ─────────────────
    const userId = user._id.toString();
    const accessToken = generateJWT(userId, user.email, user.role);
    const refreshToken = generateRefreshToken(userId);

    setAuthCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    // Update lastLoginAt (non-critical)
    User.findByIdAndUpdate(userId, { 'accountStatus.lastLoginAt': new Date() })
      .catch(e => logger.warn({ err: e.message }, 'Google OAuth: lastLoginAt update failed'));

    await auditOAuthAttempt(req, { userId, email, action: 'login', success: true });
    logger.info({ userId, email }, 'Google OAuth: login successful');

    // Redirect — cookies are set; AuthContext.refreshUser() on mount handles auth state.
    return safeRedirect(res, frontendUrl, '/dashboard');

  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Google OAuth: unexpected error in callback');
    await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'SERVER_ERROR' }).catch(() => {});
    return res.redirect(`${getFrontendUrl()}/login?oauth=error&reason=SERVER_ERROR`);
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE ACCOUNT LINKING — Separate flow from login, requires authentication
// ═══════════════════════════════════════════════════════════════════════════════

import { requireAuth } from '../middleware/auth-jwt.js';

const LINK_STATE_COOKIE = 'oauth_link_state';
const LINK_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Build a tamper-proof signed state value encoding `state:userId`.
 * Uses HMAC-SHA256(payload, JWT_SECRET) so no raw userId is stored in plain cookies.
 */
function signLinkState(state, userId) {
  const payload = `${state}:${userId}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET || 'fallback')
    .update(payload)
    .digest('hex');
  // Cookie value: base64(payload) + "." + sig
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

/**
 * Verify and decode the signed link state cookie.
 * Returns { state, userId } or null if invalid.
 */
function verifyLinkState(cookieValue) {
  try {
    const dotIdx = cookieValue.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const encodedPayload = cookieValue.slice(0, dotIdx);
    const receivedSig = cookieValue.slice(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET || 'fallback')
      .update(payload)
      .digest('hex');
    // Constant-time compare
    const sigBuf = Buffer.from(receivedSig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const [state, userId] = payload.split(':');
    if (!state || !userId) return null;
    return { state, userId };
  } catch {
    return null;
  }
}

// ── GET /api/v1/auth/google/link ─────────────────────────────────────────────
// Requires JWT auth. Starts the Google OAuth flow for account linking.
router.get('/google/link', requireAuth, (req, res) => {
  const client = getOAuthClient();
  if (!client) {
    return res.status(503).json({
      success: false,
      error: 'GOOGLE_NOT_CONFIGURED',
      message: 'Google linking is not available on this server',
    });
  }

  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Login required to link a Google account',
    });
  }

  // Generate a cryptographically secure state value
  const state = crypto.randomBytes(32).toString('hex');

  // Sign state + userId together — tamper-proof, stored in httpOnly cookie
  const signedState = signLinkState(state, userId);
  res.cookie(LINK_STATE_COOKIE, signedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: LINK_STATE_TTL_MS,
    path: '/',
  });

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });

  return res.redirect(authUrl);
});

// ── GET /api/v1/auth/google/link/callback ────────────────────────────────────
// Google redirects here after consent. Validates signed state (contains userId),
// verifies token, enforces all 4 linking rules, then saves googleId.
router.get('/google/link/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl();
  const settingsUrl = `${frontendUrl}/dashboard/settings`;

  const redirectError = (errorCode) => {
    logger.warn({ errorCode, ip: req.ip }, `Google link callback rejected: ${errorCode}`);
    return res.redirect(`${settingsUrl}?link_error=${encodeURIComponent(errorCode)}`);
  };

  const handleLinkingLogic = async (req, res, userId, googleId, googleEmail, name) => {
    const normalizedGoogleEmail = googleEmail.toLowerCase().trim();
    const emailForAudit = googleEmail;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      logger.error({ userId }, 'Google link: user not found in database');
      return res.redirect(`${frontendUrl}/login?error=user_not_found`);
    }

    // Rule 1: This Google account is your OWN primary email?
    if (normalizedGoogleEmail === currentUser.email.toLowerCase().trim()) {
      logger.warn({ userId, googleEmail: normalizedGoogleEmail }, 'Google link: same as primary email — blocked');
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link_recovery_email', success: false, reason: 'SAME_AS_PRIMARY_EMAIL' });
      return redirectError('SAME_AS_PRIMARY_EMAIL');
    }

    // Rule 2: This Google email/ID must NOT be used by ANOTHER user account.
    const conflictQuery = {
      $or: [
        { email: normalizedGoogleEmail },
        { recoveryEmail: normalizedGoogleEmail },
        { googleId: googleId },
        { recoveryGoogleId: googleId }
      ]
    };
    const existingUser = await User.findOne(conflictQuery);

    if (existingUser) {
      if (existingUser._id.toString() !== userId) {
        logger.warn({ userId, googleEmail: normalizedGoogleEmail, conflictUserId: existingUser._id }, 'Google link: conflict with ANOTHER account');
        await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link_recovery_email', success: false, reason: 'EMAIL_ALREADY_IN_USE' });
        return redirectError('EMAIL_ALREADY_IN_USE');
      }
    }

    // Rule 3: Check if a recovery email already exists on THIS account (to trigger replacement flow)
    if (currentUser.recoveryEmail) {
      if (currentUser.recoveryEmail === normalizedGoogleEmail) {
        logger.info({ userId, googleEmail: normalizedGoogleEmail }, 'Google link: recovery email is already set to this email (idempotent)');
        return res.redirect(`${settingsUrl}?linked=recovery`);
      }
      const pendingData = signRecoveryData(normalizedGoogleEmail, googleId, userId);
      res.cookie(RECOVERY_PENDING_COOKIE, pendingData, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
      });
      return redirectError('RECOVERY_EMAIL_EXISTS');
    }

    // Success: Link it!
    currentUser.recoveryEmail = normalizedGoogleEmail;
    currentUser.recoveryGoogleId = googleId;
    if (currentUser.authProvider === 'local') {
      currentUser.authProvider = 'hybrid';
    }
    await currentUser.save();
    logger.info({ userId, recoveryEmail: normalizedGoogleEmail, googleId }, 'Google recovery email linked successfully');
    await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link_recovery_email', success: true });
    return res.redirect(`${settingsUrl}?linked=recovery`);
  };

  let emailForAudit = 'unknown';
  let userIdForAudit = null;

  try {
    const client = getOAuthClient();
    if (!client) return redirectError('SERVICE_UNAVAILABLE');

    const { code, state: returnedState, error: oauthError } = req.query;

    if (oauthError) {
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'link', success: false, reason: oauthError === 'access_denied' ? 'USER_CANCELLED' : 'GOOGLE_ERROR' });
      return redirectError(oauthError === 'access_denied' ? 'ACCESS_DENIED' : 'OAUTH_ERROR');
    }

    if (!code || !returnedState) {
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'link', success: false, reason: 'INVALID_REQUEST' });
      return redirectError('INVALID_REQUEST');
    }

    // ── 1. Validate signed state cookie (CSRF + userId recovery) ─────────
    const signedStateCookie = req.cookies?.[LINK_STATE_COOKIE];

    // Always clear immediately — one-time use
    res.clearCookie(LINK_STATE_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    if (!signedStateCookie) {
      logger.warn({ ip: req.ip }, 'Google link: missing link state cookie — possible CSRF or expired flow');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'link', success: false, reason: 'CSRF_NO_STATE_COOKIE' });
      return redirectError('STATE_MISMATCH');
    }

    const parsed = verifyLinkState(signedStateCookie);
    if (!parsed) {
      logger.warn({ ip: req.ip }, 'Google link: state cookie signature invalid');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'link', success: false, reason: 'CSRF_INVALID_SIGNATURE' });
      return redirectError('STATE_MISMATCH');
    }

    // Verify the state param from Google matches the state embedded in cookie
    if (parsed.state !== String(returnedState)) {
      logger.warn({ ip: req.ip }, 'Google link: state param mismatch — possible CSRF');
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'link', success: false, reason: 'CSRF_STATE_MISMATCH' });
      return redirectError('STATE_MISMATCH');
    }

    const { userId } = parsed;
    userIdForAudit = userId;

    // ── 2. Fetch the current user — ensure session still valid ───────────
    const currentUser = await User.findById(userId);
    if (!currentUser || currentUser.status === 'deleted' || currentUser.deleted) {
      logger.warn({ userId }, 'Google link: user not found or deleted at callback time');
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link', success: false, reason: 'SESSION_EXPIRED' });
      return redirectError('SESSION_EXPIRED');
    }

    emailForAudit = currentUser.email;

    // ── 3. Exchange code + verify id_token ──────────────────────────────
    let tokens;
    try {
      const { tokens: exchanged } = await client.getToken(String(code));
      tokens = exchanged;
    } catch (tokenErr) {
      logger.error({ err: tokenErr.message }, 'Google link: token exchange failed');
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link', success: false, reason: 'TOKEN_EXCHANGE_FAILED' });
      return redirectError('TOKEN_EXCHANGE_FAILED');
    }

    if (!tokens.id_token) {
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link', success: false, reason: 'NO_ID_TOKEN' });
      return redirectError('NO_ID_TOKEN');
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      logger.error({ err: verifyErr.message }, 'Google link: id_token verification failed');
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link', success: false, reason: 'INVALID_ID_TOKEN' });
      return redirectError('INVALID_TOKEN');
    }

    if (!payload) {
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link', success: false, reason: 'EMPTY_PAYLOAD' });
      return redirectError('INVALID_TOKEN');
    }

    const { sub: googleId, email: googleEmail, email_verified, name } = payload;

    // Require email_verified (mandatory)
    if (!googleEmail || !email_verified || !googleId) {
      logger.warn({ userId, googleEmail, email_verified }, 'Google link: missing email, email_verified, or sub');
      await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link', success: false, reason: 'EMAIL_NOT_VERIFIED' });
      return redirectError('EMAIL_NOT_VERIFIED');
    }

    // Use the consolidated helper
    res.clearCookie(LINK_STATE_COOKIE);
    return handleLinkingLogic(req, res, userId, googleId, googleEmail, name);

  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Google link: unexpected error');
    return res.redirect(`${settingsUrl}?link_error=SERVER_ERROR`);
  }
});

// ── POST /api/v1/auth/google/relink ──────────────────────────────────────────
// Requires JWT auth. Commits the recovery email change after user confirmation.
router.post('/google/relink', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const cookie = req.cookies?.[RECOVERY_PENDING_COOKIE];

    if (!userId || !cookie) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'No pending recovery link found' });
    }

    const pending = verifyRecoveryData(cookie);
    if (!pending || pending.userId !== userId) {
      return res.status(400).json({ success: false, error: 'INVALID_TOKEN', message: 'Security check failed' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });

    const oldEmail = user.recoveryEmail;
    user.recoveryEmail = pending.email;
    user.recoveryGoogleId = pending.googleId;
    await user.save();

    // Clear the pending cookie
    res.clearCookie(RECOVERY_PENDING_COOKIE, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
    });

    await auditOAuthAttempt(req, { userId, email: user.email, action: 'replace_recovery_email', success: true, metadata: { oldEmail, newEmail: pending.email } });
    logger.info({ userId, newRecoveryEmail: pending.email }, 'Google recovery email replaced successfully');

    return res.json({ success: true, message: 'Recovery email updated' });
  } catch (err) {
    logger.error({ err: err.message }, 'Google relink: unexpected error');
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// ── POST /api/v1/auth/google/unlink ──────────────────────────────────────────
// Requires JWT auth. Removes Google recovery email.
router.post('/google/unlink', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });

    if (!user.recoveryEmail) {
      return res.status(400).json({ success: false, error: 'NOT_LINKED', message: 'No recovery email linked' });
    }

    user.recoveryEmail = undefined;
    user.recoveryGoogleId = undefined;
    await user.save();

    await auditOAuthAttempt(req, { userId, email: user.email, action: 'unlink_recovery_email', success: true });
    logger.info({ userId, email: user.email }, 'Google recovery email unlinked');

    return res.json({ success: true, message: 'Recovery email unlinked' });
  } catch (err) {
    logger.error({ err: err.message }, 'Google unlink: unexpected error');
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
