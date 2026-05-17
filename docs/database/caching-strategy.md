# Caching Strategy

## Layers

### 1. Redis Cache (Server-side)
- Plan data: `plan:{userId}` — avoids DB lookup on every request
- Rate limit state: Persistent across server restarts
- BullMQ job queues: Reliable job persistence

### 2. HTTP Cache Headers
- Static assets: CDN-cached by Vercel/Cloudflare
- Sitemap: `Cache-Control: public, max-age=86400`
- API responses: No cache (dynamic, user-scoped)

### 3. Client-side Cache
- TanStack Query: `staleTime: 1000ms`, `gcTime: 5 min`
- PlanContext: sessionStorage keyed by userId
- Theme: localStorage (`legal-pro-theme`)

## Cache Invalidation
- Plan cache: Invalidated on webhook subscription events
- Auth state: Cleared on logout (all storage artifacts)
- TanStack Query: `refetchOnWindowFocus: true`

## Future: Redis Cache Expansion
- Case list caching for frequently accessed cases
- Legal search result caching
- Dashboard stats caching (5 min TTL)
