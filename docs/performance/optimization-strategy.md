# Performance Optimization Strategy

## Backend Optimizations
- **MongoDB indexes**: Compound indexes for all frequent query patterns
- **Redis caching**: Plan data, rate limits avoid repeated DB queries
- **Compression**: gzip via `compression` middleware
- **Connection pooling**: Mongoose default connection pool
- **Worker offloading**: Email, cleanup, admin tasks via BullMQ (non-blocking)
- **Lazy imports**: Reconciliation service loaded dynamically on startup

## Frontend Optimizations
- **Code splitting**: All pages lazy-loaded via `React.lazy`
- **Tree shaking**: Vite automatically removes unused code
- **Image optimization**: Cloudinary auto-format and quality
- **Bundle analysis**: Run `npx vite-bundle-analyzer` to audit
- **TanStack Query**: Prevents redundant API calls with smart caching

## Caching Documentation
See [Caching Strategy](../database/caching-strategy.md) for full caching documentation.
