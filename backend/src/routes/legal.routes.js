/**
 * Legal Research API routes.
 * All endpoints are protected by JWT authentication (requireAuth).
 * Rate limiting & CSRF protection are applied globally via index.js middleware.
 *
 * Routes:
 *  GET  /api/v1/legal/search?q=            — hybrid keyword + semantic search
 *  GET  /api/v1/legal/semantic-search?q=   — semantic-only search
 *  POST /api/v1/legal/explain              — AI explanation for a result
 *  GET  /api/v1/legal/acts                 — paginated list of legal acts
 *  GET  /api/v1/legal/cases               — paginated list of case laws
 */

import express from 'express';
import { requireAuth } from '../middleware/auth-jwt.js';
import { searchLegal, searchLegalSemantic } from '../services/legalSearchService.js';
import { explainLegalResult } from '../services/semanticSearch/aiExplanationService.js';
import LegalActs from '../models/LegalActs.js';
import CaseLaws from '../models/CaseLaws.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ─── Apply auth to all legal routes ──────────────────────────────────────────
router.use(requireAuth);

// ─── Input sanitiser ──────────────────────────────────────────────────────────
function sanitizeQuery(raw) {
    if (!raw || typeof raw !== 'string') { return ''; }
    return raw.replace(/[<>{}[\]\\^`]/g, '').slice(0, 200).trim();
}

function sanitizeBody(raw) {
    if (!raw || typeof raw !== 'object') { return {}; }
    return Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [
            k,
            typeof v === 'string' ? v.replace(/[<>{}[\]\\^`]/g, '').slice(0, 3000) : v,
        ])
    );
}

// ─── GET /search?q=<query> ───────────────────────────────────────────────────
/**
 * Hybrid keyword + semantic search across Indian laws and case metadata.
 * Optionally accepts `explain=true` to return a simplified AI explanation from the top result.
 */
router.get('/search', async (req, res) => {
    try {
        const q = sanitizeQuery(req.query.q);
        const explain = req.query.explain === 'true';

        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = await searchLegal(q);

        let explanation = null;
        if (explain) {
            const top = results.acts[0] || results.sections[0] || results.cases[0];
            if (top) {
                explanation = {
                    source: top.type,
                    title: top.title,
                    simplified: explainLegalResult(top),
                };
            } else {
                explanation = { source: null, title: null, simplified: 'No results found for this query.' };
            }
        }

        return res.json({
            query: q,
            results,
            total: results.acts.length + results.cases.length + results.sections.length,
            ...(explain && { explanation }),
        });
    } catch (err) {
        logger.error({ err, path: req.path }, 'Legal search error');
        return res.status(500).json({ error: 'Legal search failed. Please try again.' });
    }
});

// ─── GET /semantic-search?q=<query> ──────────────────────────────────────────
/**
 * Pure semantic (TF-IDF cosine similarity) search.
 * Returns results even when keywords don't exactly match.
 */
router.get('/semantic-search', async (req, res) => {
    try {
        const q = sanitizeQuery(req.query.q);
        if (!q) { return res.status(400).json({ error: 'Query parameter "q" is required' }); }

        const results = await searchLegalSemantic(q);

        return res.json({
            query: q,
            results,
            total: (results.acts?.length || 0) + (results.cases?.length || 0),
            mode: 'semantic',
        });
    } catch (err) {
        logger.error({ err, path: req.path }, 'Semantic search error');
        return res.status(500).json({ error: 'Semantic search failed. Please try again.' });
    }
});

// ─── POST /explain ────────────────────────────────────────────────────────────
/**
 * Generate an AI-powered plain-language explanation for a legal result.
 * Body: { type, title, subtitle, description, keywords, date, judges }
 */
router.post('/explain', (req, res) => {
    try {
        const body = sanitizeBody(req.body);

        if (!body.title || !body.description) {
            return res.status(400).json({ error: 'Fields "title" and "description" are required' });
        }

        const item = {
            type: body.type || 'act',
            title: body.title,
            subtitle: body.subtitle || '',
            description: body.description,
            keywords: Array.isArray(body.keywords) ? body.keywords : [],
            date: body.date || null,
            judges: Array.isArray(body.judges) ? body.judges : [],
            source: body.source || '',
            sourceLink: body.sourceLink || '',
        };

        const explanation = explainLegalResult(item);

        return res.json({ explanation, title: item.title, type: item.type });
    } catch (err) {
        logger.error({ err, path: req.path }, 'Legal explanation error');
        return res.status(500).json({ error: 'Explanation generation failed.' });
    }
});

// ─── GET /acts?page=<n>&limit=<n> ────────────────────────────────────────────
router.get('/acts', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const [acts, total] = await Promise.all([
            LegalActs.find().sort({ lastUpdated: -1 }).skip(skip).limit(limit).lean(),
            LegalActs.countDocuments(),
        ]);

        return res.json({
            acts: acts.map(a => ({
                id: a._id.toString(),
                title: a.title,
                actName: a.actName,
                section: a.section,
                description: a.description,
                keywords: a.keywords || [],
                source: a.source,
                sourceLink: a.sourceLink,
                lastUpdated: a.lastUpdated,
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        logger.error({ err }, 'Legal acts list error');
        return res.status(500).json({ error: 'Failed to fetch legal acts' });
    }
});

// ─── GET /cases?page=<n>&limit=<n> ───────────────────────────────────────────
router.get('/cases', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const [cases, total] = await Promise.all([
            CaseLaws.find().sort({ date: -1 }).skip(skip).limit(limit).lean(),
            CaseLaws.countDocuments(),
        ]);

        return res.json({
            cases: cases.map(c => ({
                id: c._id.toString(),
                caseTitle: c.caseTitle,
                court: c.court,
                date: c.date,
                judges: c.judges || [],
                keywords: c.keywords || [],
                summary: c.summary,
                source: c.source,
                sourceLink: c.sourceLink,
                lastUpdated: c.lastUpdated,
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        logger.error({ err }, 'Case laws list error');
        return res.status(500).json({ error: 'Failed to fetch case laws' });
    }
});

export default router;
