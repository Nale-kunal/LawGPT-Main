# Backups

Database backup storage directory.

## Backup Strategy

1. **MongoDB Atlas**: Automated daily snapshots (managed by Atlas)
2. **Local backups**: `npm run restore-backup` in backend for manual restore
3. **Backup script**: `backend/restoreBackup.mjs`

## Retention Policy

| Backup Type | Retention |
|-------------|-----------|
| Atlas daily snapshots | 7 days (free tier) |
| Manual backups | Store here, manage manually |
| Payment records | 7 years (Indian tax compliance) |

## Usage

```bash
# Restore from backup
cd backend && npm run restore-backup
```
