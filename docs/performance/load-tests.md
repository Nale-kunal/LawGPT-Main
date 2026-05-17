# Performance — Load Tests

## Tool: autocannon
Run: `cd backend && npm run load-test` (uses `scripts/loadtest.mjs`)

## Benchmarks to Track
- `/api/v1/health` — baseline latency (target: < 10ms p99)
- `/api/v1/cases` — authenticated read (target: < 100ms p99)
- `/api/v1/auth/login` — auth flow (target: < 200ms p99)
- `/api/v1/documents/upload` — upload throughput

## Performance Budget
| Metric | Target |
|--------|--------|
| API p50 | < 50ms |
| API p99 | < 200ms |
| Frontend FCP | < 1.5s |
| Frontend TTI | < 3.0s |
| Bundle size (gzipped) | < 500KB |
