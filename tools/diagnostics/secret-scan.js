/**
 * Secret Scanner
 *
 * Scans the codebase for potential hardcoded secrets.
 * Does NOT scan .env files (those are gitignored).
 * Does NOT scan itself or example/documentation files.
 *
 * Usage: node tools/diagnostics/secret-scan.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve, basename } from 'path';

// Patterns require a COMPLETE token match — not just a prefix used in comments,
// error messages, or validation logic. Each regex is anchored to the full format
// of the real credential so that documentation strings don't trigger false positives.
const PATTERNS = [
  // Razorpay: full key is prefix (10 chars) + 14 alphanumeric chars = 24 chars total
  { name: 'Razorpay Live Key', pattern: /\brzp_live_[a-zA-Z0-9]{14}\b/g },
  { name: 'Razorpay Test Key', pattern: /\brzp_test_[a-zA-Z0-9]{14}\b/g },
  // SendGrid: SG. + 22 chars + . + 43 chars
  { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g },
  // MongoDB URI: only flag when actual credentials are embedded (not process.env references)
  { name: 'MongoDB URI with password', pattern: /mongodb(\+srv)?:\/\/(?!process\.env)[^:'"` ]+:[^@'"` ]+@[^/'" ]+/g },
  // AWS IAM key (20 chars total after AKIA prefix)
  { name: 'AWS Access Key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  // PEM private keys
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
  // Signed JWT tokens (three base64url segments — real tokens only, not mocks)
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g },
];

// Directories to skip entirely
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.turbo',
  'tools',   // skip the scanner directory itself
  'backups',
]);

// File extensions to scan
const SCAN_EXTS = new Set(['.js', '.ts', '.tsx', '.jsx', '.json', '.yml', '.yaml']);

// Lines that are clearly documentation / validation logic — not real credentials.
// If a match line contains any of these strings, skip it.
const ALLOWLISTED_PATTERNS = [
  /errors\.push\(/,           // validation error messages
  /console\.(warn|log|error)/, // log messages
  /\/\/.*rzp_/,               // inline comments
  /#.*rzp_/,                  // shell comments
  /startsWith\(/,             // prefix checks like .startsWith('rzp_live_')
  /pattern\s*[:=]/,           // pattern definitions (like this file)
  /regex\s*[:=]/i,            // regex definitions
  /description.*rzp/i,        // documentation strings
  /must start with/i,         // validation hint messages
  /example/i,                 // example strings
];

function isAllowlisted(line) {
  return ALLOWLISTED_PATTERNS.some((p) => p.test(line));
}

const SELF = resolve(import.meta.url.replace('file:///', '').replace('file://', ''));

function scanDir(dir) {
  let findings = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      findings += scanDir(full);
    } else if (
      SCAN_EXTS.has(extname(entry)) &&
      !entry.includes('.example') &&
      !entry.includes('.test.') &&
      !entry.includes('.spec.') &&
      resolve(full) !== SELF
    ) {
      const lines = readFileSync(full, 'utf-8').split('\n');
      for (const { name, pattern } of PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Reset regex state
          pattern.lastIndex = 0;
          if (pattern.test(line) && !isAllowlisted(line)) {
            console.warn(`⚠️  [${name}] ${full}:${i + 1}: ${line.trim()}`);
            findings++;
          }
          pattern.lastIndex = 0;
        }
      }
    }
  }
  return findings;
}

console.log('🔍 Scanning for hardcoded secrets...\n');
const total = scanDir('.');
if (total === 0) {
  console.log('\n✅ No hardcoded secrets detected');
} else {
  console.log(`\n❌ ${total} potential secret(s) found — review immediately!`);
  process.exit(1);
}
