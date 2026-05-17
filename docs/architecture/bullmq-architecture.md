# BullMQ Worker Architecture

## Overview

Juriq uses BullMQ for background job processing. Workers run in a **separate process** from the API server, sharing the same Redis connection for job queues.

## Worker Process

Entry point: `node src/workers/index.js`

```
┌─────────────────────────────────────────┐
│            Worker Process                │
│                                          │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ emailWorker  │  │ adminWorker     │   │
│  │              │  │                 │   │
│  │ • Welcome    │  │ • Bulk updates  │   │
│  │ • Reset pwd  │  │ • Admin tasks   │   │
│  │ • Alerts     │  │ • Reports       │   │
│  │ • Invoices   │  │                 │   │
│  └─────────────┘  └─────────────────┘   │
│                                          │
│  ┌──────────────┐                        │
│  │ cleanupWorker │                       │
│  │               │                       │
│  │ • Token purge │                       │
│  │ • Stale data  │                       │
│  │ • Log cleanup │                       │
│  └──────────────┘                        │
│                                          │
│  Redis connection: REDIS_URL (required)  │
└─────────────────────────────────────────┘
```

## Queue Configuration

| Queue | Worker File | Concurrency | Purpose |
|-------|-------------|-------------|---------|
| `email` | `emailWorker.js` | Default | Transactional email delivery |
| `admin` | `adminWorker.js` | Default | Admin operation processing |
| `cleanup` | `cleanupWorker.js` | Default | Data cleanup and maintenance |

## Job Enqueueing

Jobs are added from the API server using BullMQ `Queue`:

```javascript
import { Queue } from 'bullmq';
const emailQueue = new Queue('email', { connection: redisConnection });

// Enqueue a job
await emailQueue.add('welcome-email', {
  userId: user._id,
  email: user.email,
  name: user.name
});
```

## Graceful Shutdown

Workers handle SIGINT/SIGTERM for graceful shutdown:
1. Stop accepting new jobs
2. Wait for in-progress jobs to complete
3. Close Redis connections
4. Exit process

## Deployment

- Workers can run on a separate Railway / Render / Heroku dyno
- Start command: `npm run workers` (in backend package)
- Requires `REDIS_URL` environment variable (fails fast if not set)
- API server runs independently — if workers are down, jobs queue up in Redis
