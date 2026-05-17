# ADR-0004: Worker Architecture

## Status: Accepted

## Context
Background tasks (email, cleanup, admin operations) should not block API request processing.

## Decision
BullMQ workers in a separate Node.js process sharing the same Redis connection. Three specialized workers: email, admin, cleanup.

## Consequences
- API server stays fast — heavy operations offloaded
- Workers scale independently (separate container/dyno)
- Redis provides reliable job persistence
- Graceful shutdown prevents job loss
- Workers require `REDIS_URL` (no in-memory fallback for workers)
