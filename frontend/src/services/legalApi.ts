/**
 * Frontend API service for Legal Research.
 * Uses the existing apiFetch / getApiUrl helpers to follow project patterns.
 *
 * All requests are authenticated via the existing session cookie mechanism.
 */

import { apiFetch, getApiUrl } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LegalActResult {
    type: 'act';
    id: string;
    title: string;
    subtitle: string; // "ActName — Section X"
    description: string;
    keywords: string[];
    source: string;
    sourceLink: string;
    lastUpdated?: string;
}

export interface CaseLawResult {
    type: 'case';
    id: string;
    title: string;        // caseTitle
    subtitle: string;     // court
    description: string;  // summary
    keywords: string[];
    source: string;
    sourceLink: string;
    date?: string;
    judges?: string[];
    lastUpdated?: string;
}

export interface SectionResult {
    type: 'section';
    id: string;
    title: string;    // "Section X: Title"
    subtitle: string; // actName
    description: string;
    keywords: string[];
    punishment?: string;
    source: string;
    sourceLink: string;
}

export type LegalResult = LegalActResult | CaseLawResult | SectionResult;

export interface SearchResults {
    acts: LegalActResult[];
    cases: CaseLawResult[];
    sections: SectionResult[];
}

export interface SearchResponse {
    query: string;
    results: SearchResults;
    total: number;
    explanation?: {
        source: string | null;
        title: string | null;
        simplified: string;
    } | null;
}

export interface ActsResponse {
    acts: Array<{
        id: string;
        title: string;
        actName: string;
        section: string;
        description: string;
        keywords: string[];
        source: string;
        sourceLink: string;
        lastUpdated: string;
    }>;
    pagination: { page: number; limit: number; total: number; pages: number };
}

export interface CasesResponse {
    cases: Array<{
        id: string;
        caseTitle: string;
        court: string;
        date?: string;
        judges: string[];
        keywords: string[];
        summary: string;
        source: string;
        sourceLink: string;
        lastUpdated: string;
    }>;
    pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Full-text hybrid search (keyword + semantic) across Indian acts, case laws, and legal sections.
 * @param query - the search term
 * @param explain - if true the API returns a simplified AI-style explanation
 */
export async function searchLegal(query: string, explain = false): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query.trim() });
    if (explain) params.set('explain', 'true');

    const res = await apiFetch(getApiUrl(`/api/v1/legal/search?${params.toString()}`), {
        credentials: 'include',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(err.error || `Search failed (HTTP ${res.status})`);
    }

    return res.json();
}

/**
 * Pure semantic search (TF-IDF cosine similarity).
 */
export async function semanticSearchLegal(query: string): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query.trim() });
    const res = await apiFetch(getApiUrl(`/api/v1/legal/semantic-search?${params.toString()}`), {
        credentials: 'include',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Semantic search failed' }));
        throw new Error(err.error || `Semantic search failed (HTTP ${res.status})`);
    }

    return res.json();
}

/**
 * Fetch a rich AI-powered explanation for a legal result.
 */
export async function explainLegal(item: LegalResult): Promise<{ explanation: string; title: string; type: string }> {
    const res = await apiFetch(getApiUrl('/api/v1/legal/explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        credentials: 'include',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Explanation failed' }));
        throw new Error(err.error || `Explanation failed (HTTP ${res.status})`);
    }

    return res.json();
}

/**
 * Fetch a paginated list of legal acts.
 */
export async function fetchActs(page = 1, limit = 20): Promise<ActsResponse> {
    const res = await apiFetch(
        getApiUrl(`/api/v1/legal/acts?page=${page}&limit=${limit}`),
        { credentials: 'include' }
    );
    if (!res.ok) throw new Error('Failed to fetch legal acts');
    return res.json();
}

/**
 * Fetch a paginated list of case laws.
 */
export async function fetchCases(page = 1, limit = 20): Promise<CasesResponse> {
    const res = await apiFetch(
        getApiUrl(`/api/v1/legal/cases?page=${page}&limit=${limit}`),
        { credentials: 'include' }
    );
    if (!res.ok) throw new Error('Failed to fetch case laws');
    return res.json();
}
