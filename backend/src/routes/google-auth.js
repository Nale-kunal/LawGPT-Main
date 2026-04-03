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
import AdminAuditLog from '../models/AdminAuditLog.js';
import logger from '../utils/logger.js';
import activityEmitter from '../utils/eventEmitter.js';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../utils/redis.js';
import { env } from '../config/env.js';

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

// ── Constants (Resolved dynamically to prevent loader race conditions) ──────
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
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:8080';
    
    // Always redirect GET requests (browser initiations/callbacks) back to login
    if (req.method === 'GET') {
      return res.redirect(`${frontendUrl}/login?oauth=error&reason=RATE_LIMIT_EXCEEDED&t=${Date.now()}`);
    }
    
    // For anything else (shouldn't happen on these routes), return JSON
    return res.status(429).json({ error: 'Too many login attempts. Please wait 1 minute.' });
  }
});

// Apply rate limiter to all routes in this router
router.use(oauthLimiter);

// ── OAuth Client (lazy — returns null if not configured) ───────────────────
function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    return null;
  }
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);
}

// ── JWT/Cookie helpers (identical to auth-jwt.js) ──────────────────────────
function generateJWT(userId, email, role) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign({ userId, email, role }, secret, { expiresIn: '15m' });
}
function generateRefreshToken(userId) {
  const refreshSecret = env.JWT_REFRESH_SECRET || (env.JWT_SECRET + '_refresh');
  return jwt.sign({ userId, type: 'refresh' }, refreshSecret, { expiresIn: '7d' });
}
function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
    ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
  });
  res.cookie('is_authenticated', 'true', {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
    ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
  });
}
function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
  });
}

// ── LINKING STATE HELPERS ────────────────────────────────────────────────────
const LINK_STATE_COOKIE = 'oauth_link_state';
// _LINK_STATE_TTL_MS constant removed as it was unused per ESLint

function verifyLinkState(cookieValue) {
  try {
    const dotIdx = cookieValue.lastIndexOf('.');
    if (dotIdx === -1) {
      return null;
    }
    const encodedPayload = cookieValue.slice(0, dotIdx);
    const receivedSig = cookieValue.slice(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const secret = process.env.JWT_SECRET || 'fallback';
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    const sigBuf = Buffer.from(receivedSig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const [state, userId] = payload.split(':');
    if (!state || !userId) {
      return null;
    }
    return { state, userId };
  } catch {
    return null;
  }
}
function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:8080';
}

// Moved helper function to top (hoisted or defined before use)
async function handleLinkingLogic(req, res, userId, googleId, googleEmail, _name) {
  const settingsUrl = `${getFrontendUrl()}/dashboard/settings`;
  const frontendUrl = getFrontendUrl();
  const normalizedGoogleEmail = googleEmail.toLowerCase().trim();
  const emailForAudit = googleEmail;
  const currentUser = await User.findById(userId);

  const redirectError = (errorCode) => {
    logger.warn({ errorCode, ip: req.ip }, `Google link callback rejected: ${errorCode}`);
    return res.redirect(`${settingsUrl}?linkError=${encodeURIComponent(errorCode)}`); // Changed here
  };

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

  // BLOCK DUPLICATES
  if (currentUser.authProviders && currentUser.authProviders.includes("google")) {
    logger.warn({ userId }, 'Google link: already linked');
    return redirectError('GOOGLE_ALREADY_LINKED');
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

  if (existingUser && existingUser._id.toString() !== userId) {
    logger.warn({ userId, googleEmail: normalizedGoogleEmail, conflictUserId: existingUser._id }, 'Google link: conflict with ANOTHER account');
    await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link_recovery_email', success: false, reason: 'EMAIL_ALREADY_USED' });
    return redirectError('EMAIL_ALREADY_USED');
  }

  // Verify Google Email before linking
  // In the callback, if email_verified is false, we technically reject it already. But we should double check:
  // (The token verification already rejects unverified emails, so this is safe).
  
  // Success: Link it! allow overwrite if previously present (atomically)
  const newAuthProvider = currentUser.authProvider === 'local' ? 'hybrid' : currentUser.authProvider;

  try {
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: currentUser._id,
        recoveryEmail: { $exists: false } // prevents overwrite race
      },
      {
        $set: { 
          recoveryEmail: normalizedGoogleEmail, 
          recoveryGoogleId: googleId,
          authProvider: newAuthProvider 
        },
        $addToSet: { authProviders: { $each: ["google", "email"] } }
      },
      { new: true }
    );

    if (!updatedUser) {
      logger.warn({ action: "GOOGLE_LINK_FAILED", reason: "Recovery email already set or conflict occurred", userId: currentUser._id });
      return redirectError('GOOGLE_ACCOUNT_ALREADY_IN_USE'); // Or a generic conflict error
    }
  } catch (err) {
    if (err.code === 11000) {
      logger.warn({ action: "GOOGLE_LINK_FAILED", reason: "Mongo 11000 duplicate key", userId: currentUser._id });
      return redirectError('EMAIL_ALREADY_USED');
    }
    throw err;
  }

  logger.info({
    action: "GOOGLE_LINK",
    userId: currentUser._id,
    linkedEmail: normalizedGoogleEmail,
    timestamp: new Date()
  }, 'Google recovery email linked successfully');
  await auditOAuthAttempt(req, { userId, email: emailForAudit, action: 'link_recovery_email', success: true });
  return res.redirect(`${settingsUrl}?linkSuccess=true`);
}

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

/**
 * Verify pending recovery data.
 */
function verifyRecoveryData(cookieValue) {
  try {
    const dotIdx = cookieValue.lastIndexOf('.');
    if (dotIdx === -1) {
      return null;
    }
    const encodedPayload = cookieValue.slice(0, dotIdx);
    const receivedSig = cookieValue.slice(dotIdx + 1);
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
      .update(payload)
      .digest('hex');
    const sigBuf = Buffer.from(receivedSig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
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
router.get('/google', async (req, res) => {
  const client = getOAuthClient();
  if (!client) {
    logger.warn('Google OAuth attempted but credentials not configured');
    return res.status(503).json({
      success: false,
      error: 'GOOGLE_NOT_CONFIGURED',
      message: 'Google login is not available on this server',
    });
  }

  // FAILSAFE: If a user hits this while already authenticated (AND the token is
  // still valid), redirect to dashboard. We MUST verify — not just check presence
  // — because an expired token cookie will still be present in the browser.
  if (req.cookies?.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, env.JWT_SECRET);
      
      // HARDENING: Verify the user actually exists and is active.
      // This prevents redirect loops for deleted users with stale but valid-looking tokens.
      const user = await User.findById(decoded.userId).select('status deleted');
      if (user && user.status === 'active' && !user.deleted) {
        logger.info({ userId: decoded.userId }, 'Google OAuth: User already authenticated and active. Redirecting to dashboard.');
        const frontendUrl = getFrontendUrl();
        return res.redirect(`${frontendUrl}/dashboard`);
      }
      
      // If user checks fail, we continue to clear cookies and start fresh OAuth
    } catch {
      // Token present but expired or invalid — silent fallthrough to clear below
    }
    
    // Always clear potentially stale cookies before starting a fresh OAuth flow
    const clearOptions = {
      path: '/',
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
    };
    res.clearCookie('token', clearOptions);
    res.clearCookie('is_authenticated', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
  }

  // Cryptographically secure state — stored httpOnly, expires in 10 min
  // The oauth_state cookie is set here on api.juriq.in and read back on the
  // GET /google/callback route — same host, so no cross-subdomain domain needed.
  const intent = req.query.action === 'signup' ? 'signup' : 'login';
  const stateVal = crypto.randomBytes(32).toString('hex');
  const state = `${stateVal}|${intent}`;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: OAUTH_STATE_TTL_MS,
    path: '/',
  };
  res.cookie(OAUTH_STATE_COOKIE, state, cookieOptions);

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
  const redirectError = (errorCode, _message) => {
    logger.warn({ errorCode, ip: req.ip }, `Google OAuth callback rejected: ${errorCode}`);
    
    // Dynamically check if this originated as a link flow parsing the raw state parameter
    const stateParam = req.query.state;
    if (typeof stateParam === 'string' && stateParam.startsWith('link:')) {
      return res.redirect(`${frontendUrl}/dashboard/settings?linkError=${encodeURIComponent(errorCode)}`);
    }
    
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

    const isLinkFlowFallback = typeof returnedState === 'string' && returnedState.startsWith('link:');

    // ── 0. Back-Button Navigation Bypass ────────────────────────────────────
    // If the CSRF state cookie is missing but the user already has a valid JWT,
    // they are almost certainly hitting the browser back button after a successful login.
    // We bypass the OAuth error and safely redirect them into the dashboard.
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];
    if (!storedState && !isLinkFlowFallback && !oauthError && req.cookies?.token) {
      try {
        jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        logger.info({ ip: req.ip }, 'Google OAuth: Already authenticated (back-button). Bypassing to dashboard.');
        return safeRedirect(res, frontendUrl, '/dashboard');
      } catch (_e) {
        // Token invalid/expired - ignore and let the normal OAuth error catch them
      }
    }

    // ── 1. Handle Google-side cancellation / error ───────────────────────
    if (oauthError) {
      logger.info({ oauthError }, 'Google OAuth: cancelled or Google returned error');
      await auditOAuthAttempt(req, {
        email: emailForAudit, action: 'login', success: false,
        reason: oauthError === 'access_denied' ? 'USER_CANCELLED' : 'GOOGLE_ERROR',
      });
      
      if (isLinkFlowFallback) {
        return res.redirect(`${getFrontendUrl()}/dashboard/settings?linkError=OAUTH_CANCELLED`);
      }
      return redirectError(
        oauthError === 'access_denied' ? 'ACCESS_DENIED' : 'OAUTH_ERROR',
        'Google returned an error'
      );
    }

    if (!code || !returnedState) {
      await auditOAuthAttempt(req, { email: emailForAudit, action: 'login', success: false, reason: 'INVALID_REQUEST' });
      return redirectError('INVALID_REQUEST', 'Missing code or state parameter');
    }

    // ── 1.5 INTERCEPT ENCRYPTED LINK STATE ──────────────────────────────
    let isLinkFlow = false;
    let linkUserId = null;
    
    if (typeof returnedState === 'string' && returnedState.startsWith('link:')) {
      let isError = false;
      try {
        const parts = returnedState.substring(5).split(':');
        if (parts.length === 2) {
          const iv = Buffer.from(parts[0], 'hex');
          const encrypted = parts[1];
          const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from((process.env.JWT_SECRET || 'fallback').padEnd(32, '0').slice(0, 32)), iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          const payload = JSON.parse(decrypted);
          if (payload.action === 'link' && payload.userId) {
            // New Hardening Logic: Timestamp & Nonce
            if (!payload.timestamp || Date.now() - payload.timestamp > 5 * 60 * 1000) {
              logger.warn({ userId: payload.userId }, 'Google OAuth: Link request expired');
              isError = true;
            }
            
            if (!isError && payload.nonce) {
              let exists = null;
              try {
                exists = await redis.get(`oauth_nonce:${payload.nonce}`);
              } catch (e) {
                logger.error({ err: e.message }, 'Google OAuth: Redis failure retrieving nonce');
              }
              if (!exists) {
                logger.warn({ userId: payload.userId }, 'Google OAuth: Invalid or expired nonce (Replay Attack?)');
                isError = true;
              } else {
                try { await redis.del(`oauth_nonce:${payload.nonce}`); } catch (_e) { /* ignore */ }
              }
            } else {
              isError = true;
            }

            if (!isError) {
              isLinkFlow = true;
              linkUserId = payload.userId;
            }
          }
        }
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to decrypt link state');
        isError = true;
      }
      if (isError) {
        return redirectError('STATE_MISMATCH', 'Invalid or expired request');
      }
    }

    if (!isLinkFlow) {
      // ── 2. CSRF: validate state (constant-time, one-time use) ────────────
      const storedState = req.cookies?.[OAUTH_STATE_COOKIE];

      // Always clear the state cookie immediately — one-time use regardless of outcome
      res.clearCookie(OAUTH_STATE_COOKIE, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
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
    if (isLinkFlow && linkUserId) {
      logger.info({ userId: linkUserId, email }, 'Google OAuth: detected LINK request in main callback via encrypted state');
      return handleLinkingLogic(req, res, linkUserId, googleId, email, name);
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
      const isPrimaryMatch = user.email.toLowerCase().trim() === normalizedEmail;
      const isRecoveryMatch = user.recoveryEmail && user.recoveryEmail.toLowerCase().trim() === normalizedEmail;

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
        
        // SECURITY: Check if this email was previously permanently deleted (hard-deleted)
        // This log check prevents re-registration or generic "not found" errors for 
        // accounts we want the user to know are "deleted".
        const hardDeletionLog = await AdminAuditLog.findOne({
          action: 'user_delete_hard',
          'details.email': normalizedEmail
        }).sort({ timestamp: -1 });

        if (hardDeletionLog) {
          logger.warn({ email: normalizedEmail }, 'Google OAuth: signup/login attempt for hard-deleted account');
          await auditOAuthAttempt(req, { email: normalizedEmail, action: 'login', success: false, reason: 'ACCOUNT_DELETED' });
          return redirectError('ACCOUNT_DELETED', 'This account has been deleted');
        }

        const intent = typeof returnedState === 'string' ? returnedState.split('|')[1] : 'login';
        if (intent !== 'signup') {
          logger.warn({ email: normalizedEmail }, 'Google OAuth: Prevented unauthorized google login for unknown account');
          await auditOAuthAttempt(req, { email: normalizedEmail, action: 'login', success: false, reason: 'USER_NOT_FOUND' });
          return redirectError('USER_NOT_FOUND', 'No account exists linked with this email');
        }

        // Use findOneAndUpdate upsert instead of new User().save() to safely handle
        // duplicate key race conditions (E11000) — e.g. a previous partial
        // signup left a document with this email but no googleId.
        const newUserData = {
          name: (name || '').trim() || normalizedEmail.split('@')[0],
          googleId,
          authProvider: 'google',
          role: 'lawyer',
          emailVerified: true,
          onboardingCompleted: false,
          immutableFieldsLocked: false,
          deleted: false,
          notifications: DEFAULT_NOTIFICATIONS,
          preferences: DEFAULT_PREFERENCES,
          security: DEFAULT_SECURITY,
          passwordHash: null,
        };

        user = await User.findOneAndUpdate(
          { email: normalizedEmail },
          { $setOnInsert: { email: normalizedEmail, ...newUserData } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
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
    const stateParam = req.query?.state;
    if (typeof stateParam === 'string' && stateParam.startsWith('link:')) {
      return res.redirect(`${getFrontendUrl()}/dashboard/settings?linkError=SERVER_ERROR`);
    }
    const safeMsg = encodeURIComponent(String(err.message).substring(0, 50));
    return res.redirect(`${getFrontendUrl()}/login?oauth=error&reason=SERVER_ERROR&errmsg=${safeMsg}`);
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE ACCOUNT LINKING — Separate flow from login, requires authentication
// ═══════════════════════════════════════════════════════════════════════════════

import { requireAuth } from '../middleware/auth-jwt.js';

// ── Limiter for Google Linking ───────────────────────────────────────────────
const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Too many linking attempts. Please try again later.' }
});

// ── GET /api/v1/auth/google/link ─────────────────────────────────────────────
// Requires JWT auth. Starts the Google OAuth flow for account linking.
router.get('/google/link', requireAuth, linkLimiter, async (req, res) => {
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

  // Encrypt userId into state parameter to avoid cookie reliance on cross-site callback
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  await redis.set(`oauth_nonce:${nonce}`, "valid", 300); // 5 minutes

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from((process.env.JWT_SECRET || 'fallback').padEnd(32, '0').slice(0, 32)), iv);
  const payload = JSON.stringify({ userId, action: 'link', nonce, timestamp });
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const state = `link:${iv.toString('hex')}:${encrypted}`;

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

  let emailForAudit = 'unknown';

  try {
    const client = getOAuthClient();
    if (!client) {
      return redirectError('SERVICE_UNAVAILABLE');
    }

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
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
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
    res.clearCookie(LINK_STATE_COOKIE, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
    });
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
    if (!user) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    }

    const oldEmail = user.recoveryEmail;
    user.recoveryEmail = pending.email;
    user.recoveryGoogleId = pending.googleId;
    await user.save();

    // Clear the pending cookie
    res.clearCookie(RECOVERY_PENDING_COOKIE, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN })
    });

    await auditOAuthAttempt(req, { userId, email: user.email, action: 'replace_recovery_email', success: true, metadata: { oldEmail, newEmail: pending.email } });
    logger.info({ userId, newRecoveryEmail: pending.email }, 'Google recovery email replaced successfully');

    return res.json({ success: true, message: 'Recovery email updated' });
  } catch (err) {
    logger.error({ err: err.message }, 'Google relink: unexpected error');
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// ── DELETE /api/v1/auth/google/unlink ──────────────────────────────────────────
// Requires JWT auth. Completely removes ALL Google fields from the document,
// freeing all unique/sparse index slots so values can be reused by other accounts.
router.delete('/google/unlink', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    }

    if (!user.authProviders || !user.authProviders.includes("google")) {
      return res.status(400).json({ success: false, error: 'NOT_LINKED', message: 'Google not linked' });
    }

    if (!user.authProviders.includes("email")) {
      logger.warn({ action: "GOOGLE_UNLINK_FAILED", userId: user._id, reason: "No other login method available" }, 'Google unlink failed');
      return res.status(400).json({ success: false, error: 'CANT_UNLINK', message: 'Cannot unlink Google. No other login method available.' });
    }

    // CRITICAL: Use findByIdAndUpdate with $unset — NOT .save() with field = undefined.
    //
    // Mongoose .save() with `field = undefined` does NOT send a MongoDB $unset.
    // It simply omits the field from the update, leaving the old value physically
    // present in the BSON document. For unique:sparse indexes (googleId, recoveryGoogleId,
    // recoveryEmail), the old value stays "owned" by this document and CANNOT be
    // reused by any other account — causing duplicate key errors on re-link.
    //
    // $unset physically removes the field from the document, releasing the index slot.
    const updateQuery = {
      $unset: {
        recoveryGoogleId: 1,
        recoveryEmail: 1,
      }
    };

    if (!user.googleId || user.googleId === user.recoveryGoogleId) {
      updateQuery.$set = { authProvider: 'local' };
      updateQuery.$pull = { authProviders: 'google' };
      updateQuery.$unset.googleId = 1;
    }

    await User.findByIdAndUpdate(userId, updateQuery, { new: true });

    await auditOAuthAttempt(req, { userId, email: user.email, action: 'unlink_recovery_email', success: true });
    logger.info(
      { action: 'GOOGLE_UNLINK', userId: user._id },
      'Google recovery email fully unlinked — all index slots freed'
    );

    return res.json({ success: true, message: 'Recovery email unlinked' });
  } catch (err) {
    logger.error({ err: err.message }, 'Google unlink: unexpected error');
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
