# Data Retention Policy

## Retention Periods

| Data Type | Retention | Mechanism |
|-----------|-----------|-----------|
| User accounts | Until deletion request | Manual via `userDeletionService.js` |
| Case data | Indefinite (user-owned) | Owner-managed |
| Client error logs | 14 days | Auto-purge via daily cleanup |
| Audit logs | 2 years | Compliance requirement |
| Session tokens | 7 days (refresh) | Redis TTL / cleanup worker |
| Rate limit data | Window-based (15 min – 1 hour) | Redis TTL |
| Payment records | 7 years | Indian tax compliance |
| Expired CSRF tokens | 24 hours | Cookie expiry |

## Deletion Process

User data deletion is handled by `userDeletionService.js`:
1. Soft-delete user account
2. Cascade delete owned cases, clients, documents
3. Remove Cloudinary media assets
4. Purge Redis cache entries
5. Cancel active subscriptions
6. Log deletion in audit trail
