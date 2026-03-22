/**
 * Keyword Extractor for Legal Documents.
 *
 * Removes English + legal stopwords, extracts top meaningful tokens.
 * Returns a deduped array of keywords for indexing and search.
 */

// ─── Stopword list (English + common legal filler words) ─────────────────────
const STOPWORDS = new Set([
    // English basics
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'not', 'no', 'nor',
    'so', 'yet', 'both', 'either', 'neither', 'also', 'too', 'very', 'just',
    'than', 'then', 'that', 'this', 'these', 'those', 'it', 'its', 'he',
    'she', 'they', 'we', 'you', 'I', 'him', 'her', 'them', 'us', 'who',
    'which', 'what', 'when', 'where', 'how', 'why', 'all', 'any', 'each',
    'every', 'some', 'such', 'other', 'another', 'more', 'most', 'less',
    'own', 'same', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'out', 'up', 'down', 'about', 'if', 'as', 'while',
    'because', 'since', 'until', 'unless', 'although', 'though', 'even',
    'whereas', 'hereby', 'therein', 'thereof', 'thereto', 'therefore',
    // Legal filler
    'act', 'section', 'sub', 'clause', 'article', 'said', 'aforesaid',
    'hereby', 'herein', 'thereof', 'therein', 'thereafter', 'thereto',
    'heretofore', 'hereafter', 'hereinabove', 'hereinafter', 'abovementioned',
    'mentioned', 'provided', 'subject', 'notwithstanding', 'pursuant',
    'under', 'accordance', 'accordance', 'regard', 'respect', 'relation',
    'manner', 'purpose', 'nature', 'kind', 'way', 'time', 'period', 'date',
    'order', 'accordance', 'accordance', 'case', 'matter', 'court', 'person',
    'persons', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'years', 'year', 'month', 'months', 'day', 'days',
    'law', 'laws', 'legal', 'shall', 'must', 'may', 'provided', 'rule',
    'rules', 'apply', 'applies', 'applied', 'applicable', 'government',
    'state', 'central', 'india', 'indian',
]);

/**
 * Extract keywords from a text string.
 *
 * @param {string} text — Title, description, or combined text to extract from
 * @param {number} [maxKeywords=10] — Maximum keywords to return
 * @returns {string[]} Extracted keywords, lowercase, deduped
 */
export function extractKeywords(text, maxKeywords = 10) {
    if (!text || typeof text !== 'string') {return [];}

    // Tokenise: split on whitespace + punctuation, lowercase
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(tok => tok.length >= 3 && !STOPWORDS.has(tok));

    // Count frequencies
    const freq = new Map();
    for (const tok of tokens) {
        freq.set(tok, (freq.get(tok) || 0) + 1);
    }

    // Sort by frequency descending, take top N
    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([tok]) => tok);
}

/**
 * Merge and deduplicate existing keywords with newly extracted ones.
 * Preserves important explicit keywords (like "IPC 302") from the existing array.
 *
 * @param {string[]} existing — Already-known keywords
 * @param {string} text — Raw text to extract additional keywords from
 * @param {number} [maxTotal=15] — Max total keywords
 * @returns {string[]}
 */
export function mergeKeywords(existing = [], text = '', maxTotal = 15) {
    const extracted = extractKeywords(text, maxTotal);
    const combined = [...new Set([...existing.map(k => k.toLowerCase()), ...extracted])];
    return combined.slice(0, maxTotal);
}
