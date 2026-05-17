# Authentication Security

See [Auth Flow](../architecture/auth-flow.md) for detailed authentication flow documentation.

## Summary

- JWT access tokens (15 min) + refresh tokens (7 days)
- HttpOnly, Secure, SameSite cookies
- CSRF double-submit cookie with timing-safe comparison
- Account lockout after repeated failures
- Abuse signal detection with IP escalation
- 2FA via TOTP (speakeasy)
- Google OAuth with PKCE
- Security questions (bcrypt-hashed)
- bcrypt password hashing (salt rounds: 12)
- JWT secret minimum 64 chars in production
