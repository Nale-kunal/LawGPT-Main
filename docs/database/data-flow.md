# Data Flow

## Request Lifecycle

```
Browser → Vercel CDN → React SPA → Axios (with CSRF + auth cookies)
                                        │
                                        ▼
                              Express API Server
                                        │
                              ┌─────────┼─────────┐
                              │ Middleware Stack    │
                              │ (14 layers)        │
                              └─────────┼─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Route Handler       │
                              │ (Zod validation)   │
                              └─────────┼─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Service Layer       │
                              │ (Business logic)   │
                              └─────────┼─────────┘
                                        │
                       ┌────────────────┼────────────────┐
                       │                │                │
                ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
                │  MongoDB     │  │   Redis      │  │ Cloudinary  │
                │  (Mongoose)  │  │  (ioredis)   │  │  (Media)    │
                └─────────────┘  └─────────────┘  └─────────────┘
```

## Write Path
1. Client sends POST/PUT/DELETE with CSRF header
2. Middleware validates auth, CSRF, rate limit, input
3. Service layer executes business logic
4. Mongoose model saves to MongoDB
5. Activity/audit logged
6. Response returned to client

## Read Path
1. Client sends GET with auth cookie
2. Middleware validates auth
3. Service layer queries MongoDB (owner-scoped)
4. Data returned to client (no caching on API responses)
