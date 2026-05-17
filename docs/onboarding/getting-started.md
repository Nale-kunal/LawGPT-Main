# Developer Onboarding — Getting Started

Welcome to the Juriq engineering team! This guide will get you up and running.

## Day 1: Setup

### 1. Prerequisites
- Node.js 20+ (use `.nvmrc`: `nvm use`)
- pnpm 9+ (`npm install -g pnpm@9`)
- Git
- VS Code (recommended)

### 2. Clone & Install
```bash
git clone https://github.com/Nale-kunal/juriq.git
cd juriq
pnpm install
```

### 3. Environment Setup
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB Atlas + Cloudinary credentials
```

### 4. Start Development
```bash
pnpm dev  # Starts frontend + backend in parallel
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health: http://localhost:5000/api/v1/health

## Day 2: Understand the Architecture

Read these docs in order:
1. [Architecture Overview](../architecture/overview.md)
2. [Backend Architecture](../architecture/backend-architecture.md)
3. [Frontend Architecture](../architecture/frontend-architecture.md)
4. [Auth Flow](../architecture/auth-flow.md)
5. [Database Schemas](../database/schemas.md)

## Day 3: Make Your First Contribution

1. Read [CONTRIBUTING.md](../../CONTRIBUTING.md)
2. Pick a "good first issue" from GitHub Issues
3. Create a feature branch: `git checkout -b feat/my-feature`
4. Make changes following [Coding Standards](../engineering/coding-standards.md)
5. Run tests: `cd backend && npm test`
6. Commit with conventional commit format
7. Open a PR

## Key Files to Know

| File | What It Does |
|------|-------------|
| `backend/index.js` | Server entry — middleware stack + route mounting |
| `backend/src/config/env.js` | Zod env validation (fail-fast) |
| `frontend/src/App.tsx` | React router + context providers |
| `frontend/src/lib/api.ts` | Axios instance with interceptors |
| `frontend/src/contexts/AuthContext.tsx` | Auth state management |
