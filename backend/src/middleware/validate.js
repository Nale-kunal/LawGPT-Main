/**
 * validate.js
 *
 * Zod-based request validation middleware factory.
 *
 * Validates and replaces req.body, req.params, and req.query with
 * the Zod-parsed (coerced, stripped) values — ensuring type safety
 * and blocking MongoDB operator injection before any route handler runs.
 *
 * Usage:
 *   import { validate } from '../middleware/validate.js';
 *   router.get('/:id', validate({ params: idParamSchema }), handler);
 *   router.post('/', validate({ body: createBodySchema, query: filterSchema }), handler);
 *
 * @param {object} schemas - { body?, params?, query? } — each a Zod schema
 */

/**
 * Mongo operator keys that are never allowed in user input.
 * If found at any level of the input object, the request is rejected.
 */
const BLOCKED_OPERATOR_PREFIXES = ['$'];
const BLOCKED_PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep-scans an object for MongoDB operator keys or prototype pollution attempts.
 * Returns the first offending key found, or null if clean.
 *
 * @param {*} value - Value to scan
 * @param {number} depth - Current recursion depth
 * @returns {string|null} Offending key or null
 */
function findInjectionKey(value, depth = 0) {
    if (depth > 20) {return null;} // depth guard
    if (value === null || value === undefined) {return null;}
    if (typeof value !== 'object') {return null;}
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findInjectionKey(item, depth + 1);
            if (found) {return found;}
        }
        return null;
    }

    for (const key of Object.keys(value)) {
        // Mongo operator check
        if (BLOCKED_OPERATOR_PREFIXES.some(prefix => key.startsWith(prefix))) {
            return key;
        }
        // Prototype pollution check
        if (BLOCKED_PROTOTYPE_KEYS.has(key)) {
            return key;
        }
        // Recurse into nested objects
        const found = findInjectionKey(value[key], depth + 1);
        if (found) {return found;}
    }

    return null;
}

/**
 * Checks all user-supplied inputs (body, params, query) for injection attempts
 * BEFORE Zod parsing runs. This is an early-exit defense layer.
 *
 * @param {object} req - Express request object
 * @returns {string|null} Offending key or null if clean
 */
function checkForInjection(req) {
    // Check body
    if (req.body && typeof req.body === 'object') {
        const key = findInjectionKey(req.body);
        if (key) {return key;}
    }
    // Check query
    if (req.query && typeof req.query === 'object') {
        const key = findInjectionKey(req.query);
        if (key) {return key;}
    }
    // Check params
    if (req.params && typeof req.params === 'object') {
        const key = findInjectionKey(req.params);
        if (key) {return key;}
    }
    return null;
}

/**
 * Main validation middleware factory.
 *
 * @param {object} schemas - { body?, params?, query? } — each a Zod schema
 * @returns {function} Express middleware
 */
export function validate({ body, params, query } = {}) {
    return (req, res, next) => {
        // ── Pre-validation: block injection attempts before Zod runs ──────────
        const injectionKey = checkForInjection(req);
        if (injectionKey) {
            return res.status(400).json({
                error: 'Invalid Input',
                message: `Request contains a blocked key or MongoDB operator: '${injectionKey}'`,
                details: [{ field: injectionKey, message: 'MongoDB operators and prototype keys are not allowed', location: 'body/params/query' }],
            });
        }

        const errors = [];

        // ── Body validation ───────────────────────────────────────────────────
        if (body) {
            const result = body.safeParse(req.body);
            if (!result.success) {
                errors.push(
                    ...(result.error.issues ?? []).map(e => ({
                        field: (e.path ?? []).join('.'),
                        message: e.message,
                        location: 'body',
                    }))
                );
            } else {
                req.body = result.data; // Replace with validated/coerced data
            }
        }

        // ── Params validation ─────────────────────────────────────────────────
        if (params) {
            const result = params.safeParse(req.params);
            if (!result.success) {
                errors.push(
                    ...(result.error.issues ?? []).map(e => ({
                        field: (e.path ?? []).join('.'),
                        message: e.message,
                        location: 'params',
                    }))
                );
            } else {
                // Replace req.params with validated data to ensure type safety downstream
                // Note: Express params object is typically read-only via property descriptors,
                // but we can override individual keys safely.
                Object.assign(req.params, result.data);
            }
        }

        // ── Query validation ──────────────────────────────────────────────────
        if (query) {
            const result = query.safeParse(req.query);
            if (!result.success) {
                errors.push(
                    ...(result.error.issues ?? []).map(e => ({
                        field: (e.path ?? []).join('.'),
                        message: e.message,
                        location: 'query',
                    }))
                );
            } else {
                req.query = result.data; // Replace with validated/coerced data
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: errors[0].message,
                details: errors,
            });
        }

        return next();
    };
}
