# API Design Guidelines

## Versioning
- All endpoints under `/api/v1/`
- Backward compatibility routes at `/api/` (90-day migration window)

## URL Conventions
- Resource names are plural: `/cases`, `/clients`, `/hearings`
- Nested resources: `/cases/:caseId/notes/:noteId/attachments`
- Actions as sub-paths: `/auth/login`, `/auth/refresh`

## HTTP Methods
| Method | Purpose | Idempotent |
|--------|---------|-----------|
| GET | Read resource(s) | Yes |
| POST | Create resource | No |
| PUT | Full update | Yes |
| PATCH | Partial update | Yes |
| DELETE | Remove resource | Yes |

## Response Format
```json
// Success
{ "case": { ... } }
{ "cases": [...], "total": 100, "page": 1, "pages": 5 }

// Error
{ "error": "ErrorType", "message": "Human-readable description" }
```

## Status Codes
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request (validation)
- 401: Unauthorized
- 403: Forbidden (CSRF, permissions)
- 404: Not Found
- 409: Conflict
- 429: Rate Limited
- 500: Internal Error
