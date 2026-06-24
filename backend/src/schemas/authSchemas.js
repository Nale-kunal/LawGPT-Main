import { z } from 'zod';
import { POLICY_VERSIONS } from '../config/policyVersions.js';

// Reusable base schemas
const emailSchema = z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .max(255)
    .transform(v => v.toLowerCase().trim());

const passwordSchema = z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters');

// ── Auth Schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters').max(100).trim(),
    role: z.enum(['lawyer', 'assistant']).optional().default('lawyer'),
    barNumber: z.string().max(50).trim().optional(),
    firm: z.string().max(200).trim().optional(),
    consentGiven: z.literal(true, {
        invalid_type_error: 'You must accept the Terms of Service and Privacy Policy to register',
        required_error: 'Consent is required'
    }),
    termsVersion: z.string().refine(v => v === POLICY_VERSIONS.terms, {
        message: `Must accept the current Terms of Service version (${POLICY_VERSIONS.terms})`
    }),
    privacyVersion: z.string().refine(v => v === POLICY_VERSIONS.privacy, {
        message: `Must accept the current Privacy Policy version (${POLICY_VERSIONS.privacy})`
    }),
    marketingConsent: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    token: z.string({ required_error: 'Reset token is required' }).min(1),
    newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema,
});

export const reactivateSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string().min(2).max(100).trim(),
});

// ── Cases Schemas ─────────────────────────────────────────────────────────────

export const caseCreateSchema = z.object({
    title: z.string().min(1, 'Case title is required').max(200).trim(),
    caseNumber: z.string().max(100).trim().optional(),
    clientId: z.string().optional(),
    status: z.enum(['active', 'pending', 'closed', 'archived']).optional().default('active'),
    description: z.string().max(5000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    court: z.string().max(200).optional(),
    nextHearingDate: z.string().datetime().optional().nullable(),
    tags: z.array(z.string().max(50)).max(20).optional(),
});

export const caseUpdateSchema = caseCreateSchema.partial();

// ── Client Schemas ────────────────────────────────────────────────────────────

export const clientCreateSchema = z.object({
    name: z.string().min(1, 'Client name is required').max(200).trim(),
    email: emailSchema.optional(),
    phone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    type: z.enum(['individual', 'organization']).optional().default('individual'),
    notes: z.string().max(5000).optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

// ── Pagination Query Schema (reusable) ────────────────────────────────────────

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(200).optional(),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ── Invoice Schemas ───────────────────────────────────────────────────────────

export const invoiceCreateSchema = z.object({
    clientId: z.string().optional(),
    caseId: z.string().optional(),
    amount: z.number().min(0).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    description: z.string().max(2000).optional(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional().default('draft'),
    items: z.array(z.object({
        description: z.string().max(500),
        quantity: z.number().min(0),
        rate: z.number().min(0),
        amount: z.number().min(0),
    })).optional(),
});

// ── Folder / Document Schemas ─────────────────────────────────────────────────

export const folderCreateSchema = z.object({
    name: z.string().min(1, 'Folder name is required').max(255).trim(),
    parentId: z.string().nullable().optional(),
    caseId: z.string().nullable().optional(),
});

export const folderUpdateSchema = folderCreateSchema.partial();

// ── Profile and Settings Update Schemas ─────────────────────────────────────

export const updateNotificationsSchema = z.object({
  emailAlerts: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  hearingReminders: z.boolean().optional(),
  clientUpdates: z.boolean().optional(),
  weeklyReports: z.boolean().optional()
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  currency: z.string().max(10).optional()
});

export const updateSecuritySchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  sessionTimeout: z.string().max(10).optional(),
  loginNotifications: z.boolean().optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  recoveryEmail: z.string().email().max(255).or(z.literal('').optional()).nullable(),
  profile: z.object({
    lawFirmName: z.string().max(200).nullable().optional(),
    practiceAreas: z.array(z.string().max(50)).max(20).optional(),
    courtLevels: z.array(z.string().max(50)).max(20).optional(),
    phoneNumber: z.string().max(20).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    state: z.string().max(100).nullable().optional(),
    country: z.string().max(100).nullable().optional(),
    timezone: z.string().max(50).optional()
  }).optional(),
  notifications: updateNotificationsSchema.optional(),
  preferences: updatePreferencesSchema.optional(),
  security: updateSecuritySchema.optional()
});

// ── Data Import Validation Schema ───────────────────────────────────────────

export const importDataSchema = z.object({
  user: z.object({
    name: z.string().min(2).max(100).optional(),
    profile: z.object({
      fullName: z.string().max(100).nullable().optional(),
      barCouncilNumber: z.string().max(50).nullable().optional(),
      currency: z.string().max(10).nullable().optional(),
      phoneNumber: z.string().max(20).nullable().optional(),
      lawFirmName: z.string().max(200).nullable().optional(),
      practiceAreas: z.array(z.string().max(50)).max(50).optional(),
      courtLevels: z.array(z.string().max(50)).max(50).optional(),
      address: z.string().max(500).nullable().optional(),
      city: z.string().max(100).nullable().optional(),
      state: z.string().max(100).nullable().optional(),
      country: z.string().max(100).nullable().optional(),
      timezone: z.string().max(50).nullable().optional()
    }).optional(),
    notifications: updateNotificationsSchema.optional(),
    preferences: updatePreferencesSchema.optional(),
    security: updateSecuritySchema.optional()
  }),
  data: z.object({
    cases: z.array(z.object({
      caseNumber: z.string().max(100),
      clientName: z.string().max(100),
      opposingParty: z.string().max(100).optional(),
      courtName: z.string().max(200).optional(),
      judgeName: z.string().max(100).optional(),
      hearingDate: z.string().max(100).optional().nullable(),
      hearingTime: z.string().max(20).optional(),
      status: z.enum(['active', 'pending', 'closed', 'won', 'lost']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      caseType: z.string().max(100).optional(),
      description: z.string().max(5000).optional(),
      nextHearing: z.string().max(100).optional().nullable(),
      notes: z.string().max(10000).optional(),
      customPipelineNodes: z.array(z.object({
        nodeId: z.string().max(50),
        name: z.string().max(100),
        description: z.string().max(500).optional(),
        color: z.string().max(20).optional()
      })).max(50).optional(),
      pipelineOrder: z.array(z.string().max(50)).max(50).optional()
    })).max(1000).optional().default([]),
    clients: z.array(z.object({
      name: z.string().max(100),
      email: z.string().max(255).optional(),
      phone: z.string().max(20),
      address: z.string().max(500).optional(),
      panNumber: z.string().max(20).optional(),
      aadharNumber: z.string().max(20).optional(),
      notes: z.string().max(5000).optional()
    })).max(1000).optional().default([]),
    documents: z.array(z.object({
      name: z.string().max(255),
      mimetype: z.string().max(100),
      size: z.number().int().nonnegative(),
      url: z.string().url().max(1000),
      cloudinaryPublicId: z.string().max(255).optional(),
      resourceType: z.enum(['image', 'video', 'raw', 'auto']).optional()
    })).max(1000).optional().default([]),
    hearings: z.array(z.object({
      hearingDate: z.string().max(100),
      hearingTime: z.string().max(20).optional(),
      timezone: z.string().max(50).optional(),
      startAt: z.string().max(100).optional(),
      endAt: z.string().max(100).optional(),
      duration: z.number().int().nonnegative().optional(),
      courtName: z.string().max(200),
      judgeName: z.string().max(100).optional(),
      hearingType: z.string().max(100).optional(),
      customHearingType: z.string().max(100).optional(),
      status: z.enum(['scheduled', 'completed', 'adjourned', 'cancelled']).optional(),
      purpose: z.string().max(1000).optional(),
      courtInstructions: z.string().max(5000).optional(),
      documentsToBring: z.array(z.string().max(500)).max(50).optional(),
      proceedings: z.string().max(10000).optional(),
      nextHearingDate: z.string().max(100).optional().nullable(),
      nextHearingTime: z.string().max(20).optional(),
      adjournmentReason: z.string().max(1000).optional(),
      attendance: z.object({
        clientPresent: z.boolean().optional(),
        opposingPartyPresent: z.boolean().optional(),
        witnessesPresent: z.array(z.string().max(100)).max(50).optional()
      }).optional(),
      orders: z.array(z.object({
        orderType: z.string().max(100).optional(),
        orderDetails: z.string().max(5000).optional(),
        orderDate: z.string().max(100).optional()
      })).max(50).optional(),
      notes: z.string().max(10000).optional(),
      resourceScope: z.object({
        courtroomId: z.string().max(100).optional(),
        counselId: z.string().max(100).optional(),
        clientId: z.string().max(100).optional()
      }).optional(),
      conflictOverride: z.object({
        allowed: z.boolean().optional(),
        reason: z.string().max(1000).optional(),
        overriddenBy: z.string().max(100).optional(),
        overriddenAt: z.string().max(100).optional(),
        conflictingHearings: z.array(z.string().max(100)).max(50).optional()
      }).optional()
    })).max(1000).optional().default([]),
    invoices: z.array(z.object({
      invoiceNumber: z.string().max(50),
      issueDate: z.string().max(100),
      dueDate: z.string().max(100),
      status: z.enum(['draft', 'sent', 'paid', 'overdue']).optional(),
      currency: z.string().max(10).optional(),
      items: z.array(z.object({
        description: z.string().max(500),
        quantity: z.number().nonnegative(),
        unitPrice: z.number().nonnegative(),
        amount: z.number().nonnegative()
      })).max(100).optional().default([]),
      subtotal: z.number().nonnegative(),
      taxRate: z.number().nonnegative().optional(),
      taxAmount: z.number().nonnegative().optional(),
      discountAmount: z.number().nonnegative().optional(),
      total: z.number().nonnegative(),
      notes: z.string().max(5000).optional(),
      terms: z.string().max(5000).optional(),
      paidAt: z.string().max(100).optional().nullable()
    })).max(1000).optional().default([])
  })
});
