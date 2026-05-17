# Mobile API Guidelines

## Auth Contract

### Cookie-based (Current Web)
```
POST /api/v1/auth/login
→ Sets HttpOnly cookies: accessToken, refreshToken, csrf-token
→ Response: { user: {...} }
```

### Header-based (Future Mobile)
```
POST /api/v1/auth/login
Header: X-Client-Type: mobile
→ Response: { user: {...}, accessToken: "...", refreshToken: "..." }
```

Mobile clients store tokens in secure storage (Keychain/Keystore) and send via:
```
Authorization: Bearer <accessToken>
```

## API Response Standards

### Success (Single Resource)
```json
{ "case": { "_id": "...", "title": "...", ... } }
```

### Success (Collection)
```json
{
  "cases": [...],
  "pagination": { "page": 1, "limit": 20, "total": 45, "pages": 3 }
}
```

### Error
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Case number is required",
  "fields": { "caseNumber": "Required" }
}
```

### HTTP Status Codes
| Code | Meaning | Mobile Handling |
|------|---------|----------------|
| 200 | Success | Display data |
| 201 | Created | Navigate to detail |
| 400 | Bad Request | Show field errors |
| 401 | Unauthorized | Trigger refresh flow |
| 403 | Forbidden | Show upgrade prompt |
| 404 | Not Found | Show empty state |
| 429 | Rate Limited | Show retry-after |
| 500 | Server Error | Show generic error |

## Date/Time Format
- All dates: ISO 8601 (`2024-03-15T10:30:00.000Z`)
- All durations: minutes (integer)
- All currencies: paisa (integer) — display as `amount / 100`
- Timezone: UTC from server, convert to local on client

## Upload Contract
```
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
Body: file (binary), folderId (optional)

→ 201: { "document": { "_id": "...", "fileUrl": "...", "fileName": "..." } }
```

## Subscription Contract
```
GET /api/v1/subscription/current
→ { "plan": "pro", "status": "active", "expiresAt": "2024-12-31T..." }

POST /api/v1/payment/subscribe
Body: { "plan": "premium", "billingCycle": "monthly" }
→ { "orderId": "...", "amount": 99900, "currency": "INR", "keyId": "rzp_..." }
```
