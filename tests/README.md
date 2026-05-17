# Tests

This directory is a future-ready test organization structure.

## Current Tests
Backend tests are located at `backend/src/__tests__/`:
- `auth.test.js`
- `payment.webhook.test.js`
- `security.test.js`
- `deletionHard.test.js`

## Planned Structure

```
tests/
├── e2e/           # End-to-end tests (Playwright/Cypress)
├── integration/   # Cross-service integration tests
├── frontend/      # React component tests (Vitest + Testing Library)
├── backend/       # Additional backend tests
├── security/      # Security-specific test suites
└── performance/   # Performance benchmark tests
```

## Running Tests

```bash
# Backend tests
cd backend && npm test

# Backend with coverage
cd backend && npm run test:coverage

# Load testing
cd backend && npm run load-test
```
