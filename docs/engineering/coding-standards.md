# Coding Standards

## General
- Use ES modules (`import`/`export`) — the project uses `"type": "module"`
- Prefer `const` over `let`; never use `var`
- Use arrow functions for callbacks
- Use template literals over string concatenation
- Always handle errors — never swallow with empty catch blocks

## Backend (Node.js)
- Use `pino` logger, never `console.log` in production code
- Use `zod` for all request validation (schemas in `src/schemas/`)
- All DB queries MUST include `ownerId` filter for multi-tenancy
- New routes must be mounted in `backend/index.js`
- Services go in `src/services/`, middleware in `src/middleware/`
- Return consistent `{ error, message }` on errors

## Frontend (React + TypeScript)
- All new files must be TypeScript (`.tsx` / `.ts`)
- Use shadcn/ui components before building custom ones
- Context values must be memoized with `useMemo`
- Avoid `any` — use proper types
- API calls through `src/lib/api.ts`
- Lazy-load pages with `React.lazy` + `Suspense`

## Naming
- Files: `camelCase.ts` for utils, `PascalCase.tsx` for components
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`
- CSS classes: `kebab-case`
