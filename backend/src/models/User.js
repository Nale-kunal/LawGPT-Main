import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const userSchema = new mongoose.Schema(
  {
    // Basic info
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    recoveryEmail: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) {
            return true;
          } // sparse index implies optional
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Invalid email format',
      },
    },
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ['lawyer', 'assistant', 'admin'], default: 'lawyer' },

    // Account status (soft-delete support)
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    // Onboarding tracking
    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Timestamp of when onboarding was completed — null until user finishes all steps.
    // Survives logout, browser change, device change, deployments, and cache clears.
    onboardingCompletedAt: {
      type: Date,
      default: null,
    },
    // Version allows future onboarding flows to prompt existing users to re-onboard
    // when a new onboarding version is introduced.
    onboardingVersion: {
      type: Number,
      default: 0, // 0 = not completed; set to 1 on first completion
    },
    immutableFieldsLocked: {
      type: Boolean,
      default: false,
    },

    // Comprehensive profile (new structure)
    profile: {
      fullName: { type: String, default: null, index: true },
      barCouncilNumber: {
        type: String,
        unique: true,
        sparse: true, // Only enforce uniqueness when value exists
        index: true,
      },
      currency: { type: String, default: null },
      phoneNumber: { type: String, default: null },
      lawFirmName: { type: String, default: null },
      practiceAreas: { type: [String], default: [] },
      courtLevels: { type: [String], default: [] },
      address: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: null },
      timezone: { type: String, default: null },
    },

    // Onboarding data audit trail
    onboardingDataAudit: [
      {
        fieldName: String,
        value: String,
        enteredAt: Date,
      },
    ],

    // Legacy fields (kept for backward compatibility, will be migrated)
    barNumber: { type: String },
    firm: { type: String },
    phone: { type: String },
    // Note: legacy 'address' field removed - use profile.address instead

    // Email verification
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationSentAt: { type: Date },
    verifiedAt: { type: Date },

    // Password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // Notification settings (embedded document)
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      hearingReminders: { type: Boolean, default: true },
      clientUpdates: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
    },

    // User preferences (embedded document)
    preferences: {
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en-IN' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      currency: { type: String, default: 'INR' },
    },

    // Security settings (embedded document)
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      sessionTimeout: { type: String, default: '30' },
      loginNotifications: { type: Boolean, default: true },
    },

    // --- Admin/SaaS Extensions ---
    plan: {
      type: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
      limits: {
        cases: { type: Number, default: 10 },
        documents: { type: Number, default: 50 },
        storageMB: { type: Number, default: 100 },
        teamMembers: { type: Number, default: 1 },
        aiDailyCap: { type: Number, default: 20 },
      },
      features: [String],
      billingCycle: { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },
      nextBillingDate: Date,
    },

    // ── Subscription system (new — does NOT touch the legacy plan object above) ──
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'premium', 'elite'],
      default: 'free',
      index: true,
    },
    planStartDate: { type: Date, default: null },
    planEndDate: { type: Date, default: null, index: true },
    isCouponActive: { type: Boolean, default: false },
    couponCodeUsed: { type: String, default: null },
    // Links to the Subscription document that is currently active.
    // Cleared to null on cancellation / expiry.
    activeSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },

    // Razorpay customer ID — bound at first subscription creation; validated in webhook (spec #7)
    razorpayCustomerId: { type: String, default: null, index: true },

    securityFlags: {
      isSuspicious: { type: Boolean, default: false },
      abuseScore: { type: Number, default: 0 },
      blocked: { type: Boolean, default: false }, // auto-set when abuseScore >= 50
      blockedAt: { type: Date, default: null },
      blockedReason: { type: String, default: null },
      lastAbuseSignalAt: Date,
      temporarySuspensionUntil: Date,
      failedLoginAttempts: { type: Number, default: 0 },
      lastFailedLoginAt: Date,
      riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    },

    accountStatus: {
      isVerified: { type: Boolean, default: false },
      isOnboarded: { type: Boolean, default: false },
      isSuspended: { type: Boolean, default: false },
      suspensionReason: String,
      lastLoginAt: Date,
      lastActiveAt: Date,
      lastKnownGeo: {
        region: String,
        city: String,
        lat: Number,
        lon: Number,
      },
    },

    region: { type: String, default: 'IN' },
    currency: { type: String, default: 'INR' },
    dataResidency: { type: String, default: 'IN-MUM-1' },

    // OAuth providers (additive — null for local users)
    googleId: { type: String, sparse: true, unique: true },
    recoveryGoogleId: { type: String, sparse: true, unique: true },
    authProvider: { type: String, enum: ['local', 'google', 'hybrid'], default: 'local' },
    authProviders: { type: [String], default: ['email'] },

    // Security question (set during onboarding, used to protect account deletion)
    securityQuestion: { type: String, default: null },
    securityAnswerHash: { type: String, default: null },

    // ── Session versioning (logout-all-devices) ───────────────────────────────
    // Incremented by admin/user to invalidate all previously issued JWTs.
    // Any JWT with iat < sessionVersionAt is rejected by auth middleware.
    sessionVersion: { type: Number, default: 0 },
    sessionVersionAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes (email already has unique index from field definition)
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ verificationToken: 1 });

// Hardening: Prevent recovery email from being the same as primary email
userSchema.pre('save', function (next) {
  // Normalize casing
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.recoveryEmail) {
    this.recoveryEmail = this.recoveryEmail.toLowerCase().trim();
  }

  if (this.recoveryEmail && this.email && this.recoveryEmail === this.email) {
    return next(new Error('Recovery email cannot be primary email'));
  }
  return next();
});

const BCRYPT_ROUNDS = 12;

userSchema.methods.verifyPassword = async function (password) {
  // Check if password hash exists
  if (!this.passwordHash) {
    logger.warn({ userId: this._id }, 'verifyPassword: user has no passwordHash');
    return false;
  }

  // Check if password is provided
  if (!password) {
    return false;
  }

  // Verify the password hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (!this.passwordHash.startsWith('$2')) {
    logger.error({ userId: this._id }, 'verifyPassword: invalid password hash format');
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, this.passwordHash);

    // Transparent bcrypt round upgrade: if the stored hash uses fewer than
    // BCRYPT_ROUNDS cost factor, re-hash on successful login.
    if (isMatch) {
      const storedRounds = bcrypt.getRounds(this.passwordHash);
      if (storedRounds < BCRYPT_ROUNDS) {
        this.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        // Fire-and-forget save — do not block the login response
        this.save().catch((err) =>
          logger.warn({ userId: this._id, err: err.message }, 'bcrypt rehash save failed')
        );
      }
    }

    return isMatch;
  } catch (error) {
    logger.error({ userId: this._id, err: error }, 'verifyPassword error');
    return false;
  }
};

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export default mongoose.model('User', userSchema);
