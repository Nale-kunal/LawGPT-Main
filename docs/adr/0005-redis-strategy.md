# ADR-0005: Redis Strategy

## Status: Accepted

## Context
Need a fast cache/queue layer for rate limiting, job queues, and session data. Must work in development without external dependencies.

## Decision
ioredis client with graceful in-memory fallback. All Redis operations wrapped in try/catch with automatic noop fallback. Workers require Redis (no fallback).

## Consequences
- Development works without Redis installed
- Production gets Redis-backed rate limiting, persistent queues
- Fallback is transparent — application code doesn't need to check availability
- Rate limit data lost on server restart in dev (acceptable tradeoff)
