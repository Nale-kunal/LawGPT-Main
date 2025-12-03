import test from 'node:test';
import assert from 'node:assert/strict';
import { getFirebaseWebApiKey } from '../src/utils/env.js';

const ORIGINAL_ENV = { ...process.env };

test('getFirebaseWebApiKey prefers FIREBASE_WEB_API_KEY', () => {
  process.env.FIREBASE_WEB_API_KEY = 'web-key';
  process.env.FIREBASE_API_KEY = 'fallback-key';

  assert.equal(getFirebaseWebApiKey(), 'web-key');
});

test('getFirebaseWebApiKey falls back to FIREBASE_API_KEY', () => {
  delete process.env.FIREBASE_WEB_API_KEY;
  process.env.FIREBASE_API_KEY = 'fallback-key-only';

  assert.equal(getFirebaseWebApiKey(), 'fallback-key-only');
});

test('getFirebaseWebApiKey returns empty string when neither key is set', () => {
  delete process.env.FIREBASE_WEB_API_KEY;
  delete process.env.FIREBASE_API_KEY;

  assert.equal(getFirebaseWebApiKey(), '');
});

test.after(() => {
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  });
  Object.entries(ORIGINAL_ENV).forEach(([key, value]) => {
    process.env[key] = value;
  });
});

