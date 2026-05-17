# Contributing to Juriq

Thank you for your interest in contributing to Juriq! We're building the best legal practice management platform for Indian lawyers, and we welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Standards](#commit-standards)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

By participating, you agree to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.x
- pnpm ≥ 9.x (`npm install -g pnpm@9`)
- Git

### Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/<your-username>/juriq.git
cd juriq

# 3. Add upstream remote
git remote add upstream https://github.com/Nale-kunal/juriq.git

# 4. Install dependencies
pnpm install

# 5. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your local credentials

# 6. Start development servers
pnpm dev
```

---

## Development Workflow

### 1. Sync with upstream

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. Create a feature branch

```bash
git checkout -b feat/my-feature-name
# or
git checkout -b fix/my-bug-fix
```

### 3. Make your changes

- Write code that follows the existing patterns
- Add tests for new backend functionality
- Update documentation if needed
- Keep PRs focused — one feature/fix per PR

### 4. Test your changes

```bash
# Backend tests
pnpm test:backend

# Frontend lint + type check
cd frontend && npx tsc --noEmit && npx eslint src/

# Backend lint
cd backend && npm run lint
```

### 5. Commit using conventional commits

```bash
git add .
git commit -m "feat(backend): add hearing conflict export endpoint"
```

### 6. Push and open a PR

```bash
git push origin feat/my-feature-name
```

Then open a Pull Request against the `main` branch on GitHub.

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<description>` | `feat/legal-template-export` |
| Bug fix | `fix/<description>` | `fix/csrf-token-refresh` |
| Documentation | `docs/<description>` | `docs/api-reference-update` |
| Refactor | `refactor/<description>` | `refactor/billing-service` |
| CI/Infrastructure | `ci/<description>` | `ci/add-security-workflow` |
| Hotfix | `hotfix/<description>` | `hotfix/webhook-signature-verify` |

---

## Commit Standards

We use [Conventional Commits](https://www.conventionalcommits.org/). This is enforced by Commitlint on every commit.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system changes |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |
| `security` | Security fixes |
| `deps` | Dependency updates |

### Valid Scopes

`backend`, `frontend`, `workers`, `shared-types`, `shared-utils`, `docs`, `ci`, `docker`, `infra`, `deps`

### Examples

```bash
git commit -m "feat(backend): add PDF export for invoice"
git commit -m "fix(frontend): resolve calendar date timezone issue"
git commit -m "security(backend): enforce HMAC on admin webhook"
git commit -m "docs: update deployment guide for Railway"
```

---

## Pull Request Process

### PR Checklist

Before submitting, ensure:

- [ ] Code follows existing patterns and conventions
- [ ] `pnpm lint` passes (zero new warnings)
- [ ] Backend changes have corresponding tests
- [ ] No new `console.log` statements (use `logger`)
- [ ] No hardcoded secrets or credentials
- [ ] No `.env` files committed
- [ ] PR description explains **what** and **why**
- [ ] Breaking changes are documented in the PR description
- [ ] Screenshots attached for UI changes

### Review Process

1. CI checks must pass (lint, test, build, security audit)
2. At least 1 maintainer review is required
3. All review comments must be resolved
4. Squash merge preferred for feature branches

### PR Size Guidelines

- **Small** (< 200 lines): Reviewed within 1 day
- **Medium** (200–500 lines): Reviewed within 2-3 days
- **Large** (> 500 lines): Consider breaking into smaller PRs

---

## Code Standards

### Backend (Node.js)

- Use ES modules (`import`/`export`) — the project uses `"type": "module"`
- Use `pino` logger, not `console.log`
- Use `zod` for all request validation
- All DB queries must include `owner` filter for multi-tenancy
- New routes must be mounted in `backend/index.js`
- Service files go in `backend/src/services/`
- Middleware files go in `backend/src/middleware/`
- Models use Mongoose schema with indexes documented

### Frontend (React + TypeScript)

- All new components must be TypeScript (no plain `.js` files)
- Use existing shadcn/ui components before building new ones
- Context values must be memoized
- Avoid `any` types — use proper TypeScript types
- API calls go through `src/lib/api.ts` (axios instance)
- New pages registered in `src/App.tsx` router

### General

- No magic strings — use named constants
- Error handling: never swallow errors silently
- Prefer explicit over implicit
- Small, focused functions and components

---

## Testing Requirements

### Backend

All new service methods and route handlers should have tests in `backend/src/__tests__/`:

```javascript
// Example test structure
describe('PaymentService', () => {
  it('should verify HMAC signature correctly', async () => {
    // ...
  });
});
```

Run tests:

```bash
cd backend
npm test              # all tests
npm run test:coverage # with coverage report
```

### Frontend

Currently, frontend tests are not required but encouraged. We're working on adding Vitest + Testing Library.

---

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:

- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, browser, Node version)
- Relevant logs or screenshots

**For security vulnerabilities**, see [SECURITY.md](SECURITY.md) — do NOT open a public issue.

---

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

The best feature requests:
- Explain the **problem** being solved (not just the solution)
- Describe how it would benefit Indian legal professionals
- Consider implementation complexity
- Are scoped to a single feature

---

## Getting Help

- Open a [Discussion](https://github.com/Nale-kunal/juriq/discussions)
- Check existing [Issues](https://github.com/Nale-kunal/juriq/issues)
- Review the [docs/](docs/) directory

---

Thank you for contributing to Juriq! 🚀
