# Error Handling Standards

## Backend
- All route handlers wrapped in try/catch
- Global error handler returns `{ error, message }` format
- Stack traces suppressed in production (`NODE_ENV=production`)
- Unhandled rejections logged but don't crash (graceful degradation)
- Uncaught exceptions trigger graceful shutdown

## Frontend
- API errors caught by Axios interceptors
- 401 → silent token refresh
- 403 → CSRF refresh + retry
- Toast notifications for user-facing errors
- Sentry captures unhandled errors

## Logging
- Use Pino logger (structured JSON)
- Log levels: fatal, error, warn, info, debug, trace
- Never log PII (passwords, tokens, personal data)
- Include `requestId` for correlation
