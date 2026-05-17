# Case Management System

## Overview

Cases are the primary domain entity in Juriq, linking clients, hearings, notes, documents, and time entries.

## Data Model

```
Case
├── ownerId (User)          # Multi-tenant isolation
├── title                    # Case title
├── caseNumber              # Court case number
├── court                    # Court name
├── clientId (Client)       # Linked client
├── status                   # active, pending, closed
├── filingDate              # Date of filing
├── description             # Case details
├── hearings[] → Hearing     # Related hearings
├── notes[] → CaseNote       # Threaded notes
├── documents[] → Document   # Attached documents
└── timeEntries[] → TimeEntry # Billable hours
```

## Frontend

- `Cases.tsx` (35,956 bytes) — Main case management page with:
  - Case list with filters and search
  - Create/edit case forms
  - Status management
  - Client linking
  - Case details popup (`CaseDetailsPopup.tsx`)
  - Case summary generator (`CaseSummaryGenerator.tsx`)
  - Conflict checker (`CaseConflictChecker.tsx`)

## Decomposition Strategy (Future)

`Cases.tsx` is identified as a large monolithic file. Recommended decomposition:

1. Extract `CaseListView` component (filter, sort, pagination)
2. Extract `CaseFormModal` component (create/edit form)
3. Extract `useCases` hook (data fetching, mutations)
4. Extract `caseService.ts` (API calls)
5. Extract case-specific types to `types/case.ts`

**Note**: This decomposition is documented for future implementation. Current behavior is preserved as-is.
