/**
 * Utility helpers for environment-dependent configuration.
 * These helpers centralize env parsing logic so tests can cover it.
 */

const LOWERCASE_PROD = 'production';

export function getFirebaseWebApiKey() {
  const key = (process.env.FIREBASE_WEB_API_KEY || '').trim();
  if (key) {
    return key;
  }
  return (process.env.FIREBASE_API_KEY || '').trim();
}

export function ensureFirebaseWebApiKey({ requireInProduction = true } = {}) {
  const key = getFirebaseWebApiKey();
  if (key) {
    return key;
  }

  const isProd = (process.env.NODE_ENV || '').toLowerCase() === LOWERCASE_PROD;
  const shouldThrow = requireInProduction && isProd;
  const message = 'FIREBASE_WEB_API_KEY (or FIREBASE_API_KEY) is required for password-based login.';

  if (shouldThrow) {
    throw new Error(message);
  }

  console.warn(`⚠️  ${message} Current NODE_ENV=${process.env.NODE_ENV || 'undefined'}.`);
  return '';
}


