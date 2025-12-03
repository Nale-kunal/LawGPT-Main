// Example Firebase modular client SDK initialiser.
// This file is not imported by the backend; it is provided as a reference
// for frontend usage if you decide to talk directly to Firebase from React.

// Import the modular SDK only on the client side.
// eslint-disable-next-line import/no-unresolved
import { initializeApp, getApps } from 'firebase/app';

let app;

export function initClientFirebase() {
  if (app) return app;

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.projectId) {
    console.warn('[firebase/client] Missing basic Firebase client config, skipping init.');
    return null;
  }

  if (!getApps().length) {
    app = initializeApp(config);
  }

  return app;
}

export default initClientFirebase;


