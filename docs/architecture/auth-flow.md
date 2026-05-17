# Authentication Flow

## Overview

Juriq uses a **stateless JWT authentication** system with **HttpOnly cookie transport**, **refresh token rotation**, **CSRF double-submit protection**, and optional **2FA (TOTP)**.

## Login Flow

```
┌──────────┐                              ┌──────────────┐
│  Client   │  1. GET /auth/csrf-token     │  API Server   │
│  (React)  │ ────────────────────────────▶│              │
│           │  ◀──── csrf-token cookie ────│              │
│           │                              │              │
│           │  2. POST /auth/login         │              │
│           │  { email, password }         │              │
│           │ ────────────────────────────▶│              │
│           │                              │  bcrypt      │
│           │                              │  compare     │
│           │  ◀──── Set-Cookie:           │              │
│           │    access_token (15m)        │              │
│           │    refresh_token (7d)        │              │
│           │    csrf-token (24h)          │              │
│           │  Body: { user }             │              │
└──────────┘                              └──────────────┘
```

## Token Strategy

| Token | Type | Storage | Duration | HttpOnly | Purpose |
|-------|------|---------|----------|----------|---------|
| Access | JWT | Cookie | 15 min | Yes | API authorization |
| Refresh | JWT | Cookie | 7 days | Yes | Silent token renewal |
| CSRF | Random hex | Cookie | 24 hours | No | CSRF protection |

## Refresh Flow

When the access token expires (401 response):

1. Frontend interceptor catches 401
2. Sends `POST /auth/refresh` (refresh token in cookie)
3. Server validates refresh token, issues new access token
4. Original request is retried with new token
5. If refresh also fails → redirect to `/login`

## CSRF Protection

**Strategy**: Double-Submit Cookie

1. Server sets `csrf-token` cookie (non-HttpOnly, so JS can read it)
2. Frontend reads cookie value via `document.cookie`
3. Frontend sends `X-CSRF-Token: {value}` header on all POST/PUT/PATCH/DELETE
4. Server compares header vs cookie with `crypto.timingSafeEqual`
5. Exempt routes: login, register, refresh, forgot-password, OAuth callbacks

## Google OAuth

```
Client → GET /auth/google → 302 → Google Consent Screen
                                        │
                                        ▼
Google → GET /auth/google/callback?code=...&state=...
                        │
                        ▼
              Server validates code → Creates/finds user
                        │
                        ▼
              Set auth cookies → 302 redirect to /dashboard
```

## 2FA (TOTP)

1. `POST /2fa/setup` → Server generates TOTP secret, returns QR code
2. User scans QR with authenticator app
3. `POST /2fa/verify` with TOTP code → Enables 2FA
4. On subsequent logins: after password verified, server requires TOTP code
5. `POST /2fa/disable` with TOTP code → Disables 2FA

## Account Security

- **Lockout**: After N failed login attempts, account is temporarily locked
- **Abuse Detection**: `abuseDetection.js` middleware tracks suspicious patterns
- **Security Questions**: Optional secondary recovery mechanism (bcrypt-hashed answers)
- **Session Management**: Refresh tokens can be revoked via Redis blacklist
