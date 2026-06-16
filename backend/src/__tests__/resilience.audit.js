/**
 * resilience.test.js — Phase 7 Resilience Audit
 *
 * Run: node src/__tests__/resilience.test.js
 *
 * Pure file-inspection tests. No DB or network calls required.
 * Validates architectural invariants about error handling patterns.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');

function readSrc(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/**
 * Extract a block of source by finding 'marker' and taking up to 'len' chars.
 */
function extractBlock(src, marker, len = 600) {
  const idx = src.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return src.slice(idx, idx + len);
}

/**
 * Extract precisely the callback body of process.on('eventName', ...) by
 * slicing from the marker to the next process.on() or end of section.
 * Uses indexOf of the next handler as the boundary.
 */
function extractProcessOnBlock(src, eventName, nextMarker) {
  const start = src.indexOf(`process.on('${eventName}'`);
  if (start === -1) {
    return null;
  }
  if (nextMarker) {
    const end = src.indexOf(nextMarker, start + 1);
    return end !== -1 ? src.slice(start, end) : src.slice(start, start + 900);
  }
  return src.slice(start, start + 900);
}

/**
 * Check that 'needle' does NOT appear in 'src' as a live (non-comment) call.
 * Comment lines (starting with //) are stripped before checking.
 */
function notCall(src, needle) {
  const stripped = src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  if (stripped.includes(needle)) {
    throw new Error(`Must NOT contain live call: ${JSON.stringify(needle)}`);
  }
}

function ok(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}
function has(src, needle) {
  ok((src || '').includes(needle), `Missing: ${JSON.stringify(needle)}`);
}
function not(src, needle) {
  ok(!(src || '').includes(needle), `Must NOT contain: ${JSON.stringify(needle)}`);
}

let passed = 0,
  failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

// ─── Load source files ────────────────────────────────────────────────────────
const INDEX = readSrc('index.js');
const WORKERS = readSrc('src/workers/index.js');
const AUTH_JWT = readSrc('src/routes/auth-jwt.js');
const MW_AUTH = readSrc('src/middleware/auth-jwt.js');
const SOCK_AUTH = readSrc('src/community/socket/socketAuth.js');
const MONGO_CFG = readSrc('src/config/mongodb.js');
const DEL_SVC = readSrc('src/services/userDeletionService.js');
const EMAIL_W = readSrc('src/workers/emailWorker.js');
const CRON_W = readSrc('src/workers/cronWorker.js');
const CLEANUP_W = readSrc('src/workers/cleanupWorker.js');
const ADMIN_W = readSrc('src/workers/adminWorker.js');

// ─── Test Suite ───────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  Juriq Backend — Phase 7 Resilience Audit');
console.log('══════════════════════════════════════════════════════════════════════\n');

// ── Group 1: API server process-level handlers ─────────────────────────────────
console.log('Group 1: API server process-level error handlers');

test('TC-R01 — uncaughtException does NOT live-call process.exit()', () => {
  // Slice between uncaughtException and unhandledRejection — this is precisely that handler
  const start = INDEX.indexOf("process.on('uncaughtException'");
  const end = INDEX.indexOf("process.on('unhandledRejection'");
  ok(start !== -1, 'uncaughtException handler must exist');
  const block = INDEX.slice(start, end > start ? end : start + 900);
  has(block, 'logger.error');
  has(block, 'DO NOT');
  // notCall strips comment lines before checking — the "DO NOT call process.exit()" comment
  // will be ignored; only actual live calls trigger failure
  notCall(block, 'process.exit(');
});

test('TC-R02 — unhandledRejection does NOT live-call process.exit()', () => {
  const start = INDEX.indexOf("process.on('unhandledRejection'");
  const end = INDEX.indexOf('} catch (error) {', start);
  ok(start !== -1, 'unhandledRejection handler must exist');
  const block = INDEX.slice(start, end > start ? end : start + 700);
  has(block, 'logger.error');
  has(block, 'DO NOT');
  notCall(block, 'process.exit(');
});

test('TC-R03 — criticalErrorShutdown is defined with process.exit(1)', () => {
  // The function body spans ~400 chars including the closing brace
  const block = extractBlock(INDEX, 'const criticalErrorShutdown', 700);
  ok(block !== null, 'criticalErrorShutdown must be defined');
  has(block, 'process.exit(1)');
  has(block, 'CRITICAL');
});

test('TC-R04 — currentServer.on("error") exits with non-zero code', () => {
  // 1100 chars needed to span the full handler body which includes process.exit at end
  const block = extractBlock(INDEX, "currentServer.on('error'", 1100);
  ok(block !== null, 'currentServer error handler must exist');
  has(block, 'process.exit(1)');
  has(block, 'EADDRINUSE');
  has(block, 'FATAL');
});

test('TC-R05 — startServer catch exits on startup failure', () => {
  has(INDEX, "logger.error({ error }, 'Failed to start server')");
  const block = extractBlock(INDEX, "logger.error({ error }, 'Failed to start server')", 100);
  has(block, 'process.exit(1)');
});

// ── Group 2: Worker process handlers ──────────────────────────────────────────
console.log('\nGroup 2: Worker process error handlers (exit IS correct for workers)');

test('TC-R06 — Worker uncaughtException exits and attempts graceful close', () => {
  const start = WORKERS.indexOf("process.on('uncaughtException'");
  ok(start !== -1, 'Worker uncaughtException handler must exist');
  const end = WORKERS.indexOf("process.on('unhandledRejection'", start);
  const block = WORKERS.slice(start, end > start ? end : start + 700);
  has(block, 'process.exit(1)');
  has(block, 'allSettled');
});

test('TC-R07 — Worker unhandledRejection handler exists and exits', () => {
  const start = WORKERS.indexOf("process.on('unhandledRejection'");
  ok(start !== -1, 'Worker unhandledRejection handler must exist');
  const block = WORKERS.slice(start, start + 500);
  has(block, 'process.exit(1)');
});

test('TC-R08 — Worker shutdown uses Promise.allSettled (not Promise.all)', () => {
  has(WORKERS, 'Promise.allSettled');
  const shutdownBlock = extractBlock(WORKERS, 'const shutdown', 300);
  ok(shutdownBlock !== null, 'shutdown function must exist');
  not(shutdownBlock, 'Promise.all(workers');
});

// ── Group 3: Auth & deletion resilience ────────────────────────────────────────
console.log('\nGroup 3: Auth & account deletion resilience');

test('TC-R09 — GET /validate returns {authenticated:false} on any error', () => {
  const start = AUTH_JWT.indexOf("router.get('/validate'");
  ok(start !== -1, 'validate route must exist');
  const block = AUTH_JWT.slice(start, start + 600);
  has(block, 'try {');
  has(block, 'authenticated: false');
  has(block, 'catch');
});

test('TC-R10 — DELETE /delete-account blacklists token BEFORE clearing cookie', () => {
  const start = AUTH_JWT.indexOf("router.delete('/delete-account'");
  ok(start !== -1, 'delete-account route must exist');
  const block = AUTH_JWT.slice(start, start + 4500);
  has(block, 'blacklistToken(activeToken');
  has(block, 'blacklistToken(activeRefreshToken');
  has(block, 'invalidateUserCache');
  has(block, 'disconnectUserSockets');
  const blacklistPos = block.indexOf('blacklistToken(activeToken');
  const cookieClearPos = block.indexOf("clearCookie('token'");
  ok(blacklistPos < cookieClearPos, 'Token must be blacklisted BEFORE cookie is cleared');
});

test('TC-R11 — requireAuth returns 401 for missing user (no crash)', () => {
  has(MW_AUTH, 'User profile not found');
  has(MW_AUTH, 'return res.status(401)');
  has(MW_AUTH, '} catch (error) {');
  const catchBlock = extractBlock(MW_AUTH, '} catch (error) {', 200);
  has(catchBlock, 'res.status(401)');
});

test('TC-R12 — socketAuth calls next(Error) on all failure paths', () => {
  has(SOCK_AUTH, "next(new Error('SOCKET_AUTH_REQUIRED'))");
  has(SOCK_AUTH, "next(new Error('SOCKET_AUTH_USER_NOT_FOUND'))");
  has(SOCK_AUTH, "next(new Error('SOCKET_AUTH_ERROR'))");
  // The catch clause must call next(Error) not rethrow
  const catchBlock = extractBlock(SOCK_AUTH, '} catch (err) {', 200);
  has(catchBlock, 'next(new Error(');
});

// ── Group 4: DB & transaction safety ──────────────────────────────────────────
console.log('\nGroup 4: Database & transaction safety');

test('TC-R13 — userDeletionService aborts transaction in catch, closes session in finally', () => {
  has(DEL_SVC, 'abortTransaction');
  has(DEL_SVC, 'session.endSession()');
  has(DEL_SVC, 'finally {');
  const finallyIdx = DEL_SVC.lastIndexOf('finally {');
  const finallyBlock = DEL_SVC.slice(finallyIdx, finallyIdx + 100);
  has(finallyBlock, 'endSession');
});

test('TC-R14 — MongoDB error event logs but does NOT exit or rethrow', () => {
  const block = extractBlock(MONGO_CFG, "mongoose.connection.on('error'", 250);
  ok(block !== null, 'Mongoose error event handler must exist');
  has(block, 'logger.error');
  not(block, 'throw');
  not(block, 'process.exit');
});

// ── Group 5: BullMQ job failure safety ────────────────────────────────────────
console.log('\nGroup 5: BullMQ job failure handling');

test('TC-R15 — emailWorker has worker.on("failed") + worker.on("error") handlers', () => {
  has(EMAIL_W, "worker.on('failed'");
  has(EMAIL_W, "worker.on('error'");
});

test('TC-R16 — cronWorker throws on job failure (BullMQ retries automatically)', () => {
  has(CRON_W, 'throw err');
  has(CRON_W, "worker.on('failed'");
});

test('TC-R17 — adminWorker throws on job failure (BullMQ retries automatically)', () => {
  has(ADMIN_W, 'throw error');
});

test('TC-R18 — cleanupWorker has worker.on("failed") handler', () => {
  has(CLEANUP_W, "worker.on('failed'");
});

// ─── Summary ──────────────────────────────────────────────────────────────────
const total = passed + failed;
const pct = total > 0 ? ((passed / total) * 100).toFixed(0) : 0;
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`  Results: ${passed}/${total} passed (${pct}%)`);
if (failed > 0) {
  console.log(`  ⚠️  ${failed} test(s) FAILED — see details above`);
} else {
  console.log('  🎉 All tests passed — implementation is production-safe');
}
console.log('══════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
