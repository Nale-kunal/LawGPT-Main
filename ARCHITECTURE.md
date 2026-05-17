# Juriq System Architecture

> Comprehensive architecture documentation for the Juriq Legal Practice Management SaaS Platform.

---

## System Overview

Juriq is a multi-tier, service-oriented SaaS platform built with a React frontend, Node.js/Express API server, BullMQ background workers, MongoDB primary store, Redis cache/queue layer, and Cloudinary media storage.

```
                              ┌──────────────────┐
                              │   CDN / Vercel    │
                              │   (Frontend SPA)  │
                              └────────┬─────────┘
                                       │ HTTPS
                              ┌────────▼─────────┐
                              │  Nginx / LB       │
                              │  (Reverse Proxy)   │
                              └────────┬─────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
       ┌────────▼─────────┐  ┌────────▼─────────┐  ┌────────▼─────────┐
       │  Express API      │  │  Express API      │  │  Express API      │
       │  (Instance 1)     │  │  (Instance 2)     │  │  (Instance N)     │
       └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                │                      │                      │
                └──────────┬───────────┘──────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼──────┐ ┌────────▼──────┐ ┌────────▼──────┐
│   MongoDB     │ │    Redis      │ │  Cloudinary   │
│   Atlas       │ │  (ioredis)    │ │  (Media CDN)  │
│               │ │               │ │               │
│ • 29 models   │ │ • Rate limits │ │ • Documents   │
│ • Compound    │ │ • CSRF tokens │ │ • Note media  │
│   indexes     │ │ • BullMQ jobs │ │ • Avatars     │
│ • TTL expiry  │ │ • Session     │ │               │
│ • Text search │ │   blacklist   │ │               │
└───────────────┘ └───────┬───────┘ └───────────────┘
                          │
                 ┌────────▼──────────┐
                 │  BullMQ Workers   │
                 │  (Separate proc)  │
                 │                   │
                 │ • emailWorker     │
                 │ • adminWorker     │
                 │ • cleanupWorker   │
                 └───────────────────┘
```

---

## Application Layers

### 1. Frontend (React SPA)

| Aspect | Detail |
|--------|--------|
| Framework | React 18 with Vite 7 |
| Language | TypeScript 5.x |
| Routing | React Router 6 (lazy-loaded pages) |
| State | React Context (Auth, Plan, Theme, Preferences, LegalData, Formatting) |
| Server State | TanStack Query (react-query) |
| UI System | Tailwind CSS + Radix UI primitives (shadcn/ui) |
| Forms | React Hook Form + Zod validation |
| HTTP | Axios with interceptors (CSRF, refresh token, request ID) |
| Error Tracking | Sentry React SDK |
| Export | jsPDF (PDF) + docx (Word) |
| Rich Text | React Quill |
| Charts | Recharts |

**Key Architecture Patterns:**
- `RequireAuth` / `PublicOnlyRoute` route guards
- `FeatureGate` component for plan-based rendering
- `AccessDeniedOverlay` for restricted feature prompts
- `DashboardLayout` shell with Sidebar + Header + NotificationDropdown
- Lazy-loaded pages (React.lazy + Suspense with JuriqLoader fallback)
- `api.ts` centralized Axios instance with automatic CSRF + refresh token handling

### 2. Backend API (Express)

| Aspect | Detail |
|--------|--------|
| Runtime | Node.js 20 (ESM modules) |
| Framework | Express 4 |
| Entry Point | `backend/index.js` (651 lines — middleware stack + route mounting) |
| Auth | JWT access + refresh tokens in HttpOnly cookies |
| Validation | Zod schemas in `src/schemas/` |
| Logging | Pino (structured JSON) + pino-http |
| Metrics | Prometheus via prom-client |
| Error Tracking | Sentry Node SDK |
| Database ORM | Mongoose 8 |

**Middleware Stack (order matters):**
1. HTTPS enforcement (production)
2. Helmet (CSP, HSTS, X-Frame-Options)
3. CORS (whitelist-only origins)
4. Body parsing (JSON 1MB limit)
5. Cookie parser
6. MongoDB sanitization (NoSQL injection)
7. Compression (gzip)
8. Request ID correlation
9. Pino HTTP logging
10. Prometheus duration tracking
11. CSRF protection (double-submit cookie)
12. Rate limiting (Redis-backed, per-endpoint)
13. Route handlers
14. Sentry error handler
15. 404 handler
16. Global error handler

### 3. Background Workers (BullMQ)

Workers run in a **separate process** (`node src/workers/index.js`) and connect to the same Redis instance as the API server.

| Worker | Responsibility |
|--------|---------------|
| `emailWorker` | Transactional email delivery (SendGrid/SMTP) |
| `adminWorker` | Admin operations, bulk updates |
| `cleanupWorker` | Expired token cleanup, stale data purging |

### 4. Scheduled Jobs (node-cron)

These run inside the main API process:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `legalCron` | Configurable | Refresh legal data from external sources |
| `tokenCleanup` | Periodic | Remove expired refresh tokens |
| `reconciliation` | Periodic | Payment reconciliation + settlement sync |
| `ClientErrorLog cleanup` | Daily (86400s) | Purge logs older than 14 days |

---

## Authentication Architecture

```
┌──────────┐     POST /auth/login      ┌──────────────┐
│  Client   │ ───────────────────────▶ │  Auth Route   │
│  (React)  │                          │  (auth-jwt.js) │
└──────────┘                          └───────┬───────┘
     ▲                                         │
     │  Set-Cookie: access_token (15min)       │ bcrypt.compare(password, hash)
     │  Set-Cookie: refresh_token (7d)         │ Generate JWT pair
     │  Set-Cookie: csrf-token (1d)            │
     │◀────────────────────────────────────────┘
     │
     │  Every API request:
     │  Cookie: access_token=...
     │  X-CSRF-Token: ... (read from csrf-token cookie)
     │
     │  On 401 (access token expired):
     │  POST /auth/refresh  →  new access_token cookie
```

**Token Lifecycle:**
- Access token: 15 min, HttpOnly, Secure, SameSite
- Refresh token: 7 days, HttpOnly, Secure, SameSite
- CSRF token: 24 hours, non-HttpOnly (JS-readable), SameSite

**Security Features:**
- Timing-safe CSRF comparison (`crypto.timingSafeEqual`)
- Account lockout after N failed attempts
- Abuse signal detection and IP blocking
- 2FA via TOTP (speakeasy + QR code)
- Google OAuth (stateless, callback validation)
- Security questions (bcrypt-hashed answers)

---

## Payment Architecture

```
┌──────────┐    POST /payment/subscribe    ┌─────────────┐    Razorpay API    ┌───────────┐
│  Client   │ ────────────────────────────▶│ Payment      │──────────────────▶│ Razorpay  │
│           │                              │ Routes       │                   │ Gateway   │
└──────────┘                              └──────┬───────┘                   └─────┬─────┘
                                                  │                                 │
                                                  │  Create Subscription            │
                                                  │  Store Payment record            │
                                                  │                                 │
                                                  ▼                                 │
                                          ┌──────────────┐                          │
                                          │  MongoDB      │                          │
                                          │  Subscription │                          │
                                          │  Payment      │                          │
                                          │  Invoice      │                          │
                                          └──────────────┘                          │
                                                                                    │
                                          POST /payment/webhook                     │
                                          X-Razorpay-Signature: HMAC               │
                                          ◀─────────────────────────────────────────┘
                                                  │
                                          ┌───────▼───────┐
                                          │ HMAC Verify    │
                                          │ Idempotency    │
                                          │ Event Process  │
                                          │ Status Update  │
                                          └───────────────┘
```

**Key Design Decisions:**
- Webhook is exempt from rate limiting (Razorpay must always reach it)
- HMAC signature verification on every webhook
- Redis-locked refund operations for idempotency
- SIGHUP signal triggers hot key rotation
- Settlement tracking with daily reconciliation cron
- Plan enforcement via `checkPlanAccess` + `requirePlan` middleware

---

## Data Layer

### MongoDB Models (29)

| Domain | Models |
|--------|--------|
| Auth | `User`, `PasswordReset` |
| Cases | `Case`, `CaseNote`, `CaseLaws` |
| Clients | `Client` |
| Legal | `LegalActs`, `LegalSection` |
| Documents | `Document`, `Folder`, `TemplateDocument` |
| Finance | `Invoice`, `TimeEntry`, `Payment`, `PaymentInvoice`, `PaymentLog` |
| Subscription | `Subscription`, `CouponUsageLog`, `RefundLog`, `SettlementLog` |
| Notifications | `Alert`, `AlertQueue` |
| Analytics | `AnalyticsDaily`, `UserUsageSnapshot` |
| Activity | `Activity`, `ActivityEvent` |
| Audit | `AuditLog`, `AdminAuditLog`, `AbuseSignalLog` |
| Errors | `ClientErrorLog` |
| Hearings | `Hearing` |

### MongoDB Indexes

All compound indexes are defined in `src/config/indexes.js` and created idempotently on startup:
- Case: `(ownerId, createdAt)`, `(ownerId, status)`, `(clientId, ownerId)`
- Client: `(ownerId, createdAt)`, `(ownerId, status)`
- Document: `(ownerId, folderId)`, `(ownerId, createdAt)`, `(fileType, ownerId)`
- Hearing: `(ownerId, date)`, `(caseId)`
- AuditLog: `(userId, createdAt)`, `(action, createdAt)`
- LegalActs: `(actName, section)` unique, `(lastUpdated)`
- CaseLaws: `(caseTitle, court)` unique, `(date)`

### Redis Usage

| Purpose | Key Pattern | TTL |
|---------|-------------|-----|
| Rate limiting | `rl:{limiter}:{ip}` | Window-based |
| IP escalation | `rl_hits:{ip}`, `block:{ip}` | 10 min |
| CSRF tokens | Cookie-based | 24h |
| Plan cache | `plan:{userId}` | Configurable |
| Refund locks | `refund_lock:{paymentId}` | 60s |
| BullMQ jobs | `bull:{queue}:*` | Job-dependent |

---

## API Route Structure

All routes are versioned under `/api/v1/` with backward compatibility at `/api/` for 90-day migration.

| Route | File | Auth | Rate Limit |
|-------|------|------|------------|
| `/api/v1/auth/*` | auth-jwt.js | Varies | 15/15min |
| `/api/v1/auth/google/*` | google-auth.js | Public | OAuth limiter |
| `/api/v1/cases` | cases.js | JWT | Global |
| `/api/v1/cases/:id/notes` | caseNotes.js | JWT | Global |
| `/api/v1/clients` | clients.js | JWT | Global |
| `/api/v1/hearings` | hearings.js | JWT | Global |
| `/api/v1/documents` | documents.js | JWT | Upload: 100/h |
| `/api/v1/invoices` | invoices.js | JWT | Global |
| `/api/v1/legal` | legal.js + legal.routes.js | Public+JWT | Global |
| `/api/v1/legal-sections` | legalSections.js | JWT | Global |
| `/api/v1/subscription` | subscription.js | JWT | Global |
| `/api/v1/payment` | payment.js | JWT | 20/15min |
| `/api/v1/admin` | admin.js | Admin JWT | 50/h |
| `/api/v1/2fa` | twoFactor.js | JWT | Global |
| `/api/v1/templates` | templates.routes.js | JWT | Global |
| `/api/v1/news` | news.js | Public | Global |
| `/api/v1/health` | inline (index.js) | Public | None |
| `/api/v1/metrics` | inline (index.js) | Internal | None |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production                            │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │   Vercel      │    │  Railway /    │   │  Railway    │  │
│  │  (Frontend)   │    │  Render       │   │  Redis     │  │
│  │              │    │  (Backend)    │   │            │  │
│  │  • Vite SPA  │    │  • Express   │   │  • Cache   │  │
│  │  • CDN edge  │    │  • Workers   │   │  • BullMQ  │  │
│  │  • SPA       │    │  • Cron jobs │   │  • Rate    │  │
│  │    routing   │    │             │   │    limits  │  │
│  └──────────────┘    └──────────────┘   └────────────┘  │
│                              │                           │
│                     ┌────────▼────────┐                  │
│                     │  MongoDB Atlas   │                  │
│                     │  (M10+ cluster)  │                  │
│                     └─────────────────┘                  │
│                     ┌────────────────┐                   │
│                     │  Cloudinary     │                   │
│                     │  (Media CDN)    │                   │
│                     └────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

---

## Security Architecture

See [SECURITY.md](../SECURITY.md) and [docs/security/](docs/security/) for comprehensive security documentation.

**Defense-in-Depth Layers:**
1. **Transport**: HTTPS enforcement, HSTS preload (2 years)
2. **Network**: Helmet CSP, CORS whitelist, X-Frame-Options DENY
3. **Application**: CSRF double-submit, Zod validation, mongo-sanitize, XSS filtering
4. **Auth**: JWT rotation, refresh tokens, 2FA, account lockout, abuse detection
5. **Data**: Owner-scoped queries (multi-tenancy), bcrypt passwords, audit logging
6. **Payments**: HMAC webhook verification, idempotent refunds, key rotation
7. **Operational**: Structured logging, Sentry, Prometheus metrics, startup validation

---

## Further Reading

- [Auth Flow](docs/architecture/auth-flow.md)
- [Payment Architecture](docs/architecture/payment-architecture.md)
- [Redis Usage](docs/architecture/redis-usage.md)
- [BullMQ Architecture](docs/architecture/bullmq-architecture.md)
- [Database Schemas](docs/database/schemas.md)
- [Security Architecture](docs/security/security-architecture.md)
- [API Reference](API_REFERENCE.md)
