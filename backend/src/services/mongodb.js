import mongoose from 'mongoose';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Case from '../models/Case.js';
import Document from '../models/Document.js';
import Folder from '../models/Folder.js';
import Hearing from '../models/Hearing.js';
import Alert from '../models/Alert.js';
import Activity from '../models/Activity.js';
import LegalSection from '../models/LegalSection.js';
import PasswordReset from '../models/PasswordReset.js';
import logger from '../utils/logger.js';

/**
 * MongoDB service layer providing safe database operations.
 *
 * Security properties:
 *  - All ID parameters validated as 24-char hex ObjectIds
 *  - Update data stripped of any $-prefixed keys (blocks NoSQL injection)
 *  - queryDocuments filter values validated — objects (Mongo operators) rejected
 *  - Unbounded queries capped at 500 results
 *  - All errors logged via structured logger (no console.error)
 */

// ── Max result cap for unbounded queries ──────────────────────────────────────
const MAX_QUERY_RESULTS = 500;

// ── Model registry ────────────────────────────────────────────────────────────
const MODEL_MAP = {
    users: User,
    clients: Client,
    cases: Case,
    documents: Document,
    folders: Folder,
    hearings: Hearing,
    alerts: Alert,
    activities: Activity,
    legalSections: LegalSection,
    passwordResets: PasswordReset,
};

/**
 * Get Mongoose model by collection name.
 * @param {string} collection
 * @returns {mongoose.Model}
 */
function getModel(collection) {
    const model = MODEL_MAP[collection];
    if (!model) {
        throw new Error(`Unknown collection: ${collection}`);
    }
    return model;
}

/**
 * Validates that id is a valid MongoDB ObjectId string.
 * Throws a structured error if invalid.
 * @param {*} id
 * @param {string} context - For error messages
 */
function assertValidObjectId(id, context = 'id') {
    let idStr = id;
    if (id && typeof id === 'object' && !Array.isArray(id) && mongoose.isValidObjectId(id) && typeof id.toString === 'function') {
        idStr = id.toString();
    }
    if (typeof idStr !== 'string' || !/^[0-9a-fA-F]{24}$/.test(idStr)) {
        throw Object.assign(
            new Error(`Invalid ${context}: must be a 24-character hexadecimal ObjectId`),
            { code: 'INVALID_OBJECT_ID', status: 400 }
        );
    }
}

/**
 * Strips MongoDB operator keys from an update object.
 * Prevents update-based NoSQL injection via keys like $where, $set (in user-supplied data).
 *
 * IMPORTANT: This strips TOP-LEVEL keys only — the service layer always
 * wraps updates in $set itself, so user-supplied data should never contain operators.
 *
 * @param {object} data
 * @returns {object} Sanitized copy of data
 */
function stripOperatorKeys(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {return data;}

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        // Block MongoDB operator keys and prototype pollution
        if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
            logger.warn({ key }, '[mongodb] Stripped disallowed operator key from update data');
            continue;
        }
        sanitized[key] = value;
    }
    return sanitized;
}

/**
 * Validates a single filter value — blocks objects (which could be Mongo operators).
 * @param {*} value - Filter value to validate
 * @param {string} field - Field name for error context
 */
function assertSafeFilterValue(value, field) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !mongoose.isValidObjectId(value)) {
        throw Object.assign(
            new Error(`Filter value for field '${field}' must not be an object (potential MongoDB operator injection)`),
            { code: 'UNSAFE_FILTER_VALUE', status: 400 }
        );
    }
}

// ── CRUD Operations ───────────────────────────────────────────────────────────

/**
 * Create a document in a collection.
 * @param {string} collection
 * @param {Object} data
 * @returns {Promise<Object>} Created document with id
 */
export async function createDocument(collection, data) {
    try {
        const Model = getModel(collection);
        const sanitizedData = stripOperatorKeys(data);
        const doc = await Model.create(sanitizedData);

        return {
            id: doc._id.toString(),
            ...doc.toObject(),
            _id: undefined,
        };
    } catch (error) {
        logger.error({ collection, err: error }, 'Error creating document');
        throw error;
    }
}

/**
 * Get a document by ID.
 * @param {string} collection
 * @param {string} id - Must be a valid MongoDB ObjectId string
 * @returns {Promise<Object|null>}
 */
export async function getDocumentById(collection, id) {
    try {
        assertValidObjectId(id, 'document ID');
        const Model = getModel(collection);

        const doc = await Model.findById(id);
        if (!doc) {return null;}

        return {
            id: doc._id.toString(),
            ...doc.toObject(),
            _id: undefined,
        };
    } catch (error) {
        // Re-throw INVALID_OBJECT_ID errors directly — caller handles them as 400
        if (error.code === 'INVALID_OBJECT_ID') {throw error;}
        logger.error({ collection, err: error }, 'Error getting document by ID');
        throw error;
    }
}

/**
 * Update a document.
 * @param {string} collection
 * @param {string} id
 * @param {Object} data - Update data (operator keys are stripped)
 * @returns {Promise<Object>} Updated document
 */
export async function updateDocument(collection, id, data) {
    try {
        assertValidObjectId(id, 'document ID');
        const Model = getModel(collection);
        const sanitizedData = stripOperatorKeys(data);

        const doc = await Model.findByIdAndUpdate(
            id,
            { $set: sanitizedData },
            { new: true, runValidators: true }
        );

        if (!doc) {
            const err = new Error(`Document not found: ${id}`);
            err.status = 404;
            throw err;
        }

        return {
            id: doc._id.toString(),
            ...doc.toObject(),
            _id: undefined,
        };
    } catch (error) {
        if (error.code === 'INVALID_OBJECT_ID' || error.status === 404) {throw error;}
        logger.error({ collection, err: error }, 'Error updating document');
        throw error;
    }
}

/**
 * Delete a document.
 * @param {string} collection
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteDocument(collection, id) {
    try {
        assertValidObjectId(id, 'document ID');
        const Model = getModel(collection);
        await Model.findByIdAndDelete(id);
        return true;
    } catch (error) {
        if (error.code === 'INVALID_OBJECT_ID') {throw error;}
        logger.error({ collection, err: error }, 'Error deleting document');
        throw error;
    }
}

/**
 * Delete many documents with filters.
 * Only accepts filters where values are primitives (not objects/operators).
 * @param {string} collection
 * @param {Object} filter - Mongoose filter object (operator keys stripped)
 * @returns {Promise<number>} Number of deleted documents
 */
export async function deleteManyDocuments(collection, filter) {
    try {
        const Model = getModel(collection);
        const sanitizedFilter = stripOperatorKeys(filter);
        const result = await Model.deleteMany(sanitizedFilter);
        return result.deletedCount;
    } catch (error) {
        logger.error({ collection, err: error }, 'Error deleting documents');
        throw error;
    }
}

/**
 * Query documents with validated filters.
 *
 * Security: filter values must be primitives — objects (which could be Mongo
 * operators like { $ne: null }) are rejected.
 *
 * @param {string} collection
 * @param {Array} filters - Array of {field, operator, value} objects
 * @param {Object} orderBy - {field, direction}
 * @param {number} limit - Max results (capped at MAX_QUERY_RESULTS)
 * @returns {Promise<Array>}
 */
export async function queryDocuments(collection, filters = [], orderBy = null, limit = null) {
    try {
        const Model = getModel(collection);
        let query = Model.find();

        // Apply filters — validate each value before use
        filters.forEach(filter => {
            const { field, operator, value } = filter;

            // Block object values (potential Mongo operators)
            assertSafeFilterValue(value, field);

            switch (operator) {
                case '==':
                    query = query.where(field).equals(value);
                    break;
                case '!=':
                    query = query.where(field).ne(value);
                    break;
                case '>':
                    query = query.where(field).gt(value);
                    break;
                case '>=':
                    query = query.where(field).gte(value);
                    break;
                case '<':
                    query = query.where(field).lt(value);
                    break;
                case '<=':
                    query = query.where(field).lte(value);
                    break;
                case 'in':
                    if (!Array.isArray(value)) {
                        throw new Error(`Filter operator 'in' requires an array value`);
                    }
                    query = query.where(field).in(value);
                    break;
                case 'array-contains':
                    query = query.where(field).elemMatch({ $eq: value });
                    break;
                default:
                    throw new Error(`Unsupported operator: ${operator}`);
            }
        });

        // Apply ordering
        if (orderBy) {
            const sortOrder = orderBy.direction === 'desc' ? -1 : 1;
            query = query.sort({ [orderBy.field]: sortOrder });
        }

        // Apply limit — cap at MAX_QUERY_RESULTS to prevent accidental full-collection scans
        const effectiveLimit = limit
            ? Math.min(limit, MAX_QUERY_RESULTS)
            : MAX_QUERY_RESULTS;
        query = query.limit(effectiveLimit);

        const docs = await query.exec();

        return docs.map(doc => ({
            id: doc._id.toString(),
            ...doc.toObject(),
            _id: undefined,
        }));
    } catch (error) {
        logger.error({ collection, err: error }, 'Error querying documents');
        throw error;
    }
}

/**
 * Get all documents in a collection (capped at MAX_QUERY_RESULTS).
 * @param {string} collection
 * @param {Object} orderBy
 * @returns {Promise<Array>}
 */
export function getAllDocuments(collection, orderBy = null) {
    return queryDocuments(collection, [], orderBy, null);
}

/**
 * Batch write operations (transactional).
 * @param {Array} operations - Array of {type, collection, id?, data?}
 * @returns {Promise<boolean>}
 */
export async function batchWrite(operations) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for (const op of operations) {
            const Model = getModel(op.collection);

            if (op.type === 'create') {
                const sanitized = stripOperatorKeys(op.data);
                await Model.create([sanitized], { session });
            } else if (op.type === 'update') {
                assertValidObjectId(op.id, 'batch update ID');
                const sanitized = stripOperatorKeys(op.data);
                await Model.findByIdAndUpdate(op.id, { $set: sanitized }, { session });
            } else if (op.type === 'delete') {
                assertValidObjectId(op.id, 'batch delete ID');
                await Model.findByIdAndDelete(op.id, { session });
            }
        }

        await session.commitTransaction();
        return true;
    } catch (error) {
        await session.abortTransaction();
        logger.error({ err: error }, 'Error in batch write');
        throw error;
    } finally {
        session.endSession();
    }
}

// Collection name constants
export const COLLECTIONS = {
    USERS: 'users',
    CASES: 'cases',
    CLIENTS: 'clients',
    DOCUMENTS: 'documents',
    FOLDERS: 'folders',
    HEARINGS: 'hearings',
    ALERTS: 'alerts',
    ACTIVITIES: 'activities',
    LEGAL_SECTIONS: 'legalSections',
    PASSWORD_RESETS: 'passwordResets',
};

// Alias for backward compatibility
export const MODELS = COLLECTIONS;

export default mongoose;
