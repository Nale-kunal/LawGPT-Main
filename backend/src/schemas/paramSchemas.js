/**
 * paramSchemas.js
 *
 * Centralized Zod schemas for request params, query strings, and shared field types.
 *
 * Used with the validate() middleware:
 *   import { idParamSchema, paginationSchema } from '../schemas/paramSchemas.js';
 *   router.get('/:id', validate({ params: idParamSchema }), handler);
 *
 * Security guarantees:
 *  - ObjectId params: must be exactly 24 hex chars (no objects, no arrays, no operators)
 *  - Mongo operators ($ne, $gt, etc.) are blocked at parse time
 *  - Prototype pollution keys (__proto__, constructor, prototype) are blocked
 *  - All strings are bounded in length
 *  - Enum fields are validated against explicit allowlists
 */

import { z } from 'zod';

// ── Primitive building blocks ─────────────────────────────────────────────────

/**
 * Validates a MongoDB ObjectId (24 hex chars).
 * Rejects arrays, objects, Mongo operators, and non-string types.
 */
export const objectIdSchema = z
    .string({
        required_error: 'ID is required',
        invalid_type_error: 'ID must be a string, not an object or array',
    })
    .regex(
        /^[0-9a-fA-F]{24}$/,
        'ID must be a valid 24-character hexadecimal MongoDB ObjectId'
    )
    .refine(
        (val) => !val.startsWith('$'),
        { message: 'ID must not start with a MongoDB operator' }
    );

/**
 * Safe string field: bounded length, no Mongo operators, no prototype pollution keys.
 * Suitable for user-supplied string fields used in queries.
 */
export const safeStringSchema = (maxLength = 200) =>
    z
        .string({
            invalid_type_error: 'Field must be a string',
        })
        .max(maxLength, `Field must be at most ${maxLength} characters`)
        .refine(
            (val) => !val.startsWith('$'),
            { message: 'Field value must not start with a MongoDB operator ($)' }
        )
        .refine(
            (val) => !['__proto__', 'constructor', 'prototype'].includes(val),
            { message: 'Field value contains a reserved prototype key' }
        );

/**
 * Pagination query schema.
 * Coerces page/limit from strings (query params are always strings) to numbers.
 * Clamps values to safe ranges.
 */
export const paginationSchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => Math.max(1, parseInt(val || '1', 10)))
        .refine((val) => !isNaN(val) && val >= 1, { message: 'page must be a positive integer' }),
    limit: z
        .string()
        .optional()
        .transform((val) => Math.min(200, Math.max(1, parseInt(val || '50', 10))))
        .refine((val) => !isNaN(val) && val >= 1, { message: 'limit must be a positive integer' }),
});

// ── Route-specific param schemas ──────────────────────────────────────────────

/** Single resource ID param: { id } */
export const idParamSchema = z.object({
    id: objectIdSchema,
});

/** Case-scoped param: { caseId } */
export const caseParamSchema = z.object({
    caseId: objectIdSchema,
});

/** Case note param: { caseId, noteId } */
export const caseNoteParamSchema = z.object({
    caseId: objectIdSchema,
    noteId: objectIdSchema,
});

/** Case note attachment param: { caseId, noteId, attachmentId } */
export const caseNoteAttachmentParamSchema = z.object({
    caseId: objectIdSchema,
    noteId: objectIdSchema,
    attachmentId: objectIdSchema,
});

/** Subscription ID param: { subscriptionId } */
export const subscriptionIdParamSchema = z.object({
    subscriptionId: objectIdSchema,
});

// ── Query schemas ─────────────────────────────────────────────────────────────

/** Admin payment logs query */
export const adminPaymentLogsQuerySchema = paginationSchema.extend({
    eventType: z.string().max(50).optional(),
    userId: objectIdSchema.optional(),
    status: z.enum([
        'created', 'authenticated', 'active', 'pending', 'halted',
        'cancelled', 'completed', 'expired', 'captured', 'failed',
    ]).optional(),
    rzpSubId: z.string().max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

/** Admin subscriptions query */
export const adminSubscriptionsQuerySchema = paginationSchema.extend({
    status: z.enum([
        'active', 'cancelled', 'expired', 'pending', 'halted', 'free',
    ]).optional(),
    userId: objectIdSchema.optional(),
    planType: z.enum([
        'free', 'basic', 'pro', 'premium', 'elite',
        'basic_yearly', 'pro_yearly', 'premium_yearly', 'elite_yearly',
    ]).optional(),
});

/** Admin refunds query */
export const adminRefundsQuerySchema = paginationSchema.extend({
    userId: objectIdSchema.optional(),
    decision: z.enum(['approved', 'rejected', 'db_failed_after_refund']).optional(),
});

/** Admin settlements query */
export const adminSettlementsQuerySchema = paginationSchema.extend({
    status: z.string().max(50).optional(),
});

/** Admin metrics query */
export const adminMetricsQuerySchema = z.object({
    range: z.enum(['24h', '7d', '30d']).optional(),
});

/** Admin users query */
export const adminUsersQuerySchema = paginationSchema.extend({
    search: z.string().max(100).optional(),
    plan: z.enum(['free', 'basic', 'pro', 'premium', 'elite']).optional(),
    status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

/** Case notes query */
export const caseNotesQuerySchema = z.object({
    hearingId: objectIdSchema.optional(),
    noteType: z.enum([
        'general', 'evidence', 'witness', 'legal', 'procedural', 'all',
    ]).optional(),
    includeDeleted: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
});

/** Document folder query */
export const documentFolderQuerySchema = z.object({
    caseId: objectIdSchema.optional(),
    parentId: objectIdSchema.optional(),
});

/**
 * GET /documents/files query schema.
 * Validates folderId as an ObjectId (or the literal string 'null') and
 * restricts the `all` flag to the expected boolean strings.
 * Prevents NoSQL injection via folderId (defense-in-depth on top of mongoSanitize).
 */
export const documentFilesQuerySchema = z.object({
    folderId: z
        .string()
        .optional()
        .transform(val => {
            // Treat these sentinel strings as "no folder filter" → null
            if (!val || val === 'null' || val === 'undefined' || val === '') { return undefined; }
            return val;
        })
        .pipe(objectIdSchema.optional()),
    all: z.enum(['true', 'false']).optional(),
});

/**
 * PUT /documents/folders/:id body schema.
 * Re-uses createFolderBodySchema shape but makes name optional for partial updates.
 */
export const updateFolderBodySchema = z.object({
    name: z.string().min(1, 'Folder name is required').max(150, 'Folder name is too long').optional(),
    caseId: objectIdSchema.optional().nullable(),
});

/** Admin internal user lookup query */
export const adminInternalUserQuerySchema = z.object({
    userId: objectIdSchema,
});

// ── Body schemas ──────────────────────────────────────────────────────────────

/** Folder creation body */
export const createFolderBodySchema = z.object({
    name: z.string().min(1, 'Folder name is required').max(150, 'Folder name is too long'),
    parentId: objectIdSchema.optional().nullable(),
    caseId: objectIdSchema.optional().nullable(),
});

/** Document rename body */
export const renameDocumentBodySchema = z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
});

/** Admin internal suspend user body */
export const suspendUserBodySchema = z.object({
    userId: objectIdSchema,
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason is too long'),
    suspend: z.boolean(),
});

/** Admin internal upgrade plan body */
export const upgradePlanBodySchema = z.object({
    userId: objectIdSchema,
    planType: z.enum(['free', 'basic', 'pro', 'premium', 'elite']),
    limits: z.object({
        cases: z.number().int().min(0).max(100000),
        documents: z.number().int().min(0).max(1000000),
        storageMB: z.number().int().min(0).max(1000000),
        teamMembers: z.number().int().min(1).max(10000),
        aiDailyCap: z.number().int().min(0).max(100000),
    }).optional(),
});

/** Admin internal revoke sessions body */
export const revokeSessionsBodySchema = z.object({
    userId: objectIdSchema,
    reason: z.string().max(500).optional(),
});

/** Admin refund body */
export const adminRefundBodySchema = z.object({
    reason: z.string().min(15, 'Reason must be at least 15 characters').max(500, 'Reason is too long'),
    amount: z.number().int().min(1).optional(),
});

export default {
    objectIdSchema,
    safeStringSchema,
    paginationSchema,
    idParamSchema,
    caseParamSchema,
    caseNoteParamSchema,
    caseNoteAttachmentParamSchema,
    subscriptionIdParamSchema,
    adminPaymentLogsQuerySchema,
    adminSubscriptionsQuerySchema,
    adminRefundsQuerySchema,
    adminSettlementsQuerySchema,
    adminMetricsQuerySchema,
    adminUsersQuerySchema,
    caseNotesQuerySchema,
    documentFolderQuerySchema,
    documentFilesQuerySchema,
    updateFolderBodySchema,
    adminInternalUserQuerySchema,
    createFolderBodySchema,
    renameDocumentBodySchema,
    suspendUserBodySchema,
    upgradePlanBodySchema,
    revokeSessionsBodySchema,
    adminRefundBodySchema,
};

