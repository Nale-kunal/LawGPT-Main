# Legal Search Engine

## Overview

Juriq provides a multi-layered legal research engine covering Indian statutes, case laws, and legal sections.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Legal Search Engine                      │
├──────────────┬───────────────────┬────────────────────────┤
│  Full-Text    │  Semantic Search   │  Legal Ingestion       │
│  Search       │  (Embeddings)      │  Pipeline              │
│               │                    │                         │
│  MongoDB      │  embeddingService  │  ecourtsIngestor       │
│  text index   │  vectorStore       │  indiaCodeIngestor     │
│  regex match  │  semanticSearch    │  supremeCourtIngestor  │
│               │  Service           │  keywordExtractor      │
│               │                    │  normalizer            │
│               │  aiExplanation     │                         │
│               │  Service           │                         │
└──────────────┴───────────────────┴────────────────────────┘
```

## Data Sources

| Source | Ingestor | Model | Description |
|--------|----------|-------|-------------|
| India Code | `indiaCodeIngestor.js` | `LegalActs` | Indian statutes and acts |
| eCourts | `ecourtsIngestor.js` | `CaseLaws` | Court case decisions |
| Supreme Court | `supremeCourtIngestor.js` | `CaseLaws` | Supreme Court judgments |

## Search Layers

### 1. Full-Text Search
- MongoDB text indexes on `LegalActs` and `CaseLaws`
- Supports partial match, regex, and filtered search
- Low latency, good for keyword queries

### 2. Semantic Search
- Text embeddings via `embeddingService.js`
- Vector similarity search via `vectorStore.js`
- AI-generated explanations via `aiExplanationService.js`
- Better for natural language queries ("What is the penalty for defamation?")

### 3. Legal Section Browser
- Structured browsing of acts and their sections
- `LegalSection` model with hierarchical section numbering
- Favorites system for bookmarking frequently referenced sections

## Data Refresh

- `legalCron.js` schedules periodic data refresh from external sources
- `legalDataService.js` orchestrates the full refresh pipeline
- On startup, a non-blocking seed is triggered: `runFullRefresh()`
- Errors in ingestion are non-fatal (logged and skipped)

## Frontend Integration

- `LegalDataContext` provides legal data state to React components
- `legalApi.ts` and `staticLegalData.ts` handle API calls
- `LegalResearch.tsx` page with search, filters, and results display
- Plan-gated: requires at least Basic plan for full access
