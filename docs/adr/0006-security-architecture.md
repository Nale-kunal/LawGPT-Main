# ADR-0006: Security Architecture

## Status: Accepted

## Context
Legal practice management handles sensitive client data. Indian data protection regulations require robust security.

## Decision
Defense-in-depth: 7 security layers from transport to operational monitoring. Startup validation fails fast on misconfiguration. All queries owner-scoped for multi-tenancy.

## Consequences
- Multiple overlapping security controls
- No single point of failure in security
- Fail-fast startup prevents running with weak configuration
- Owner-scoped queries guarantee data isolation
- Audit trail enables compliance reporting
- Structured logging enables security analysis without PII exposure
