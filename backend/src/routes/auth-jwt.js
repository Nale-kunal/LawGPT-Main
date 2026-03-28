import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import PasswordReset from '../models/PasswordReset.js';
import {
  createDocument,
  getDocumentById,
  updateDocument,
  queryDocuments,
  MODELS
} from '../services/mongodb.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/auth-jwt.js';
import { setCsrfToken } from '../middleware/csrf.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  reactivateSchema,
} from '../schemas/authSchemas.js';
import { blacklistToken, isTokenBlacklisted } from '../services/tokenService.js';
import activityEmitter from '../utils/eventEmitter.js';
import userDeletionService from '../services/userDeletionService.js';

const router = express.Router();

// ── CSRF Token Endpoint ────────────────────────────────────────────────────────
// Sets csrf-token cookie (non-httpOnly) and returns token in body.
// Called by the frontend useCSRF hook on first render.
router.get('/csrf-token', setCsrfToken);


// Helper constants
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');
const JWT_EXPIRES_IN = '15m'; // Short-lived access token
const JWT_REFRESH_EXPIRES_IN = '7d'; // Long-lived refresh token
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const ALLOWED_ROLES = ['lawyer', 'assistant'];

// Default settings
const defaultNotificationSettings = {
  emailAlerts: true,
  smsAlerts: true,
  pushNotifications: true,
  hearingReminders: true,
  clientUpdates: true,
  billingAlerts: false,
  weeklyReports: true
};

const defaultPreferenceSettings = {
  theme: 'light',
  language: 'en-IN',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR'
};

const defaultSecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: '30',
  loginNotifications: true
};

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function normalizeRole(role) {
  if (!role) { return 'lawyer'; }
  const normalized = role.toString().toLowerCase();
  return ALLOWED_ROLES.includes(normalized) ? normalized : 'lawyer';
}

function generateJWT(userId, email, role) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } // 15 min access token
  );
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/' // Must be '/' so clearCookie('/', ...) reliably removes it on logout
  });
}

function buildUserResponse(userId, profile) {
  // Auto-migrate existing users: if they have old fields populated, consider onboarding complete
  const hasLegacyData = profile.barNumber || profile.firm || profile.phone;
  const onboardingCompleted = profile.onboardingCompleted !== undefined
    ? profile.onboardingCompleted
    : (hasLegacyData ? true : false);

  return {
    id: userId,
    name: profile.name,
    email: profile.email,
    recoveryEmail: profile.recoveryEmail || null,
    recoveryGoogleId: profile.recoveryGoogleId || null,
    authProviders: profile.authProviders || ['email'],
    role: profile.role || 'lawyer',
    emailVerified: profile.emailVerified || false,
    onboardingCompleted,
    immutableFieldsLocked: profile.immutableFieldsLocked || false,
    profile: {
      fullName: profile.profile?.fullName || null,
      barCouncilNumber: profile.profile?.barCouncilNumber || profile.barNumber || null,
      currency: profile.profile?.currency || profile.preferences?.currency || null,
      phoneNumber: profile.profile?.phoneNumber || profile.phone || null,
      lawFirmName: profile.profile?.lawFirmName || profile.firm || null,
      practiceAreas: profile.profile?.practiceAreas || [],
      courtLevels: profile.profile?.courtLevels || [],
      address: profile.profile?.address || profile.address || null,
      city: profile.profile?.city || null,
      state: profile.profile?.state || null,
      country: profile.profile?.country || null,
      timezone: profile.profile?.timezone || profile.preferences?.timezone || null
    },
    notifications: profile.notifications || defaultNotificationSettings,
    preferences: profile.preferences || defaultPreferenceSettings,
    security: profile.security || defaultSecuritySettings,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  try {
    const { email, password, name, barNumber, firm, role } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength (minimum 6 characters for now)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    if (process.env.NODE_ENV === 'development') {
      logger.info('📝 Registration attempt for: %s', normalizedEmail);
    }

    // Check if user already exists (including deleted users) in either email or recoveryEmail
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { recoveryEmail: normalizedEmail }
      ]
    }).select('+passwordHash +status +deleted +deletedAt'); // Ensure all flags are loaded

    if (existingUser) {
      // Check if user was deleted
      const isDeleted = existingUser.status === 'deleted' || existingUser.deleted === true || existingUser.deletedAt;

      if (isDeleted) {
        // If the account was previously soft-deleted, we finish the job by hard-deleting it now.
        logger.info('♻️ Purging old deleted account before fresh signup: %s', normalizedEmail);
        await userDeletionService.deleteUserAccount(existingUser._id.toString());
        // After purging, we continue with normal registration flow
      } else {
        // User exists and is ACTIVE - this is a genuine conflict
        return res.status(409).json({ error: 'User with this email already exists' });
      }
    } else {
      // NO ACTIVE USER FOUND - But check if it was previously hard-deleted
      // to trigger the "Account Previously Deleted" warning as requested by the user.
      const hardDeletionLog = await AdminAuditLog.findOne({
        action: 'user_delete_hard',
        'details.email': normalizedEmail
      }).sort({ timestamp: -1 });

      if (hardDeletionLog) {
        logger.warn('⚠️ Hard-deleted account signup attempt: %s. Triggering warning popup.', normalizedEmail);
        return res.status(409).json({
          errorCode: 'ACCOUNT_DELETED',
          error: 'This email belongs to a previously deleted account.'
        });
      }
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user in MongoDB
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: normalizeRole(role),
      barNumber: barNumber?.trim() || undefined,
      firm: firm?.trim() || undefined,
      emailVerified: false,
      onboardingCompleted: false, // New users must complete onboarding
      immutableFieldsLocked: false, // Immutable fields not yet set
      deleted: false, // Explicitly set to false
      notifications: defaultNotificationSettings,
      preferences: defaultPreferenceSettings,
      security: defaultSecuritySettings
    };

    const user = await createDocument(MODELS.USERS, userData);

    if (process.env.NODE_ENV === 'development') {
      logger.info('✅ User registered successfully: %s', user.email);
    }

    // Generate JWT + refresh token
    const token = generateJWT(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Set cookies
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    // Return user data
    return res.status(201).json({
      user: buildUserResponse(user.id, user),
      token
    });
  } catch (error) {
    logger.error({ error: error.message }, '❌ Registration error');
    if (process.env.NODE_ENV === 'development') {
      logger.error({ error }, '📋 Error details');
    }
    return res.status(500).json({
      error: 'Registration failed. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

/**
 * POST /api/auth/reactivate
 * Reactivate a previously deleted account (called after user confirms dialog)
 */
router.post('/reactivate', validate({ body: reactivateSchema }), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    // If account not found, it means it was already hard-deleted.
    // If found but soft-deleted, we purge it now.
    if (existingUser) {
      const isDeleted = existingUser.status === 'deleted' || existingUser.deleted === true || existingUser.deletedAt;
      if (isDeleted) {
        logger.info('♻️ Purging old deleted account during reactivation: %s', normalizedEmail);
        await userDeletionService.deleteUserAccount(existingUser._id.toString());
      } else {
        return res.status(400).json({ error: 'This account is not deleted' });
      }
    }

    // Now proceed with fresh signup logic as this is a "whole new account" request
    const passwordHash = await User.hashPassword(password);
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'lawyer', // Default role for reactivation
      emailVerified: false,
      onboardingCompleted: false,
      immutableFieldsLocked: false,
      deleted: false,
      notifications: defaultNotificationSettings,
      preferences: defaultPreferenceSettings,
      security: defaultSecuritySettings
    };

    const user = await createDocument(MODELS.USERS, userData);
    logger.info('✅ Account reactivated as fresh signup: %s', user.email);

    const token = generateJWT(user.id, user.email, user.role);
    setAuthCookie(res, token);

    return res.status(200).json({
      user: buildUserResponse(user.id, user),
      token,
      message: 'Account reactivated successfully (fresh start)'
    });
  } catch (error) {
    logger.error({ error }, 'Reactivation error');
    return res.status(500).json({ error: 'Failed to reactivate account' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (process.env.NODE_ENV === 'development') {
      logger.info('🔐 Login attempt for: %s', normalizedEmail);
    }

    // Find users by email or recovery email
    let matchedUsers;
    try {
      matchedUsers = await User.find({
        $or: [
          { email: normalizedEmail },
          { recoveryEmail: normalizedEmail }
        ]
      });
      if (process.env.NODE_ENV === 'development') {
        logger.debug('👤 Found %d user match(es)', matchedUsers.length);
      }
    } catch (dbError) {
      logger.error({ err: dbError.message }, '❌ Database query error');
      if (process.env.NODE_ENV === 'development') {
        logger.error({ err: dbError }, '📋 DB Error details');
      }
      return res.status(500).json({
        error: 'Database error. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { details: dbError.message })
      });
    }

    if (!matchedUsers || matchedUsers.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        logger.info('❌ No user found with email or recoveryEmail: %s', normalizedEmail);
      }

      // NO ACTIVE USER FOUND - Check if it was previously hard-deleted
      const hardDeletionLog = await AdminAuditLog.findOne({
        action: 'user_delete_hard',
        'details.email': normalizedEmail
      }).sort({ timestamp: -1 });

      if (hardDeletionLog) {
        logger.warn('⚠️ Hard-deleted account login attempt: %s. Triggering warning popup.', normalizedEmail);
        return res.status(403).json({
          errorCode: 'ACCOUNT_DELETED',
          error: 'This account was deleted previously.'
        });
      }

      await activityEmitter.emit({
        userId: null,
        eventType: 'login_failure',
        req,
        metadata: { reason: 'user_not_found', email: normalizedEmail }
      });
      return res.status(401).json({ error: 'No account exists linked with this mail. Try with another mail.' });
    }

    let userDoc = null;

    // ── Google-only account guard (additive check — does not touch loop below) ──
    // If ALL active matched accounts are Google-only (no passwordHash),
    // return a specific error so the user knows to use Google login.
    const activeMatches = matchedUsers.filter(doc => !(doc.status === 'deleted' || doc.deleted === true || doc.deletedAt));
    if (activeMatches.length > 0 && activeMatches.every(doc => !doc.authProviders || !doc.authProviders.includes('email'))) {
      await activityEmitter.emit({
        userId: activeMatches[0]._id.toString(),
        eventType: 'login_failure',
        req,
        metadata: { reason: 'google_account_password_attempt', email: normalizedEmail }
      });
      return res.status(401).json({
        success: false,
        errorCode: 'USE_GOOGLE_LOGIN',
        error: 'This account uses Google login. Please sign in with Google.',
      });
    }

    // Check all matches for a valid password
    for (const doc of matchedUsers) {
      // ⚠️ CRITICAL: Check if user account has been soft-deleted BEFORE password verification
      if (doc.status === 'deleted' || doc.deleted === true || doc.deletedAt) {
        continue; // Skip deleted documents, try next match
      }

      try {
        const isValid = await doc.verifyPassword(password);
        if (isValid) {
          userDoc = doc;
          break; // Stop at the first valid active credential pair
        }
      } catch (verifyError) {
        // Log individual verification errors but keep searching
        logger.error({ err: verifyError.message }, 'Verification error for candidate %s', doc._id);
      }
    }

    if (!userDoc) {
      // Verify if ALL candidate users were soft-deleted
      const allDeleted = matchedUsers.every(doc => doc.status === 'deleted' || doc.deleted === true || doc.deletedAt);

      if (allDeleted) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('❌ All matching user accounts have been deleted');
        }
        return res.status(403).json({
          success: false,
          errorCode: 'ACCOUNT_DELETED',
          message: 'This account was deleted previously.'
        });
      }

      // Otherwise, the password(s) didn't match any active accounts
      if (process.env.NODE_ENV === 'development') {
        logger.info('❌ Invalid password for user: %s', normalizedEmail);
      }

      // Record abuse signal against the first non-deleted candidate as best-effort tracking
      const attemptTarget = matchedUsers.find(doc => !(doc.status === 'deleted' || doc.deleted === true || doc.deletedAt));
      if (attemptTarget) {
        const { recordAbuseSignal } = await import('../middleware/abuseDetection.js');
        await recordAbuseSignal(attemptTarget, 'failed_login', {}, req);

        await activityEmitter.emit({
          userId: attemptTarget._id.toString(),
          eventType: 'login_failure',
          req,
          metadata: { reason: 'invalid_password' }
        });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Since we're replacing the previous lean() query, let's map it back to a plain object
    const user = userDoc.toObject();
    user.id = userDoc._id.toString();

    // Generate JWT
    const token = generateJWT(user.id, user.email, user.role);

    // Set access cookie + refresh cookie
    const refreshToken = generateRefreshToken(user.id);
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    if (process.env.NODE_ENV === 'development') {
      logger.info('✅ Login successful for: %s', normalizedEmail);
    }

    // Update lastLoginAt
    await updateDocument(MODELS.USERS, user.id, {
      'accountStatus.lastLoginAt': new Date()
    }).catch(err => logger.error({ err }, 'Failed to update lastLoginAt'));

    await activityEmitter.emit({
      userId: user.id,
      eventType: 'login_success',
      req
    });

    // Return user data
    return res.json({
      user: buildUserResponse(user.id, user),
      token
    });
  } catch (error) {
    logger.error({ err: error.message }, '❌ Login error');
    logger.error({ stack: error.stack }, '📍 Error stack');
    if (process.env.NODE_ENV === 'development') {
      logger.error({ error }, '📋 Full error');
    }
    return res.status(500).json({
      error: 'Login failed. Please try again.',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user — clears both access + refresh token cookies
 */
router.post('/logout', async (req, res) => {
  const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '');
  const refreshToken = (req.cookies?.refreshToken);

  // Blacklist tokens in Redis for immediate revocation across all instances
  if (token) {
    // Access tokens are 15m, so blacklist for 20m to be safe
    await blacklistToken(token, 20 * 60);
  }
  if (refreshToken) {
    // Refresh tokens are 7d, so blacklist for 7d
    await blacklistToken(refreshToken, 7 * 24 * 60 * 60);
  }

  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
  };
  // Clear access token (set at path '/')
  res.clearCookie('token', { ...base, path: '/' });
  // Clear refresh token — use same path it is set with ('/')
  res.clearCookie('refreshToken', { ...base, path: '/' });
  // Belt-and-suspenders: also clear legacy '/api' path in case old cookies exist
  res.clearCookie('refreshToken', { ...base, path: '/api' });
  res.clearCookie('refreshToken', { ...base, path: '/api/v1' });
  // Clear CSRF token so a fresh one is issued on next login
  res.clearCookie('csrf-token', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/'
  });

  res.json({ message: 'Logged out successfully' });

  if (req.user?.userId) {
    await activityEmitter.emit({
      userId: req.user.userId,
      eventType: 'session_revoked',
      req
    });
  }
});

/**
 * POST /api/auth/refresh
 * Issue a new access token using the refresh token cookie
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (_err) {
      res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if refresh token is blacklisted (revoked)
    if (await isTokenBlacklisted(refreshToken)) {
      logger.error('Revoked refresh token used');
      res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select('-passwordHash -resetPasswordToken -verificationToken');
    if (!user || user.status === 'deleted' || user.deleted) {
      res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
      return res.status(401).json({ error: 'User not found or account is inactive' });
    }

    // Issue new access + refresh token pair (rotation)
    const newAccessToken = generateJWT(user._id.toString(), user.email, user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Revoke the old refresh token (rotation policy)
    await blacklistToken(refreshToken, 7 * 24 * 60 * 60);

    setAuthCookie(res, newAccessToken);
    setRefreshCookie(res, newRefreshToken);

    return res.json({ token: newAccessToken, message: 'Token refreshed' });
  } catch (error) {
    logger.error({ error }, 'Token refresh error');
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = buildUserResponse(user._id.toString(), user);
    logger.info('GET /me - profile data: %j', response.profile);
    return res.json({ user: response });
  } catch (error) {
    logger.error({ error }, 'Get profile error');
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const allowedFields = ['name', 'barNumber', 'firm', 'phone', 'address', 'bio'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedUser = await updateDocument(MODELS.USERS, req.user.userId, updates);

    return res.json({ user: buildUserResponse(updatedUser.id, updatedUser) });
  } catch (error) {
    logger.error({ error }, 'Update profile error');
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PATCH /api/auth/settings/notifications
 * Update notification settings
 */
router.patch('/settings/notifications', requireAuth, async (req, res) => {
  try {
    const user = await getDocumentById(MODELS.USERS, req.user.userId);

    const updatedNotifications = {
      ...defaultNotificationSettings,
      ...(user.notifications || {}),
      ...req.body
    };

    const updatedUser = await updateDocument(MODELS.USERS, req.user.userId, {
      notifications: updatedNotifications
    });

    return res.json({ user: buildUserResponse(updatedUser.id, updatedUser) });
  } catch (error) {
    logger.error({ error }, 'Update notification settings error');
    return res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

/**
 * PATCH /api/auth/settings/preferences
 * Update user preferences
 */
router.patch('/settings/preferences', requireAuth, async (req, res) => {
  try {
    const user = await getDocumentById(MODELS.USERS, req.user.userId);

    const updatedPreferences = {
      ...defaultPreferenceSettings,
      ...(user.preferences || {}),
      ...req.body
    };

    const updatedUser = await updateDocument(MODELS.USERS, req.user.userId, {
      preferences: updatedPreferences
    });

    return res.json({ user: buildUserResponse(updatedUser.id, updatedUser) });
  } catch (error) {
    logger.error({ error }, 'Update preferences error');
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by primary email or recovery email
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { recoveryEmail: normalizedEmail }
      ]
    }).lean();

    // Always return success even if user doesn't exist (security best practice)
    if (!user) {
      return res.json({ message: 'If that email exists, a password reset link has been sent' });
    }

    // Set id for consistency
    user.id = user._id.toString();

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    // Store reset token in database
    await createDocument(MODELS.PASSWORD_RESETS, {
      userId: user.id,
      email: normalizedEmail,
      tokenHash,
      expiresAt
    });

    // Send email to the PRIMARY email ALWAYS (never to recovery email)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (emailError) {
      logger.error({ emailError }, 'Failed to send password reset email');
      // Continue anyway - token is stored
    }

    await activityEmitter.emit({
      userId: user.id,
      eventType: 'password_reset_request',
      req
    });

    return res.json({ message: 'If that email exists, a password reset link has been sent' });
  } catch (error) {
    logger.error({ error }, 'Forgot password error');
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', validate({ body: resetPasswordSchema }), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Hash the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetRequests = await queryDocuments(MODELS.PASSWORD_RESETS, [
      { field: 'tokenHash', operator: '==', value: tokenHash }
    ]);

    if (resetRequests.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetRequest = resetRequests[0];

    // Check if token is expired
    if (new Date(resetRequest.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await User.hashPassword(newPassword);

    // Update user password
    await updateDocument(MODELS.USERS, resetRequest.userId, { passwordHash });

    // Delete used reset token
    await PasswordReset.deleteMany({ userId: resetRequest.userId });

    await activityEmitter.emit({
      userId: resetRequest.userId,
      eventType: 'password_reset_success',
      req
    });

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error({ error }, 'Reset password error');
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * PUT /api/auth/me
 * Update user profile and settings (unified endpoint)
 */
router.put('/me', requireAuth, async (req, res) => {
  logger.info('🔥🔥🔥 PUT /me ENDPOINT HIT 🔥🔥🔥');
  try {
    const { name, recoveryEmail, profile, notifications, preferences, security } = req.body;

    logger.info('📝 PUT /api/auth/me - Received: %j', { name, recoveryEmail, profile });

    // Get current user
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update object - only allow updating editable fields
    const updateQuery = { $set: {} };

    // Update display name if provided
    if (name !== undefined) {
      updateQuery.$set.name = name.trim();
    }

    // Process recovery email update
    if (recoveryEmail !== undefined) {
      let normalizedRecoveryEmail = null;

      if (recoveryEmail?.trim()) {
        normalizedRecoveryEmail = recoveryEmail.toLowerCase().trim();

        if (normalizedRecoveryEmail === user.email.toLowerCase()) {
          return res.status(400).json({ error: 'Recovery email cannot be the same as your primary email' });
        }

        const existingEmailConflict = await User.findOne({
          $or: [
            { email: normalizedRecoveryEmail },
            { recoveryEmail: normalizedRecoveryEmail }
          ],
          $and: [
            { status: { $ne: 'deleted' } },
            { deleted: { $ne: true } }
          ]
        });

        if (existingEmailConflict && existingEmailConflict._id.toString() !== req.user.userId) {
          return res.status(409).json({
            errorCode: 'EMAIL_EXISTS',
            error: 'This recovery email is already in use by another account.'
          });
        }
      }

      if (normalizedRecoveryEmail) {
        updateQuery.$set.recoveryEmail = normalizedRecoveryEmail;
      } else {
        updateQuery.$unset = { recoveryEmail: 1, recoveryGoogleId: 1 };
        if (!user.googleId || user.googleId === user.recoveryGoogleId) {
          updateQuery.$set = updateQuery.$set || {};
          updateQuery.$set.authProvider = 'local';
          updateQuery.$pull = { authProviders: 'google' };
          updateQuery.$unset.googleId = 1;
        }
      }
    }

    // Update editable profile fields (NOT immutable: fullName, barCouncilNumber, currency)
    if (profile) {
      if (profile.lawFirmName !== undefined) { updateQuery.$set['profile.lawFirmName'] = profile.lawFirmName?.trim() || null; }
      if (profile.practiceAreas !== undefined) { updateQuery.$set['profile.practiceAreas'] = profile.practiceAreas || []; }
      if (profile.courtLevels !== undefined) { updateQuery.$set['profile.courtLevels'] = profile.courtLevels || []; }
      if (profile.phoneNumber !== undefined) { updateQuery.$set['profile.phoneNumber'] = profile.phoneNumber?.trim() || null; }
      if (profile.address !== undefined) { updateQuery.$set['profile.address'] = profile.address?.trim() || null; }
      if (profile.city !== undefined) { updateQuery.$set['profile.city'] = profile.city?.trim() || null; }
      if (profile.state !== undefined) { updateQuery.$set['profile.state'] = profile.state?.trim() || null; }
      if (profile.country !== undefined) { updateQuery.$set['profile.country'] = profile.country?.trim() || null; }
      if (profile.timezone !== undefined) { updateQuery.$set['profile.timezone'] = profile.timezone || 'Asia/Kolkata'; }
    }

    // Update notification settings
    if (notifications) {
      updateQuery.$set.notifications = { ...(user.notifications?.toObject?.() || user.notifications || {}), ...notifications };
    }

    // Update preferences
    if (preferences) {
      updateQuery.$set.preferences = { ...(user.preferences?.toObject?.() || user.preferences || {}), ...preferences };
    }

    // Update security settings
    if (security) {
      updateQuery.$set.security = { ...(user.security?.toObject?.() || user.security || {}), ...security };
    }

    logger.info('💾 Saving update fields: %j', updateQuery);

    // Perform update
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = buildUserResponse(updatedUser._id.toString(), updatedUser);
    logger.info('✅ Profile updated. New profile: %j', response.profile);

    // Emit activity event if recovery email was added/changed/removed
    if (recoveryEmail !== undefined && recoveryEmail !== user.recoveryEmail) {
      await activityEmitter.emit({
        userId: req.user.userId,
        eventType: 'profile_update',
        req,
        metadata: {
          action: 'recovery_email_changed',
          oldValue: user.recoveryEmail || null,
          newValue: updateQuery.$set.recoveryEmail || null
        }
      });
    }

    return res.json({
      user: response,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Update user error');
    return res.status(500).json({ error: 'Failed to update user data' });
  }
});

/**
 * PATCH /api/auth/settings/security
 * Update security settings
 */
router.patch('/settings/security', requireAuth, async (req, res) => {
  try {
    const user = await getDocumentById(MODELS.USERS, req.user.userId);

    const updatedSecurity = {
      ...defaultSecuritySettings,
      ...(user.security || {}),
      ...req.body
    };

    const updatedUser = await updateDocument(MODELS.USERS, req.user.userId, {
      security: updatedSecurity
    });

    return res.json({ user: buildUserResponse(updatedUser.id, updatedUser) });
  } catch (error) {
    logger.error({ error }, 'Update security settings error');
    return res.status(500).json({ error: 'Failed to update security settings' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password (requires authentication)
 */
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const userDoc = await User.findById(req.user.userId);

    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await userDoc.verifyPassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const passwordHash = await User.hashPassword(newPassword);
    await updateDocument(MODELS.USERS, req.user.userId, { passwordHash });

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * GET /api/auth/export-data
 * Export all user data
 */
router.get('/export-data', requireAuth, async (req, res) => {
  try {
    const user = await getDocumentById(MODELS.USERS, req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all user-related data
    const cases = await queryDocuments(MODELS.CASES, [
      { field: 'userId', operator: '==', value: req.user.userId }
    ]);

    const clients = await queryDocuments(MODELS.CLIENTS, [
      { field: 'userId', operator: '==', value: req.user.userId }
    ]);

    const documents = await queryDocuments(MODELS.DOCUMENTS, [
      { field: 'userId', operator: '==', value: req.user.userId }
    ]);

    const hearings = await queryDocuments(MODELS.HEARINGS, [
      { field: 'userId', operator: '==', value: req.user.userId }
    ]);

    const invoices = await queryDocuments(MODELS.INVOICES, [
      { field: 'userId', operator: '==', value: req.user.userId }
    ]);

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: buildUserResponse(user.id, user),
      data: {
        cases,
        clients,
        documents,
        hearings,
        invoices
      },
      statistics: {
        totalCases: cases.length,
        totalClients: clients.length,
        totalDocuments: documents.length,
        totalHearings: hearings.length,
        totalInvoices: invoices.length
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="juriq-data-export-${Date.now()}.json"`);

    return res.json(exportData);
  } catch (error) {
    logger.error({ error }, 'Export data error');
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * DELETE /api/auth/delete-account
 * Delete user account and all associated data
 */
router.delete('/delete-account', requireAuth, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    // Require password confirmation
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // Require explicit confirmation
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Please type DELETE to confirm account deletion' });
    }

    // Get user with password
    const userDoc = await User.findById(req.user.userId);

    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await userDoc.verifyPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Hard delete: Remove user and all associated data from the system permanently
    // This replaces the previous soft-delete logic to prevent data reappearing on re-signup
    const deletionResult = await userDeletionService.deleteUserAccount(req.user.userId);

    // Post-deletion validation: Ensure user is truly gone
    const checkUser = await User.findById(req.user.userId);
    if (checkUser) {
      throw new Error('Critical: User record persists after deletion attempt');
    }

    logger.info('✅ User account and all associated data permanently deleted: %s (%s)', req.user.userId, deletionResult.email);

    // Clear auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'Delete account error');
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * POST /api/auth/complete-onboarding
 * Complete user onboarding with immutable profile fields
 */
router.post('/complete-onboarding', requireAuth, async (req, res) => {
  try {
    const {
      fullName,
      fullNameConfirm,
      barCouncilNumber,
      barCouncilNumberConfirm,
      currency,
      currencyConfirm,
      lawFirmName,
      practiceAreas,
      courtLevels,
      phoneNumber,
      recoveryEmail,
      address,
      city,
      state,
      country,
      timezone
    } = req.body;

    // Get current user
    const user = await getDocumentById(MODELS.USERS, req.user.userId);

    // Check if already completed
    if (user.onboardingCompleted) {
      return res.status(400).json({
        errorCode: 'ONBOARDING_ALREADY_COMPLETED',
        error: 'Onboarding already completed'
      });
    }

    // Validate immutable fields - Full Name
    if (!fullName?.trim() || !fullNameConfirm?.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (fullName !== fullNameConfirm) {
      return res.status(400).json({ error: 'Full names do not match' });
    }

    // Validate immutable fields - Bar Council Number
    if (!barCouncilNumber?.trim() || !barCouncilNumberConfirm?.trim()) {
      return res.status(400).json({ error: 'Bar Council Number is required' });
    }
    if (barCouncilNumber !== barCouncilNumberConfirm) {
      return res.status(400).json({ error: 'Bar Council Numbers do not match' });
    }

    // CRITICAL: Check Bar Council Number uniqueness across ACTIVE users only
    const existingBar = await User.findOne({
      'profile.barCouncilNumber': barCouncilNumber.trim(),
      status: 'active'
    });

    if (existingBar && existingBar._id.toString() !== req.user.userId) {
      return res.status(409).json({
        errorCode: 'BAR_COUNCIL_EXISTS',
        message: 'This Bar Council Number is already registered.',
        error: 'This Bar Council Number is already registered.'
      });
    }

    // Process and validate optional recoveryEmail
    let normalizedRecoveryEmail = null;
    if (recoveryEmail?.trim()) {
      normalizedRecoveryEmail = recoveryEmail.toLowerCase().trim();

      // Must not match user's own primary email
      if (normalizedRecoveryEmail === user.email.toLowerCase()) {
        return res.status(400).json({ error: 'Recovery email cannot be the same as your primary email' });
      }

      // Must be unique across active users (either in email or recoveryEmail fields)
      const existingEmailConflict = await User.findOne({
        $or: [
          { email: normalizedRecoveryEmail },
          { recoveryEmail: normalizedRecoveryEmail }
        ],
        $and: [
          { status: { $ne: 'deleted' } },
          { deleted: { $ne: true } }
        ]
      });

      if (existingEmailConflict && existingEmailConflict._id.toString() !== req.user.userId) {
        return res.status(409).json({
          errorCode: 'EMAIL_EXISTS',
          error: 'This email is already in use by another account.'
        });
      }
    }

    // Validate immutable fields - Currency
    if (!currency || !currencyConfirm) {
      return res.status(400).json({ error: 'Currency is required' });
    }
    if (currency !== currencyConfirm) {
      return res.status(400).json({ error: 'Currency selections do not match' });
    }

    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency selection' });
    }

    // Build audit trail entries for all fields
    const auditEntries = [];
    const now = new Date();

    // Audit immutable fields
    auditEntries.push(
      { fieldName: 'fullName', value: fullName.trim(), enteredAt: now },
      { fieldName: 'barCouncilNumber', value: barCouncilNumber.trim(), enteredAt: now },
      { fieldName: 'currency', value: currency, enteredAt: now }
    );

    // Audit optional fields (only if provided)
    if (phoneNumber?.trim()) {
      auditEntries.push({ fieldName: 'phoneNumber', value: phoneNumber.trim(), enteredAt: now });
    }
    if (normalizedRecoveryEmail) {
      auditEntries.push({ fieldName: 'recoveryEmail', value: normalizedRecoveryEmail, enteredAt: now });
    }
    if (lawFirmName?.trim()) {
      auditEntries.push({ fieldName: 'lawFirmName', value: lawFirmName.trim(), enteredAt: now });
    }
    if (practiceAreas && practiceAreas.length > 0) {
      auditEntries.push({ fieldName: 'practiceAreas', value: practiceAreas.join(', '), enteredAt: now });
    }
    if (courtLevels && courtLevels.length > 0) {
      auditEntries.push({ fieldName: 'courtLevels', value: courtLevels.join(', '), enteredAt: now });
    }
    if (address?.trim()) {
      auditEntries.push({ fieldName: 'address', value: address.trim(), enteredAt: now });
    }
    if (city?.trim()) {
      auditEntries.push({ fieldName: 'city', value: city.trim(), enteredAt: now });
    }
    if (state?.trim()) {
      auditEntries.push({ fieldName: 'state', value: state.trim(), enteredAt: now });
    }
    if (country?.trim()) {
      auditEntries.push({ fieldName: 'country', value: country.trim(), enteredAt: now });
    }
    if (timezone) {
      auditEntries.push({ fieldName: 'timezone', value: timezone, enteredAt: now });
    }

    const updateQuery = {
      $set: {
        onboardingCompleted: true,
        immutableFieldsLocked: true,
        'profile.fullName': fullName.trim(),
        'profile.barCouncilNumber': barCouncilNumber.trim(),
        'profile.currency': currency,
        'profile.phoneNumber': phoneNumber?.trim() || null,
        'profile.lawFirmName': lawFirmName?.trim() || null,
        'profile.practiceAreas': practiceAreas || [],
        'profile.courtLevels': courtLevels || [],
        'profile.address': address?.trim() || null,
        'profile.city': city?.trim() || null,
        'profile.state': state?.trim() || null,
        'profile.country': country?.trim() || null,
        'profile.timezone': timezone || 'Asia/Kolkata',
        'preferences.timezone': timezone || 'Asia/Kolkata',
        'preferences.currency': currency,
      },
      $push: {
        onboardingDataAudit: { $each: auditEntries }
      }
    };

    if (normalizedRecoveryEmail) {
      updateQuery.$set.recoveryEmail = normalizedRecoveryEmail;
    } else {
      updateQuery.$unset = { recoveryEmail: 1 };
    }

    // Perform atomic update using Mongoose directly for better control
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('✅ User %s completed onboarding with currency: %s', updatedUser.email, currency);
    logger.info('📝 Audit trail: %d fields recorded', auditEntries.length);

    return res.json({
      user: buildUserResponse(updatedUser.id, updatedUser),
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Complete onboarding error');

    // Handle duplicate key errors specifically
    if (error.code === 11000 && error.keyPattern?.['profile.barCouncilNumber']) {
      return res.status(409).json({
        errorCode: 'BAR_COUNCIL_EXISTS',
        message: 'This Bar Council Number is already registered.',
        error: 'This Bar Council Number is already registered.'
      });
    }

    return res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;

