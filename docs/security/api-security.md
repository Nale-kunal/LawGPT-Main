# API Security

## Controls

- Rate limiting per endpoint group (Redis-backed)
- IP escalation blocking (progressive: 1 min → 10 min)
- Zod schema validation on all inputs
- `express-mongo-sanitize` for NoSQL injection prevention
- `xss` library for XSS mitigation
- 1MB body size limit
- CSRF on all mutating requests
- Owner-scoped queries for multi-tenant isolation
- Structured error responses (no stack traces in production)
- Request ID correlation for debugging

## Rate Limits

| Endpoint Group | Window | Max | Backing |
|----------------|--------|-----|---------|
| Global | 15 min | 200 | Redis / Memory |
| Auth | 15 min | 15 | Redis / Memory |
| Payment | 15 min | 20 | Redis / Memory |
| Upload | 1 hour | 100 | Redis / Memory |
| Admin | 1 hour | 50 | Redis / Memory |
| Client Errors | 1 min | 20 | Redis / Memory |
