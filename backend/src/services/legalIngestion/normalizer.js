/**
 * Data Normalizer for Legal Ingestion.
 *
 * Converts raw scraped data from any source into the unified
 * LegalActs / CaseLaws schema ready for upsert.
 *
 * IMPORTANT: Only metadata and summaries are stored. Full judgments are NOT stored.
 */

import { mergeKeywords } from './keywordExtractor.js';

const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_TITLE_LENGTH = 300;

// ─── Act normalisation ────────────────────────────────────────────────────────

/**
 * Normalise a raw act/section object into the LegalActs schema shape.
 *
 * @param {object} raw
 * @param {string} raw.title
 * @param {string} raw.actName
 * @param {string} [raw.section]
 * @param {string} raw.description
 * @param {string[]} [raw.keywords]
 * @param {string} [raw.source]
 * @param {string} [raw.sourceLink]
 * @returns {object} Normalised act document
 */
export function normalizeAct(raw) {
    const title = (raw.title || '').trim().slice(0, MAX_TITLE_LENGTH);
    const actName = (raw.actName || '').trim().slice(0, MAX_TITLE_LENGTH);
    const section = (raw.section || '').trim().slice(0, 50);
    const description = (raw.description || '').trim().slice(0, MAX_DESCRIPTION_LENGTH);

    if (!title || !actName || !description) return null;

    const keywords = mergeKeywords(
        (raw.keywords || []).map(k => String(k).trim()).filter(Boolean),
        `${title} ${description}`,
        15
    );

    return {
        title,
        actName,
        section,
        description,
        keywords,
        source: (raw.source || 'IndiaCode').trim(),
        sourceLink: (raw.sourceLink || '').trim(),
        lastUpdated: new Date(),
    };
}

// ─── Case law normalisation ───────────────────────────────────────────────────

/**
 * Normalise a raw case object into the CaseLaws schema shape.
 *
 * @param {object} raw
 * @param {string} raw.caseTitle
 * @param {string} [raw.court]
 * @param {string|Date} [raw.date]
 * @param {string[]} [raw.judges]
 * @param {string[]} [raw.keywords]
 * @param {string} raw.summary
 * @param {string} [raw.source]
 * @param {string} [raw.sourceLink]
 * @returns {object|null} Normalised case document, or null if invalid
 */
export function normalizeCase(raw) {
    const caseTitle = (raw.caseTitle || '').trim().slice(0, MAX_TITLE_LENGTH);
    const court = (raw.court || 'Supreme Court of India').trim().slice(0, 200);
    const summary = (raw.summary || '').trim().slice(0, MAX_DESCRIPTION_LENGTH);

    if (!caseTitle || !summary) return null;

    // Parse date safely
    let date = null;
    if (raw.date) {
        const d = raw.date instanceof Date ? raw.date : new Date(raw.date);
        date = isNaN(d.getTime()) ? null : d;
    }

    const judges = Array.isArray(raw.judges)
        ? raw.judges.map(j => String(j).trim()).filter(Boolean).slice(0, 10)
        : [];

    const keywords = mergeKeywords(
        (raw.keywords || []).map(k => String(k).trim()).filter(Boolean),
        `${caseTitle} ${summary}`,
        15
    );

    return {
        caseTitle,
        court,
        date,
        judges,
        keywords,
        summary,
        source: (raw.source || 'eCourts').trim(),
        sourceLink: (raw.sourceLink || '').trim(),
        lastUpdated: new Date(),
    };
}
