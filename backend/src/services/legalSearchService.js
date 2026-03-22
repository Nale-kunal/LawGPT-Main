/**
 * Legal Research search service — Hybrid keyword + semantic search.
 *
 * Runs parallel full-text (keyword) searches across LegalActs, CaseLaws, and LegalSection,
 * then merges with semantic search results using a combined relevance score.
 *
 * Hybrid score = (keywordScore * 0.5) + (semanticScore * 0.5)
 */

import LegalActs from '../models/LegalActs.js';
import CaseLaws from '../models/CaseLaws.js';
import LegalSection from '../models/LegalSection.js';
import { semanticSearch } from './semanticSearch/semanticSearchService.js';
import logger from '../utils/logger.js';

const MAX_PER_COLLECTION = 20;

// ─── Keyword search helpers ───────────────────────────────────────────────────

function buildRegexFilter(q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = { $regex: escaped, $options: 'i' };
    return { $or: [{ title: re }, { actName: re }, { section: re }, { description: re }, { keywords: re }] };
}

async function searchActs(q) {
    try {
        const docs = await LegalActs.find(
            { $text: { $search: q } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(MAX_PER_COLLECTION)
            .lean();

        return docs.map(d => ({
            type: 'act',
            id: d._id.toString(),
            title: d.title,
            subtitle: d.section ? `${d.actName} — Section ${d.section}` : d.actName,
            description: d.description,
            keywords: d.keywords || [],
            source: d.source || 'IndiaCode',
            sourceLink: d.sourceLink || '',
            lastUpdated: d.lastUpdated,
            keywordScore: d.score || 0,
            score: d.score || 0,
        }));
    } catch {
        try {
            const docs = await LegalActs.find(buildRegexFilter(q)).limit(MAX_PER_COLLECTION).lean();
            return docs.map(d => ({
                type: 'act',
                id: d._id.toString(),
                title: d.title,
                subtitle: d.section ? `${d.actName} — Section ${d.section}` : d.actName,
                description: d.description,
                keywords: d.keywords || [],
                source: d.source || 'IndiaCode',
                sourceLink: d.sourceLink || '',
                lastUpdated: d.lastUpdated,
                keywordScore: 0,
                score: 0,
            }));
        } catch {
            return [];
        }
    }
}

async function searchCases(q) {
    const reEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = { $regex: reEsc, $options: 'i' };
    try {
        const docs = await CaseLaws.find(
            { $text: { $search: q } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(MAX_PER_COLLECTION)
            .lean();

        return docs.map(d => ({
            type: 'case',
            id: d._id.toString(),
            title: d.caseTitle,
            subtitle: d.court,
            description: d.summary,
            keywords: d.keywords || [],
            source: d.source || 'eCourts',
            sourceLink: d.sourceLink || '',
            date: d.date,
            judges: d.judges || [],
            lastUpdated: d.lastUpdated,
            keywordScore: d.score || 0,
            score: d.score || 0,
        }));
    } catch {
        try {
            const docs = await CaseLaws.find({
                $or: [{ caseTitle: re }, { summary: re }, { court: re }, { keywords: re }],
            }).limit(MAX_PER_COLLECTION).lean();
            return docs.map(d => ({
                type: 'case',
                id: d._id.toString(),
                title: d.caseTitle,
                subtitle: d.court,
                description: d.summary,
                keywords: d.keywords || [],
                source: d.source || 'eCourts',
                sourceLink: d.sourceLink || '',
                date: d.date,
                judges: d.judges || [],
                lastUpdated: d.lastUpdated,
                keywordScore: 0,
                score: 0,
            }));
        } catch {
            return [];
        }
    }
}

async function searchSections(q) {
    const reEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = { $regex: reEsc, $options: 'i' };
    try {
        const docs = await LegalSection.find({
            $or: [
                { sectionNumber: re },
                { title: re },
                { description: re },
                { actName: re },
                { keywords: { $elemMatch: re } },
            ],
        }).limit(MAX_PER_COLLECTION).lean();

        return docs.map(d => ({
            type: 'section',
            id: d._id.toString(),
            title: `Section ${d.sectionNumber}: ${d.title}`,
            subtitle: d.actName,
            description: d.description,
            keywords: d.keywords || [],
            punishment: d.punishment,
            source: 'IndiaCode',
            sourceLink: '',
            keywordScore: 0,
            score: 0,
        }));
    } catch {
        return [];
    }
}

// ─── Hybrid merge ─────────────────────────────────────────────────────────────

/**
 * Normalise a raw keyword text score to 0-1 range (MongoDB text scores can be >10).
 */
function normKeywordScore(score) {
    if (!score) {return 0;}
    return Math.min(1, score / 10); // cap at 1
}

/**
 * Merge keyword results and semantic results into a hybrid-ranked list.
 * score = (keywordScore * 0.5) + (semanticScore * 0.5)
 *
 * @param {object[]} kwResults — from keyword search
 * @param {object[]} semResults — from semantic search
 * @returns {object[]} merged, deduped, sorted by hybrid score
 */
function mergeResults(kwResults, semResults) {
    const byId = new Map();

    // Index keyword results
    for (const r of kwResults) {
        byId.set(r.id, {
            ...r,
            keywordScore: normKeywordScore(r.keywordScore),
            semanticScore: 0,
        });
    }

    // Merge semantic results
    for (const r of semResults) {
        if (byId.has(r.id)) {
            const existing = byId.get(r.id);
            existing.semanticScore = r.semanticScore || 0;
        } else {
            byId.set(r.id, {
                ...r,
                keywordScore: 0,
                semanticScore: r.semanticScore || 0,
            });
        }
    }

    // Compute hybrid score and sort
    return [...byId.values()]
        .map(r => ({
            ...r,
            score: (r.keywordScore * 0.5) + (r.semanticScore * 0.5),
        }))
        .sort((a, b) => b.score - a.score);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main search function — hybrid keyword + semantic.
 * Returns { acts, cases, sections } arrays capped at MAX_PER_COLLECTION each.
 *
 * @param {string} q — search query
 * @returns {Promise<{ acts: object[], cases: object[], sections: object[] }>}
 */
export async function searchLegal(q) {
    if (!q || !q.trim()) {
        return { acts: [], cases: [], sections: [] };
    }

    const trimmed = q.trim();

    // Run keyword and semantic searches in parallel
    const [kwActs, kwCases, sections, semResults] = await Promise.all([
        searchActs(trimmed),
        searchCases(trimmed),
        searchSections(trimmed),
        semanticSearch(trimmed, MAX_PER_COLLECTION).catch(err => {
            logger.warn({ err }, 'Semantic search failed, falling back to keyword only');
            return { acts: [], cases: [] };
        }),
    ]);

    const acts = mergeResults(kwActs, semResults.acts).slice(0, MAX_PER_COLLECTION);
    const cases = mergeResults(kwCases, semResults.cases).slice(0, MAX_PER_COLLECTION);

    return { acts, cases, sections };
}

/**
 * Pure semantic-only search (for the /semantic-search endpoint).
 *
 * @param {string} q
 * @returns {Promise<{ acts: object[], cases: object[] }>}
 */
export { semanticSearch as searchLegalSemantic };
