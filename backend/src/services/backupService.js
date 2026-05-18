/**
 * backupService.js — Daily snapshot export for recovery (spec #10)
 *
 * Exports Users, Subscriptions, PaymentLog, RefundLog to JSON files
 * in the /backups directory. Files are named by date.
 *
 * Recovery: replay PaymentLog to rebuild subscription states.
 */

import fs       from 'fs';
import path     from 'path';
import User         from '../models/User.js';
import Subscription from '../models/Subscription.js';
import PaymentLog   from '../models/PaymentLog.js';
import RefundLog    from '../models/RefundLog.js';
import logger       from '../utils/logger.js';

const BACKUP_DIR = path.resolve('backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run backup
// ─────────────────────────────────────────────────────────────────────────────
async function runBackup() {
  try {
    ensureBackupDir();
    const date    = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
    const outFile = path.join(BACKUP_DIR, `backup-${date}.json`);

    logger.info({ outFile }, 'Backup: starting daily snapshot');

    // Collect data — lean() keeps memory low
    const [users, subscriptions, paymentLogs, refundLogs] = await Promise.all([
      User.find({}).select('-passwordHash -securityAnswerHash').lean(),
      Subscription.find({}).lean(),
      PaymentLog.find({}).lean(),
      RefundLog.find({}).lean(),
    ]);

    const snapshot = {
      exportedAt:    new Date().toISOString(),
      counts: {
        users:         users.length,
        subscriptions: subscriptions.length,
        paymentLogs:   paymentLogs.length,
        refundLogs:    refundLogs.length,
      },
      users,
      subscriptions,
      paymentLogs,
      refundLogs,
    };

    fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
    logger.info({ outFile, counts: snapshot.counts }, 'Backup: daily snapshot complete');

    // Prune backups older than 30 days
    _pruneOldBackups(30);

  } catch (err) {
    logger.error({ err }, 'Backup: FATAL error — backup job continues next run');
  }
}

function _pruneOldBackups(keepDays) {
  try {
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    const files  = fs.readdirSync(BACKUP_DIR);
    for (const f of files) {
      const fp  = path.join(BACKUP_DIR, f);
      const mtime = fs.statSync(fp).mtimeMs;
      if (mtime < cutoff) {
        fs.unlinkSync(fp);
        logger.info({ file: f }, 'Backup: pruned old backup file');
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Backup: pruning old files failed (non-fatal)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Start daily backup cron
// ─────────────────────────────────────────────────────────────────────────────
export function startBackupJob() {
  // Run at 2 AM every day (offset from startup to avoid startup congestion)
  const msUntil2am = (() => {
    const now   = new Date();
    const next  = new Date(now);
    next.setHours(2, 0, 0, 0);
    if (next <= now) { next.setDate(next.getDate() + 1); }
    return next.getTime() - now.getTime();
  })();

  setTimeout(() => {
    runBackup();
    setInterval(runBackup, 24 * 60 * 60 * 1000);
  }, msUntil2am);

  logger.info({ msUntilFirst: msUntil2am }, 'Backup job scheduled (daily at 2 AM)');
}

export { runBackup };
