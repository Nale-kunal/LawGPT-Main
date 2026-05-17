# Security Policy

## Supported Versions

We actively maintain and apply security patches to the following versions:

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ Active support |
| `develop` | ✅ Active support |
| < 1.0.0 | ❌ No longer supported |

---

## Reporting a Vulnerability

**Please do NOT create public GitHub Issues for security vulnerabilities.**

If you discover a security vulnerability in Juriq, please report it responsibly by emailing:

📧 **security@juriq.in**

Include the following in your report:
1. **Description** — What is the vulnerability?
2. **Reproduction steps** — How to reproduce it (proof-of-concept if applicable)
3. **Impact** — What is the potential impact?
4. **Component** — Which part of the system is affected?
5. **Suggested fix** (optional) — Do you have a proposed fix?

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | Within 24 hours |
| Initial assessment | Within 72 hours |
| Status update | Within 7 days |
| Patch / mitigation | Within 30 days (critical: 7 days) |

We follow responsible disclosure principles. We will:
- Acknowledge your report promptly
- Keep you informed of our progress
- Credit you in the release notes (unless you prefer anonymity)
- Not take legal action against researchers acting in good faith

---

## Security Architecture

### Authentication & Session Management
- **JWT + Refresh Tokens**: Short-lived access tokens (15 min) with long-lived refresh tokens stored in HttpOnly cookies
- **CSRF Protection**: Double-submit cookie pattern with `X-CSRF-Token` header validation
- **Google OAuth**: Stateless OAuth 2.0 with PKCE; callback validates `state` parameter
- **2FA (TOTP)**: Time-based OTP via `speakeasy`, QR code via `qrcode`
- **Security Questions**: Optional secondary recovery layer with bcrypt-hashed answers
- **Account Lockout**: Progressive lockout after repeated failed logins via `accountLockout` middleware

### Transport Security
- **HTTPS Enforcement**: 301 redirect for all HTTP requests in production
- **HSTS**: `max-age=63072000; includeSubDomains; preload` (2 years) in production
- **CSP**: Strict Content Security Policy via Helmet, disallows inline scripts in production
- **CORS**: Whitelist-only origin validation; credentials mode enforced

### API Security
- **Rate Limiting**: Redis-backed `express-rate-limit` with per-endpoint windows:
  - Global: 200 req / 15 min
  - Auth endpoints: 15 req / 15 min
  - Payment: 20 req / 15 min
  - File uploads: 100 req / hour
- **IP Escalation**: Persistent Redis-backed IP block escalation (1 min → 10 min)
- **Input Sanitization**: `express-mongo-sanitize` (NoSQL injection), `xss` (XSS), `zod` (schema validation)
- **Request Size Limits**: 1 MB body limit on all non-upload endpoints

### Data Security
- **Password Hashing**: bcrypt with salt rounds = 12
- **Database Isolation**: All queries scoped to `owner` field (multi-tenant isolation)
- **MongoDB Sanitization**: `express-mongo-sanitize` strips `$` and `.` from all inputs
- **Audit Logging**: Immutable `AuditLog` collection records all admin and sensitive operations
- **Encryption at Rest**: MongoDB Atlas encryption-at-rest; Cloudinary AES-256 for media

### Payment Security
- **HMAC Webhook Verification**: All Razorpay webhook events verified with `X-Razorpay-Signature`
- **Idempotency**: Refund and subscription operations protected with Redis-backed locks
- **Key Rotation**: Razorpay keys can be hot-reloaded via `SIGHUP` signal without restart

### Secrets Management
- All secrets injected via environment variables (never committed)
- `.env` files are in `.gitignore` and `backend/.dockerignore`
- Startup validation (`src/config/env.js`) fails fast if required secrets are missing
- `startupChecks.js` validates TLS readiness, secret entropy, and CORS configuration

### Dependency Security
- Automated `npm audit` in CI on every push (HIGH severity threshold)
- Dependabot configured for weekly dependency updates (`.github/dependabot.yml`)
- CodeQL static analysis on all PRs

---

## Known Security Controls

| Control | Implementation |
|---------|----------------|
| SQL/NoSQL Injection | `express-mongo-sanitize` + parameterized Mongoose queries |
| XSS | `xss` library + CSP headers |
| CSRF | Double-submit cookie (`X-CSRF-Token`) |
| Brute Force | Rate limiting + account lockout |
| Session Fixation | New JWT issued on login |
| Clickjacking | `X-Frame-Options: DENY` via Helmet |
| MIME Sniffing | `X-Content-Type-Options: nosniff` |
| Information Disclosure | Stack traces suppressed in production |
| Privilege Escalation | RBAC middleware + owner-scoped queries |
| Webhook Replay | HMAC signature + event deduplication |

---

## Bug Bounty

We do not currently have a formal bug bounty program, but we deeply value security research. Significant findings will be acknowledged and rewarded at our discretion.

---

## PGP Key

For encrypting sensitive disclosures:

```
Contact security@juriq.in to request our PGP public key.
```
