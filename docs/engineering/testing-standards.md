# Testing Standards

## Backend Tests
- Location: `backend/src/__tests__/`
- Framework: Jest (ESM mode)
- Current suites: `auth.test.js`, `payment.webhook.test.js`, `security.test.js`, `deletionHard.test.js`
- Run: `cd backend && npm test`
- Coverage: `cd backend && npm run test:coverage`

## Test Structure
```javascript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do expected behavior', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', async () => {
      // ...
    });
  });
});
```

## What to Test
- Route handlers: request validation, response format, auth enforcement
- Services: business logic, edge cases, error handling
- Middleware: auth rejection, rate limit, CSRF validation
- Webhook: HMAC verification, event processing, idempotency

## Load Testing
- Tool: autocannon
- Run: `cd backend && npm run load-test`
- Script: `scripts/loadtest.mjs`
