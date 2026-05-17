# Flutter Migration Preparation

## Current State Assessment

### Already Mobile-Safe ✅
| System | Status | Notes |
|--------|--------|-------|
| JWT auth (HttpOnly cookies) | ✅ Ready | Flutter `dio` supports cookie jars natively |
| Refresh token rotation | ✅ Ready | Standard HTTP flow, no browser dependency |
| REST API endpoints | ✅ Ready | All `/api/v1/*` routes are JSON, no HTML rendering |
| MongoDB schemas | ✅ Ready | No frontend dependency in data layer |
| Razorpay webhooks | ✅ Ready | Server-side only, no client involvement |
| BullMQ workers | ✅ Ready | Backend-only, independent of frontend |
| Cloudinary uploads | ✅ Ready | Direct upload via signed URLs works on any client |
| Rate limiting | ✅ Ready | IP-based, client-agnostic |
| Zod validation | ✅ Ready | Server-side validation, client-agnostic |

### Needs Adaptation ⚠️
| System | Issue | Migration Path |
|--------|-------|---------------|
| CSRF double-submit cookie | Browser-specific pattern | Add token-header auth mode for mobile: `Authorization: Bearer <token>` as alternative to cookies |
| Google OAuth | Uses browser redirect flow | Use Google Sign-In SDK for Flutter → exchange ID token with backend |
| File upload | Uses browser `FormData` | Flutter `MultipartFile` is equivalent — no backend changes needed |
| TOTP 2FA | QR code rendered in React | Flutter has native TOTP/QR libraries — backend endpoints unchanged |
| Plan enforcement | `checkPlanAccess` middleware reads cookies | Already reads JWT from cookie — works if cookie jar is configured |

### React-Specific Logic That Must Change
| Component | React Pattern | Flutter Equivalent |
|-----------|--------------|-------------------|
| `AuthContext` | React Context + cookie | Riverpod/Bloc + secure storage |
| `PlanContext` | SessionStorage + Context | SharedPreferences + Provider |
| `LegalDataContext` | React Query cache | Dio interceptors + local DB |
| `ThemeContext` | CSS variables + localStorage | `ThemeData` + SharedPreferences |
| Route lazy loading | `React.lazy` + Suspense | Go Router + deferred loading |
| Form auto-save | `useFormAutoSave` hook | Local DB draft persistence |
| Toast notifications | shadcn `Toaster` | `flutter_toast` or `SnackBar` |

## Backend Changes Required for Flutter

### Priority 1: Auth Header Support
The backend currently expects auth via HttpOnly cookies. For Flutter, add support for `Authorization: Bearer <accessToken>` header as a secondary auth mechanism:

```javascript
// In auth-jwt.js middleware — already partially supported
// The middleware reads from cookies first, then falls back to header
const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
```

**Current status**: The `auth-jwt.js` middleware already extracts from cookies. Add header fallback if not already present.

### Priority 2: CSRF Bypass for Mobile
Mobile apps don't use cookies the same way. Add a `X-Client-Type: mobile` header that skips CSRF checks when a valid Bearer token is present:

```javascript
// Skip CSRF for authenticated mobile clients
if (req.headers['x-client-type'] === 'mobile' && req.user) {
  return next();
}
```

### Priority 3: Standardized Error Responses
Ensure all error responses follow the same shape:
```json
{ "error": "ERROR_CODE", "message": "Human-readable description" }
```

### Priority 4: Pagination Standardization
Standardize all list endpoints to return:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Effort Estimate

| Phase | Work | Estimate |
|-------|------|----------|
| Backend auth header support | Add Bearer token fallback | 2-4 hours |
| CSRF mobile bypass | Skip for mobile clients | 1-2 hours |
| Flutter project setup | Scaffold + routing + DI | 1-2 days |
| Auth flow (login/register/refresh) | Dio + secure storage | 2-3 days |
| Dashboard + cases CRUD | UI + API integration | 3-5 days |
| Calendar + hearings | Date picker + conflict UI | 2-3 days |
| Documents + uploads | File picker + Cloudinary | 2-3 days |
| Subscription + Razorpay | razorpay_flutter SDK | 1-2 days |
| Legal research | Search UI + results | 2-3 days |
| Settings + 2FA | Profile + TOTP | 1-2 days |
| **Total** | | **~3-4 weeks** |
