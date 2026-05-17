# Security Architecture

See [SECURITY.md](../../SECURITY.md) for the full security policy and vulnerability reporting process.

## Defense-in-Depth Layers

### Layer 1: Transport
- HTTPS enforcement via 301 redirect in production
- HSTS: `max-age=63072000; includeSubDomains; preload` (2 years)
- TLS 1.2+ enforced by deployment platforms

### Layer 2: Network
- Helmet CSP: strict Content-Security-Policy
- CORS: whitelist-only origin validation
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Layer 3: Application
- CSRF: double-submit cookie with timing-safe comparison
- Input validation: Zod schemas on all mutating endpoints
- NoSQL injection: `express-mongo-sanitize` strips `$` and `.`
- XSS: `xss` library sanitization
- Body size: 1MB limit on JSON/URL-encoded

### Layer 4: Authentication
- JWT with short-lived access tokens (15 min)
- Refresh tokens in HttpOnly cookies (7 days)
- Account lockout after failed attempts
- Abuse signal detection with IP tracking
- Optional 2FA (TOTP via speakeasy)
- Google OAuth with state validation

### Layer 5: Authorization
- Owner-scoped DB queries (multi-tenant isolation)
- RBAC middleware for admin routes
- Plan enforcement middleware for feature gating
- Admin rate limiting (50 req/hour)

### Layer 6: Data
- Passwords: bcrypt with salt rounds 12
- CSRF tokens: crypto.randomBytes(32)
- JWT secrets: minimum 64 chars in production (validated at startup)
- MongoDB Atlas encryption-at-rest
- Immutable audit logs (AuditLog, AdminAuditLog)

### Layer 7: Operations
- Structured JSON logging (Pino) — no PII in logs
- Sentry error tracking with configurable sample rate
- Prometheus metrics for anomaly detection
- Startup validation (fail-fast on misconfiguration)
- Client error log retention (14-day auto-purge)
