# API Endpoints Reference

See [API_REFERENCE.md](../../API_REFERENCE.md) for the complete API documentation.

## Quick Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/health` | No | Health check |
| GET | `/api/v1/auth/csrf-token` | No | Get CSRF token |
| POST | `/api/v1/auth/register` | No | Register |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh token |
| POST | `/api/v1/auth/logout` | Cookie | Logout |
| GET | `/api/v1/auth/me` | JWT | Current user |
| GET/POST/PUT/DELETE | `/api/v1/cases` | JWT | Case CRUD |
| GET/POST/PUT/DELETE | `/api/v1/clients` | JWT | Client CRUD |
| GET/POST/PUT/DELETE | `/api/v1/hearings` | JWT | Hearing CRUD |
| GET/POST/DELETE | `/api/v1/documents/*` | JWT | Document management |
| GET/POST/PUT/DELETE | `/api/v1/invoices` | JWT | Invoice CRUD |
| GET | `/api/v1/legal/search` | Optional | Legal search |
| GET | `/api/v1/subscription/current` | JWT | Current plan |
| POST | `/api/v1/payment/subscribe` | JWT | Subscribe |
| POST | `/api/v1/payment/webhook` | HMAC | Razorpay webhook |
