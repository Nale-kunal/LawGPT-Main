/**
 * Environment Variable Validator
 *
 * Validates that all required environment variables are set
 * without starting the full application.
 *
 * Usage: node tools/diagnostics/env-validate.js
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const envExamplePath = resolve('backend/.env.example');
const envPath = resolve('backend/.env');

try {
  const example = readFileSync(envExamplePath, 'utf-8');
  let env;
  try {
    env = readFileSync(envPath, 'utf-8');
  } catch {
    console.error('❌ backend/.env file not found. Copy from .env.example:');
    console.error('   cp backend/.env.example backend/.env');
    process.exit(1);
  }

  const requiredVars = example
    .split('\n')
    .filter(line => line.match(/^[A-Z_]+=/) && !line.startsWith('#'))
    .map(line => line.split('=')[0]);

  const envVars = new Set(
    env
      .split('\n')
      .filter(line => line.match(/^[A-Z_]+=/) && !line.startsWith('#'))
      .map(line => line.split('=')[0])
  );

  let missing = 0;
  for (const key of requiredVars) {
    if (!envVars.has(key)) {
      console.warn(`⚠️  Missing: ${key}`);
      missing++;
    }
  }

  if (missing === 0) {
    console.log('✅ All environment variables are set');
  } else {
    console.log(`\n${missing} variable(s) missing from backend/.env`);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
