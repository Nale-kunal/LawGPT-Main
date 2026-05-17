# Architecture Overview

> System-level architecture documentation for Juriq.

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the complete system architecture with diagrams.

## Component Map

| Component | Technology | Location | Purpose |
|-----------|-----------|----------|---------|
| Frontend SPA | React 18 + Vite + TypeScript | `frontend/` | User interface |
| API Server | Node.js + Express 4 | `backend/index.js` | REST API |
| Workers | BullMQ + Redis | `backend/src/workers/` | Background jobs |
| Database | MongoDB Atlas + Mongoose | `backend/src/models/` | Primary data store |
| Cache/Queue | Redis (ioredis) | `backend/src/utils/redis.js` | Rate limits, jobs, cache |
| Media CDN | Cloudinary | `backend/src/config/cloudinary.js` | Document/media storage |
| Metrics | Prometheus (prom-client) | `backend/index.js` | Observability |
| Error Tracking | Sentry | Both frontend + backend | Error capture |
| Email | SendGrid / SMTP | `backend/src/workers/emailWorker.js` | Transactional email |
| Payments | Razorpay | `backend/src/routes/payment.js` | Subscription billing |

## Design Principles

1. **Owner-scoped queries** — Every DB query filters by `ownerId` for multi-tenant isolation
2. **Fail-fast startup** — Zod-validated env vars, startup checks exit on misconfiguration
3. **Graceful degradation** — Redis falls back to in-memory; Sentry/Cloudinary are optional
4. **Defense-in-depth** — Multiple overlapping security layers (CSRF, rate limit, sanitize, audit)
5. **Backward-compatible APIs** — `/api/*` routes mirror `/api/v1/*` for 90-day migration
6. **Structured logging** — All logs are JSON via Pino for machine-readable observability
7. **Idempotent operations** — Webhook handlers and index creation are safely re-runnable

## Related Docs

- [Auth Flow](auth-flow.md)
- [Payment Architecture](payment-architecture.md)
- [Webhook Flow](webhook-flow.md)
- [Redis Usage](redis-usage.md)
- [BullMQ Architecture](bullmq-architecture.md)
- [Legal Search Engine](legal-search-engine.md)
- [Hearing Conflict System](hearing-conflict-system.md)
- [Frontend Architecture](frontend-architecture.md)
- [Backend Architecture](backend-architecture.md)
- [Worker System](worker-system.md)
- [Deployment Architecture](deployment-architecture.md)
