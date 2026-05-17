# Backend Architecture

## Entry Point

`backend/index.js` — 651-line server entry that bootstraps the entire Express application:

1. Load environment variables (dotenv)
2. Validate environment (Zod schema in `config/env.js`)
3. Run startup checks (TLS, secrets, CORS validation)
4. Initialize Sentry + Prometheus metrics
5. Configure Express middleware stack (14 layers)
6. Mount 23+ route files under `/api/v1/`
7. Connect Redis → MongoDB → ensure indexes
8. Start cron jobs + legal data seed
9. Start HTTP server with graceful shutdown

## Directory Structure

```
backend/src/
├── config/
│   ├── env.js           # Zod-validated environment variables
│   ├── db.js            # MongoDB connection helper
│   ├── mongodb.js       # Mongoose connection manager
│   ├── cloudinary.js    # Cloudinary SDK config
│   ├── indexes.js       # Compound index definitions (idempotent)
│   └── planFeatures.js  # Plan feature matrix
├── controllers/
│   └── forgotPasswordController.js
├── jobs/
│   ├── legalCron.js     # Scheduled legal data refresh
│   └── tokenCleanup.js  # Expired token purge
├── middleware/
│   ├── auth-jwt.js      # JWT authentication
│   ├── csrf.js          # CSRF double-submit cookie
│   ├── rbac.js          # Role-based access control
│   ├── checkPlanAccess.js # Subscription plan enforcement
│   ├── requirePlan.js   # Plan tier requirement
│   ├── validate.js      # Zod request validation
│   ├── abuseDetection.js # IP abuse tracking
│   ├── accountLockout.js # Login attempt lockout
│   ├── activityLogger.js # Activity feed logging
│   ├── audit.js         # Immutable audit trail
│   ├── planEnforcement.js # Plan limit enforcement
│   └── requestId.js     # X-Request-Id correlation
├── models/              # 29 Mongoose models
├── routes/              # 23 Express route files
├── schemas/             # Zod validation schemas
├── services/            # Business logic
│   ├── legalDataService.js
│   ├── legalSearchService.js
│   ├── planService.js
│   ├── invoiceService.js
│   ├── reconciliation.js
│   ├── settlementService.js
│   ├── notificationService.js
│   ├── tokenService.js
│   ├── userDeletionService.js
│   ├── backupService.js
│   ├── metricsService.js
│   ├── alertQueueService.js
│   ├── legalIngestion/   # Data ingestion pipeline
│   └── semanticSearch/   # AI-powered legal search
├── utils/               # Infrastructure utilities
│   ├── logger.js        # Pino structured logger
│   ├── redis.js         # Redis client with in-memory fallback
│   ├── mailer.js        # SMTP/SendGrid email
│   ├── encryption.js    # Data encryption helpers
│   ├── cache.js         # Caching utilities
│   ├── startupChecks.js # Pre-flight validation
│   ├── businessMetrics.js # Prometheus business KPIs
│   ├── conflictDetection.js # Hearing conflict detection
│   ├── emailVerification.js # Email verification flow
│   ├── eventEmitter.js  # Internal event bus
│   ├── keepAlive.js     # Render/Railway keep-alive pinger
│   └── keyStore.js      # JWT key store
└── workers/             # BullMQ background workers
    ├── index.js         # Worker coordinator
    ├── emailWorker.js   # Email delivery worker
    ├── adminWorker.js   # Admin operations worker
    └── cleanupWorker.js # Data cleanup worker
```

## Middleware Stack (Order)

The middleware stack order in `index.js` is critical for security:

1. HTTPS enforcement (production only)
2. Helmet (security headers)
3. CORS (whitelist-only)
4. Body parsing (JSON + URL-encoded, 1MB limit)
5. Cookie parser
6. MongoDB sanitization
7. Compression
8. Request ID + Pino HTTP logging
9. Prometheus request duration tracking
10. CSRF protection
11. Rate limiting (global + per-endpoint)
12. Route handlers
13. Sentry error handler
14. 404 + global error handler

## Error Handling

- All routes wrapped in try/catch
- Global error handler returns consistent `{ error, message }` format
- Stack traces suppressed in production
- Unhandled rejections and uncaught exceptions trigger graceful shutdown
