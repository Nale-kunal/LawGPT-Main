# Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase | `CaseDetailsPopup.tsx` |
| Hooks | camelCase with `use` prefix | `usePlanAccess.ts` |
| Utility files | camelCase | `formatters.ts` |
| Service files | camelCase | `legalApi.ts` |
| Route files | kebab-case or camelCase | `auth-jwt.js`, `caseNotes.js` |
| Middleware | camelCase | `checkPlanAccess.js` |
| Models | PascalCase | `CaseNote.js` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Env variables | UPPER_SNAKE_CASE | `MONGODB_URI` |
| CSS classes | kebab-case | `case-details-card` |
| Database fields | camelCase | `ownerId`, `createdAt` |
| API routes | kebab-case | `/api/v1/case-notes` |
| Git branches | type/kebab-case | `feat/hearing-export` |
| Commits | conventional commits | `feat(backend): add export` |
