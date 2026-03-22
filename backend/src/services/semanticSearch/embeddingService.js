/**
 * Embedding Service — TF-IDF based text embeddings.
 *
 * Generates dense-ish TF-IDF vectors for legal text.
 * No external API required — runs entirely in Node.js.
 * Vocabulary is built from all stored legal documents and cached in memory.
 */

import LegalActs from '../../models/LegalActs.js';
import CaseLaws from '../../models/CaseLaws.js';
import logger from '../../utils/logger.js';

// ─── In-memory vocabulary cache ───────────────────────────────────────────────
let vocabulary = null;      // Map<term, index>
let idfWeights = null;      // Float64Array — IDF for each vocab term
let vocabSize = 0;
let vocabBuiltAt = 0;
const VOCAB_TTL_MS = 24 * 60 * 60 * 1000; // rebuild every 24 hours

// ─── Text helpers ─────────────────────────────────────────────────────────────

const LEGAL_STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'shall', 'may', 'any',
    'every', 'such', 'other', 'same', 'who', 'which', 'that', 'this', 'it', 'he',
    'she', 'they', 'its', 'their', 'also', 'not', 'no', 'act', 'section', 'law',
    'laws', 'india', 'indian', 'court', 'person', 'persons', 'sub', 'clause',
    'said', 'provided', 'under', 'accordance', 'regard', 'respect', 'manner',
    'time', 'period', 'date', 'one', 'two', 'three', 'four', 'five', 'six', 'ten',
    'years', 'year', 'month', 'day', 'rule', 'apply', 'applies', 'government',
    'state', 'central',
]);

function tokenise(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !LEGAL_STOPWORDS.has(t));
}

function termFrequency(tokens) {
    const tf = new Map();
    for (const t of tokens) {tf.set(t, (tf.get(t) || 0) + 1);}
    const total = tokens.length || 1;
    for (const [t, c] of tf) {tf.set(t, c / total);}
    return tf;
}

// ─── Vocabulary Builder ───────────────────────────────────────────────────────

/**
 * Build IDF weights from all documents in the DB.
 * Called lazily on first embed request and refreshed every 24h.
 */
export async function buildVocabulary() {
    logger.info('[embeddingService] Building vocabulary…');

    const docTexts = [];

    // Stream LegalActs
    const acts = await LegalActs.find({}, { title: 1, description: 1, keywords: 1 }).lean();
    for (const a of acts) {
        docTexts.push(`${a.title} ${a.description} ${(a.keywords || []).join(' ')}`);
    }

    // Stream CaseLaws
    const cases = await CaseLaws.find({}, { caseTitle: 1, summary: 1, keywords: 1 }).lean();
    for (const c of cases) {
        docTexts.push(`${c.caseTitle} ${c.summary} ${(c.keywords || []).join(' ')}`);
    }

    const N = docTexts.length || 1;
    const dfMap = new Map(); // term → document frequency count

    for (const text of docTexts) {
        const unique = new Set(tokenise(text));
        for (const t of unique) {dfMap.set(t, (dfMap.get(t) || 0) + 1);}
    }

    // Build vocab (top MAX_VOCAB terms by df)
    const MAX_VOCAB = 5000;
    const sorted = [...dfMap.entries()]
        .filter(([, df]) => df >= 2) // min 2 docs
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_VOCAB);

    vocabulary = new Map();
    idfWeights = new Float64Array(sorted.length);
    for (let i = 0; i < sorted.length; i++) {
        const [term, df] = sorted[i];
        vocabulary.set(term, i);
        idfWeights[i] = Math.log((N + 1) / (df + 1)) + 1; // smoothed IDF
    }
    vocabSize = sorted.length;
    vocabBuiltAt = Date.now();

    logger.info({ vocabSize, docCount: N }, '[embeddingService] Vocabulary built');
}

async function ensureVocab() {
    if (!vocabulary || Date.now() - vocabBuiltAt > VOCAB_TTL_MS) {
        await buildVocabulary();
    }
}

// ─── Embedding Generation ─────────────────────────────────────────────────────

/**
 * Generate a normalised TF-IDF embedding vector for `text`.
 * Returns a plain Array<number> for MongoDB storage.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
    await ensureVocab();

    if (!vocabSize) {return [];}

    const tokens = tokenise(text);
    if (!tokens.length) {return Array(vocabSize).fill(0);}

    const tf = termFrequency(tokens);
    const vec = new Float64Array(vocabSize);

    for (const [term, freq] of tf) {
        const idx = vocabulary.get(term);
        if (idx !== undefined) {
            vec[idx] = freq * idfWeights[idx];
        }
    }

    // L2 normalise
    let norm = 0;
    for (let i = 0; i < vocabSize; i++) {norm += vec[i] * vec[i];}
    norm = Math.sqrt(norm);
    if (norm > 0) {for (let i = 0; i < vocabSize; i++) {vec[i] /= norm;}}

    return Array.from(vec);
}

// ─── Cosine Similarity ────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two embedding arrays.
 * Both must already be L2-normalised (as produced by generateEmbedding).
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} 0–1
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {return 0;}
    let dot = 0;
    for (let i = 0; i < a.length; i++) {dot += a[i] * b[i];}
    return Math.max(0, Math.min(1, dot)); // already normalised → dot = cosine
}
