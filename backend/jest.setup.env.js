/**
 * jest.setup.env.js
 * 
 * Jest setupFiles script — runs before any test modules are imported.
 * Sets the minimum required environment variables so that env.js
 * does not call process.exit(1) when imported transitively by test files.
 * 
 * This file is intentionally kept minimal — it only provides the vars
 * that env.js requires as non-optional. It must not import any app code.
 */

// These must be set BEFORE any module that imports env.js is loaded.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-chars-for-test';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-minimum-32-chars-for-test';
process.env.ADMIN_INTERNAL_SECRET = process.env.ADMIN_INTERNAL_SECRET || 'test-admin-internal-secret-32chars-ok';

// Mark as CI environment so integration tests that require a live DB skip correctly.
// deletionHard.test.js uses `(MONGODB_URI && !isCI) ? describe : describe.skip` —
// setting CI=true ensures it uses describe.skip when no real database is available.
process.env.CI = process.env.CI || 'true';
