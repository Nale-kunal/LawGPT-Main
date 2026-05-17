# Juriq API Reference

> Complete REST API documentation for the Juriq platform.  
> Base URL: `https://api.juriq.in` | API Version: `v1`  
> All endpoints prefixed with `/api/v1/` unless otherwise noted.

---

## Authentication

All protected endpoints require a valid JWT access token delivered via HttpOnly cookie.  
Mutating requests (POST/PUT/PATCH/DELETE) require `X-CSRF-Token` header matching the `csrf-token` cookie.

### Get CSRF Token
```
GET /api/v1/auth/csrf-token
```
Sets `csrf-token` cookie and returns `{ csrfToken: "..." }`.

### Register
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "password": "string (min 8 chars)",
  "phone": "string (optional)"
}

Response 201: { user, message }
```

### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}

Response 200: { user }
Sets: access_token, refresh_token, csrf-token cookies
```

### Refresh Token
```
POST /api/v1/auth/refresh

Response 200: { ok: true }
Sets: new access_token cookie
```

### Logout
```
POST /api/v1/auth/logout

Response 200: { message: "Logged out" }
Clears: all auth cookies
```

### Get Current User
```
GET /api/v1/auth/me
Auth: Required

Response 200: { user }
```

### Forgot Password
```
POST /api/v1/auth/forgot-password
{ "email": "string" }
Response 200: { message }
```

### Reset Password
```
POST /api/v1/auth/reset-password
{ "token": "string", "password": "string" }
Response 200: { message }
```

### Google OAuth
```
GET /api/v1/auth/google          → Redirects to Google
GET /api/v1/auth/google/callback → Handles OAuth callback
```

---

## Cases

### List Cases
```
GET /api/v1/cases
Auth: Required
Query: ?status=active&page=1&limit=20&sort=-createdAt

Response 200: { cases: [...], total, page, pages }
```

### Create Case
```
POST /api/v1/cases
Auth: Required
CSRF: Required

{
  "title": "string",
  "caseNumber": "string",
  "court": "string",
  "clientId": "ObjectId",
  "status": "active|pending|closed",
  "description": "string",
  "filingDate": "ISO date"
}

Response 201: { case }
```

### Update Case
```
PUT /api/v1/cases/:id
Auth: Required | CSRF: Required
Body: { ...partial case fields }
Response 200: { case }
```

### Delete Case
```
DELETE /api/v1/cases/:id
Auth: Required | CSRF: Required
Response 200: { message }
```

---

## Case Notes

### List Notes for Case
```
GET /api/v1/cases/:caseId/notes
Auth: Required
Response 200: { notes: [...] }
```

### Create Note
```
POST /api/v1/cases/:caseId/notes
Auth: Required | CSRF: Required
{ "content": "string", "parentNoteId": "ObjectId (optional)" }
Response 201: { note }
```

### Note Attachments
```
POST /api/v1/cases/:caseId/notes/:noteId/attachments
Auth: Required | CSRF: Required
Content-Type: multipart/form-data
Body: file (uploaded to Cloudinary)
Response 201: { attachment }
```

---

## Clients

### List / Create / Update / Delete
```
GET    /api/v1/clients              → { clients: [...] }
POST   /api/v1/clients              → { client }
PUT    /api/v1/clients/:id          → { client }
DELETE /api/v1/clients/:id          → { message }
```

---

## Hearings

### CRUD + Conflict Detection
```
GET    /api/v1/hearings             → { hearings: [...] }
POST   /api/v1/hearings             → { hearing, conflicts?: [...] }
PUT    /api/v1/hearings/:id         → { hearing }
DELETE /api/v1/hearings/:id         → { message }
```

The create/update response includes `conflicts` array if scheduling conflicts are detected.

---

## Documents

### List Documents
```
GET /api/v1/documents/files
Auth: Required
Query: ?folderId=...&fileType=...
Response 200: { documents: [...] }
```

### Upload Document
```
POST /api/v1/documents/upload
Auth: Required | CSRF: Required | Rate Limit: 100/hour
Content-Type: multipart/form-data
Body: file, folderId (optional)
Response 201: { document }
```

### Folders
```
GET    /api/v1/documents/folders     → { folders: [...] }
POST   /api/v1/documents/folders     → { folder }
DELETE /api/v1/documents/folders/:id → { message }
```

---

## Invoices & Time Entries

```
GET    /api/v1/invoices              → { invoices: [...] }
POST   /api/v1/invoices              → { invoice }
PUT    /api/v1/invoices/:id          → { invoice }
DELETE /api/v1/invoices/:id          → { message }

GET    /api/v1/time-entries          → { timeEntries: [...] }
POST   /api/v1/time-entries          → { timeEntry }
PUT    /api/v1/time-entries/:id      → { timeEntry }
DELETE /api/v1/time-entries/:id      → { message }
```

---

## Legal Research

### Search Legal Data
```
GET /api/v1/legal/search
Auth: Optional (enhanced results with auth)
Query: ?q=search_term&type=acts|cases&page=1

Response 200: { results: [...], total }
```

### Legal Sections
```
GET /api/v1/legal-sections
Auth: Required
Query: ?actId=...&search=...

Response 200: { sections: [...] }
```

---

## Subscriptions

### Get Current Plan
```
GET /api/v1/subscription/current
Auth: Required
Response 200: { subscription, plan }
```

### Validate Coupon
```
POST /api/v1/subscription/validate-coupon
Auth: Required | CSRF: Required
{ "couponCode": "string" }
Response 200: { valid, discount }
```

---

## Payments

### Create Subscription
```
POST /api/v1/payment/subscribe
Auth: Required | CSRF: Required
{ "planId": "string", "couponCode": "string (optional)" }
Response 200: { subscriptionId, razorpaySubscriptionId }
```

### Webhook (Razorpay → Juriq)
```
POST /api/v1/payment/webhook
Headers: X-Razorpay-Signature: HMAC-SHA256
Body: Raw JSON (Razorpay event payload)
Response 200: { ok: true }
```

This endpoint is exempt from rate limiting and CSRF. Signature is verified via HMAC.

---

## 2FA (Two-Factor Authentication)

```
POST /api/v1/2fa/setup     → { qrCode, secret }
POST /api/v1/2fa/verify    → { verified: true }
POST /api/v1/2fa/disable   → { message }
```

---

## Admin

```
GET    /api/v1/admin/users           → Admin user list
POST   /api/v1/admin/users/:id/ban   → Ban user
GET    /api/v1/admin/audit-log       → Audit trail
```

Rate limit: 50 requests per hour per IP.

---

## Dashboard

```
GET /api/v1/dashboard
Auth: Required
Response 200: { stats, recentActivity, upcomingHearings }
```

---

## Alerts

```
GET    /api/v1/alerts                → { alerts: [...] }
PUT    /api/v1/alerts/:id/read       → { alert }
DELETE /api/v1/alerts/:id            → { message }
```

---

## Health & Metrics

```
GET /health                          → { status, uptime, database }
GET /api/v1/health                   → { ok, redis, uptime, environment }
GET /api/v1/metrics                  → Prometheus text format
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable description"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — validation failed |
| 401 | Unauthorized — missing/expired token |
| 403 | Forbidden — CSRF failure or insufficient permissions |
| 404 | Not Found |
| 409 | Conflict — duplicate resource |
| 413 | Payload Too Large |
| 429 | Too Many Requests — rate limited |
| 500 | Internal Server Error |

---

## Rate Limits

| Endpoint Group | Window | Max Requests |
|----------------|--------|--------------|
| Global | 15 min | 200 |
| Auth (`/auth/*`) | 15 min | 15 |
| Payment (`/payment/*`) | 15 min | 20 |
| Upload (`/documents/upload`) | 1 hour | 100 |
| Admin (`/admin/*`) | 1 hour | 50 |
| Client error logs | 1 min | 20 |

Rate limit headers are returned on all responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
