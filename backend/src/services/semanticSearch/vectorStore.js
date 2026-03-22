/**
 * Vector Store — manages embedding generation and similarity search.
 *
 * Stores embeddings as Number[] arrays directly on LegalActs/CaseLaws documents.
 * Batch-generates embeddings for documents that don't have one yet.
 */

import LegalActs from '../../models/LegalActs.js';
import CaseLaws from '../../models/CaseLaws.js';
import { generateEmbedding, cosineSimilarity, buildVocabulary } from './embeddingService.js';
import logger from '../../utils/logger.js';

const BATCH_SIZE = 50;
const TOP_N_DEFAULT = 10;

// ─── Batch Embedding Generation ───────────────────────────────────────────────

/**
 * Generate and store embeddings for all LegalActs that are missing one.
 */
async function embedActs() {
    const docs = await LegalActs.find(
        { $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] },
        { title: 1, description: 1, keywords: 1, actName: 1, section: 1 }
    ).lean();

    logger.info({ count: docs.length }, '[vectorStore] Acts needing embeddings');
    let done = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (doc) => {
            try {
                const text = `${doc.title} ${doc.actName} ${doc.section || ''} ${doc.description} ${(doc.keywords || []).join(' ')}`;
                const embedding = await generateEmbedding(text);
                await LegalActs.updateOne({ _id: doc._id }, { $set: { embedding } });
                done++;
            } catch (err) {
                logger.warn({ err, id: doc._id }, '[vectorStore] Failed to embed act');
            }
        }));
    }

    return done;
}

/**
 * Generate and store embeddings for all CaseLaws that are missing one.
 */
async function embedCases() {
    const docs = await CaseLaws.find(
        { $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] },
        { caseTitle: 1, summary: 1, keywords: 1, court: 1 }
    ).lean();

    logger.info({ count: docs.length }, '[vectorStore] Cases needing embeddings');
    let done = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (doc) => {
            try {
                const text = `${doc.caseTitle} ${doc.court} ${doc.summary} ${(doc.keywords || []).join(' ')}`;
                const embedding = await generateEmbedding(text);
                await CaseLaws.updateOne({ _id: doc._id }, { $set: { embedding } });
                done++;
            } catch (err) {
                logger.warn({ err, id: doc._id }, '[vectorStore] Failed to embed case');
            }
        }));
    }

    return done;
}

/**
 * Main entry point: rebuild vocabulary and generate embeddings for all docs.
 * Non-blocking — callers should not await if they don't want to wait.
 */
export async function generateAndStoreEmbeddings() {
    try {
        logger.info('[vectorStore] Starting embedding generation…');
        await buildVocabulary();
        const [actsCount, casesCount] = await Promise.all([embedActs(), embedCases()]);
        logger.info({ actsCount, casesCount }, '[vectorStore] Embedding generation complete');
    } catch (err) {
        logger.error({ err }, '[vectorStore] Embedding generation failed (non-fatal)');
    }
}

// ─── Similarity Search ────────────────────────────────────────────────────────

/**
 * Find the most similar LegalActs to a query embedding.
 *
 * @param {number[]} queryVec
 * @param {number} [topN]
 * @returns {Promise<Array<{doc, score}>>}
 */
export async function findSimilarActs(queryVec, topN = TOP_N_DEFAULT) {
    if (!queryVec || !queryVec.length) return [];

    // Fetch docs that have embeddings
    const docs = await LegalActs.find(
        { embedding: { $exists: true, $not: { $size: 0 } } },
        { title: 1, actName: 1, section: 1, description: 1, keywords: 1, source: 1, sourceLink: 1, lastUpdated: 1, embedding: 1 }
    ).lean();

    return docs
        .map(doc => ({ doc, score: cosineSimilarity(queryVec, doc.embedding) }))
        .filter(r => r.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
}

/**
 * Find the most similar CaseLaws to a query embedding.
 *
 * @param {number[]} queryVec
 * @param {number} [topN]
 * @returns {Promise<Array<{doc, score}>>}
 */
export async function findSimilarCases(queryVec, topN = TOP_N_DEFAULT) {
    if (!queryVec || !queryVec.length) return [];

    const docs = await CaseLaws.find(
        { embedding: { $exists: true, $not: { $size: 0 } } },
        { caseTitle: 1, court: 1, date: 1, judges: 1, summary: 1, keywords: 1, source: 1, sourceLink: 1, lastUpdated: 1, embedding: 1 }
    ).lean();

    return docs
        .map(doc => ({ doc, score: cosineSimilarity(queryVec, doc.embedding) }))
        .filter(r => r.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
}
