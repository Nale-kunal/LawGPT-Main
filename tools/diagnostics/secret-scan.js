/**
 * Secret Scanner
 *
 * Scans the codebase for potential hardcoded secrets.
 * Does NOT scan .env files (those are gitignored).
 *
 * Usage: node tools/diagnostics/secret-scan.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const PATTERNS = [
  { name: 'Razorpay Live Key', pattern: /rzp_live_[a-zA-Z0-9]{14}/g },
  { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g },
  { name: 'MongoDB URI with password', pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/]+/g },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo']);
const SCAN_EXTS = new Set(['.js', '.ts', '.tsx', '.jsx', '.json', '.yml', '.yaml', '.md']);

function scanDir(dir) {
  let findings = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      findings += scanDir(full);
    } else if (SCAN_EXTS.has(extname(entry)) && !entry.includes('.example')) {
      const content = readFileSync(full, 'utf-8');
      for (const { name, pattern } of PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          console.warn(`⚠️  ${name} found in ${full}`);
          findings++;
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
