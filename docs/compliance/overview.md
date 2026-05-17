# Compliance Overview

## Relevant Regulations

### Information Technology Act, 2000 (India)
- Section 43A: Reasonable security practices for sensitive personal data
- Section 72A: Penalty for disclosure of information in breach of lawful contract
- IT (Reasonable Security Practices and Procedures) Rules, 2011

### Bar Council of India Rules
- Duty of confidentiality to clients
- Professional ethics regarding client data

### General Data Protection
- Data minimization: collect only necessary information
- Purpose limitation: use data only for stated purposes
- Storage limitation: retain data only as long as necessary
- Data subject rights: deletion on request

## Juriq Compliance Measures

| Requirement | Implementation |
|-------------|----------------|
| Data encryption in transit | HTTPS enforced, HSTS preload |
| Data encryption at rest | MongoDB Atlas encryption, Cloudinary AES-256 |
| Access control | Owner-scoped queries, RBAC, JWT auth |
| Audit trail | Immutable AuditLog and AdminAuditLog |
| Data deletion | `userDeletionService.js` with cascade delete |
| Password security | bcrypt (salt 12), minimum length validation |
| Breach notification | Sentry alerts, structured logging |
| Data retention | 14-day auto-purge for error logs, configurable retention |

## Disclaimer

This document is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for compliance guidance specific to your jurisdiction.
