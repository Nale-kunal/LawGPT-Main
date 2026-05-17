# Database Scaling Strategy

## Current Scale
- MongoDB Atlas M10 cluster (auto-scaling)
- Single replica set
- ~29 collections, compound indexes

## Horizontal Scaling Path

### Phase 1: Read Scaling (Current)
- Compound indexes for all frequent queries
- Redis caching for plan data and rate limits
- CDN for static assets and media (Cloudinary)

### Phase 2: Connection Pooling
- Mongoose default connection pool (5-10 connections)
- Increase to 25-50 connections for higher throughput
- Connection pool monitoring via Prometheus

### Phase 3: Read Replicas
- MongoDB Atlas secondary reads for analytics queries
- `readPreference: secondaryPreferred` for non-critical reads

### Phase 4: Sharding (Future)
- Shard key: `ownerId` (most queries are owner-scoped)
- Collections to shard: Case, Document, Invoice
- Pre-split strategy: hash-based on ownerId

## Index Optimization
- Background index creation (no blocking)
- Covered queries for list operations
- Partial indexes for sparse data (LegalActs, CaseLaws)
- TTL indexes for auto-expiry (ClientErrorLog: 14 days)
