# ADR-0001: Repository Strategy

## Status: Accepted
## Date: 2026-05-11

## Context
The Juriq codebase grew organically with `frontend/` and `backend/` directories at the root. As features expanded (workers, payments, legal search), the need for shared types, consistent tooling, and enterprise documentation became clear.

## Decision
Adopt a **pnpm workspace monorepo** with Turborepo orchestration, WITHOUT physically moving existing application directories. The `frontend/` and `backend/` directories remain in place. Enterprise scaffolding (packages, docs, infrastructure, tooling) is added AROUND the existing structure.

## Consequences
- Zero import breakage — no file paths change
- Shared packages (`packages/shared-types`, `packages/shared-utils`) are available for future adoption
- Turborepo provides build orchestration and task caching
- Developer tooling (husky, commitlint, prettier, editorconfig) standardized at the root level
- Documentation tree provides comprehensive architectural reference
