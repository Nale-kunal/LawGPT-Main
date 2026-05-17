# ADR-0002: Authentication Strategy

## Status: Accepted

## Context
Need secure, stateless authentication that works with cross-origin SPA deployment (frontend on Vercel, backend on Railway).

## Decision
JWT access tokens (15 min) + refresh tokens (7 days) in HttpOnly cookies. CSRF double-submit cookie pattern. Optional TOTP 2FA. Google OAuth with state validation.

## Consequences
- Stateless — no session store needed
- Short-lived access tokens limit breach window
- Refresh tokens allow seamless re-authentication
- CSRF protection prevents cross-site request forgery
- HttpOnly cookies prevent XSS token theft
- Account lockout + abuse detection prevents brute force
