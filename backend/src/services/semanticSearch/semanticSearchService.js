/**
 * Semantic Search Service.
 * Converts a query to a TF-IDF embedding and finds the top matching
 * legal acts and case laws by cosine similarity.
 */

import { generateEmbedding } from './embeddingService.js';
import { findSimilarActs, findSimilarCases } from './vectorStore.js';
import logger from '../../utils/logger.js';

const TOP_N = 10;

/**
 * Run semantic search for a query string.
 *
 * @param {string} query
 * @param {number} [topN]
 * @returns {Promise<{ acts: object[], cases: object[] }>}
 */
export async function semanticSearch(query, topN = TOP_N) {
    if (!query || !query.trim()) return { acts: [], cases: [] };

    try {
        const queryVec = await generateEmbedding(query.trim());

        const [actResults, caseResults] = await Promise.all([
            findSimilarActs(queryVec, topN),
            findSimilarCases(queryVec, topN),
        ]);

        const acts = actResults.map(({ doc, score }) => ({
            type: 'act',
            id: doc._id.toString(),
            title: doc.title,
            subtitle: doc.section ? `${doc.actName} — Section ${doc.section}` : doc.actName,
            description: doc.description,
            keywords: doc.keywords || [],
            source: doc.source || 'IndiaCode',
            sourceLink: doc.sourceLink || '',
            lastUpdated: doc.lastUpdated,
            semanticScore: Math.round(score * 100) / 100,
            score,
        }));

        const cases = caseResults.map(({ doc, score }) => ({
            type: 'case',
            id: doc._id.toString(),
            title: doc.caseTitle,
            subtitle: doc.court,
            description: doc.summary,
            keywords: doc.keywords || [],
            source: doc.source || 'eCourts',
            sourceLink: doc.sourceLink || '',
            date: doc.date,
            judges: doc.judges || [],
            lastUpdated: doc.lastUpdated,
            semanticScore: Math.round(score * 100) / 100,
            score,
        }));

        return { acts, cases };
    } catch (err) {
        logger.warn({ err }, '[semanticSearch] Search failed (non-fatal)');
        return { acts: [], cases: [] };
    }
}
