# Incident Response Plan

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P0 — Critical | System down, data breach | < 1 hour | Auth bypass, data leak, payment compromise |
| P1 — High | Major feature broken | < 4 hours | Payment failures, auth issues |
| P2 — Medium | Degraded performance | < 24 hours | Slow queries, rate limit issues |
| P3 — Low | Minor issue | < 1 week | UI bug, non-critical warning |

## Response Procedure

### 1. Detection
- Sentry alerts for error spikes
- Prometheus alerts for anomalous metrics
- User reports via support
- Automated security scans

### 2. Triage
- Assess severity level
- Identify affected components
- Determine blast radius (users affected)

### 3. Containment
- Enable maintenance mode if needed
- Revoke compromised credentials
- Block malicious IPs via Redis
- Disable affected endpoints

### 4. Resolution
- Deploy hotfix
- Verify fix in staging
- Deploy to production
- Monitor for recurrence

### 5. Post-Incident
- Root cause analysis (RCA)
- Update ADR with lessons learned
- Improve detection/prevention
- Communicate to affected users

## Contacts

| Role | Contact |
|------|---------|
| Security Lead | security@juriq.in |
| Engineering Lead | engineering@juriq.in |
| Operations | ops@juriq.in |
