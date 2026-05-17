# Worker System

See [BullMQ Architecture](bullmq-architecture.md) for detailed worker documentation.

## Quick Reference

| Worker | Queue | Start Command |
|--------|-------|---------------|
| Email Worker | `email` | `npm run workers` |
| Admin Worker | `admin` | `npm run workers` |
| Cleanup Worker | `cleanup` | `npm run workers` |

All workers start via the coordinator at `backend/src/workers/index.js`.
Requires `REDIS_URL` environment variable.
