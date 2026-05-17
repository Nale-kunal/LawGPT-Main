# Infrastructure Security

## Secrets Management
- All secrets in environment variables (never committed)
- `.env` files in `.gitignore`
- Startup validation fails fast on missing required secrets
- `.env.example` contains only placeholder values

## Network Security
- HTTPS enforced in production (301 redirect)
- HSTS with 2-year max-age, preload
- CORS whitelist-only
- Helmet security headers

## Container Security
- `.dockerignore` excludes `.env`, `.git`, `node_modules`
- Non-root user in Dockerfiles
- Multi-stage builds to minimize image size
- Health checks on all services

## Monitoring
- Prometheus metrics at `/api/v1/metrics`
- Sentry error tracking
- Structured Pino logging (JSON)
- Audit trail for admin operations
