/**
 * restoreBackup.mjs — Backup restore CLI (spec #3)
 *
 * Usage:
 *   node restoreBackup.mjs ./backups/backup-2024-01-01.json [--dry-run] [--collection users,subscriptions]
 *
 * Restore strategy:
 *   - Uses $setOnInsert via upsert to avoid overwriting newer records
 *   - Dry-run mode: validates file, counts records, makes NO DB changes
 *   - PaymentLog replay: rebuilds expected subscription states and compares to stored states
 */

import dotenv from 'dotenv';
dotenv.config();

import fs        from 'fs';
import path      from 'path';
import mongoose  from 'mongoose';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const backupFile  = args.find(a => !a.startsWith('--'));
const isDryRun    = args.includes('--dry-run');
const collections = args.find(a => a.startsWith('--collection='))?.split('=')[1]?.split(',') || null;

if (!backupFile) {
  console.error('Usage: node restoreBackup.mjs <backup-file.json> [--dry-run] [--collection=users,subscriptions]');
  process.exit(1);
}

// ── Load backup file ──────────────────────────────────────────────────────────
const filePath = path.resolve(backupFile);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

let backup;
try {
  backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error(`Failed to parse backup file: ${e.message}`);
  process.exit(1);
}

console.log(`\n📦 Backup file: ${filePath}`);
console.log(`📅 Exported at: ${backup.exportedAt}`);
console.log(`📊 Record counts:`, backup.counts);
if (isDryRun) console.log(`\n⚠️  DRY RUN — no database changes will be made\n`);
if (collections) console.log(`🔍 Restoring only: ${collections.join(', ')}\n`);

// ── Connect DB ────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

await mongoose.connect(MONGO_URI);
console.log('✅ MongoDB connected\n');

// ── Import models (must be after connect) ────────────────────────────────────
const { default: User }         = await import('./src/models/User.js');
const { default: Subscription } = await import('./src/models/Subscription.js');
const { default: PaymentLog }   = await import('./src/models/PaymentLog.js');
const { default: RefundLog }    = await import('./src/models/RefundLog.js');

// ── Restore helper ────────────────────────────────────────────────────────────
async function restoreCollection(Model, records, name) {
  if (collections && !collections.includes(name)) {
    console.log(`⏭️  Skipping ${name} (not in --collection filter)`);
    return;
  }
  if (!records?.length) {
    console.log(`⚠️  ${name}: 0 records — skipping`);
    return;
  }

  console.log(`🔄 Restoring ${name}: ${records.length} records...`);

  if (isDryRun) {
    console.log(`   [DRY RUN] Would upsert ${records.length} ${name} records`);
    return;
  }

  let ok = 0, skip = 0, fail = 0;
  for (const doc of records) {
    try {
      const result = await Model.updateOne(
        { _id: doc._id },
        { $setOnInsert: doc },  // only inserts if _id doesn't exist yet
        { upsert: true }
      );
      if (result.upsertedCount) ok++;
      else skip++;
    } catch (err) {
      fail++;
      if (fail <= 5) console.error(`   ❌ ${name} restore error:`, err.message);
    }
  }
  console.log(`   ✅ ${name}: inserted=${ok}  already_existed=${skip}  failed=${fail}`);
}

// ── Run restores ──────────────────────────────────────────────────────────────
await restoreCollection(User,         backup.users,         'users');
await restoreCollection(Subscription, backup.subscriptions, 'subscriptions');
await restoreCollection(PaymentLog,   backup.paymentLogs,   'paymentLogs');
await restoreCollection(RefundLog,    backup.refundLogs,    'refundLogs');

// ── PaymentLog Replay Verification ───────────────────────────────────────────
console.log('\n🔍 PaymentLog replay verification...');
const processedEvents = backup.paymentLogs?.filter(e => e.status === 'processed' && e.eventType === 'subscription.charged') || [];
const activatedSubs   = new Set(processedEvents.map(e => e.razorpaySubscriptionId?.toString()).filter(Boolean));

let mismatches = 0;
for (const rzpSubId of activatedSubs) {
  const sub = backup.subscriptions?.find(s => s.razorpaySubscriptionId === rzpSubId);
  if (sub && !['active', 'cancelled', 'completed'].includes(sub.status)) {
    console.warn(`  ⚠️  Mismatch: PaymentLog shows activation for ${rzpSubId} but sub.status=${sub.status}`);
    mismatches++;
  }
}
if (mismatches === 0) {
  console.log(`  ✅ PaymentLog replay: all ${activatedSubs.size} activated subscriptions consistent`);
} else {
  console.warn(`  ⚠️  ${mismatches} state mismatches found — review before deploying restored data`);
}

console.log('\n🎉 Restore complete\n');
await mongoose.disconnect();
