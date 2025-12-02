import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, isAbsolute } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseApp = null;

function parseServiceAccount(jsonString, source) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Invalid Firebase service account JSON from ${source}:`, error.message);
    throw error;
  }
}

function loadServiceAccountFromPath() {
  const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!rawPath) {
    return null;
  }

  const normalizedRelativePath = rawPath.replace(/^\.\/+/, '');
  const candidatePaths = new Set();

  if (isAbsolute(rawPath)) {
    candidatePaths.add(rawPath);
  } else {
    candidatePaths.add(resolve(process.cwd(), rawPath));
    candidatePaths.add(resolve(process.cwd(), normalizedRelativePath));
    candidatePaths.add(resolve(__dirname, rawPath));
    candidatePaths.add(resolve(__dirname, normalizedRelativePath));
    candidatePaths.add(resolve(__dirname, '..', rawPath));
    candidatePaths.add(resolve(__dirname, '..', normalizedRelativePath));
    candidatePaths.add(resolve(__dirname, '..', '..', normalizedRelativePath));
  }

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      const serviceAccount = parseServiceAccount(readFileSync(candidate, 'utf8'), `file (${candidate})`);
      console.log(`Firebase service account loaded from ${candidate}`);
      return serviceAccount;
    }
  }

  console.warn(`Firebase service account file not found at "${rawPath}". Checked paths: ${Array.from(candidatePaths).join(', ')}`);
  return null;
}

function loadServiceAccountFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT, 'FIREBASE_SERVICE_ACCOUNT');
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return parseServiceAccount(decoded, 'FIREBASE_SERVICE_ACCOUNT_BASE64');
  }

  return null;
}

function loadServiceAccountFromIndividualEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!(projectId && (privateKey || privateKeyBase64) && clientEmail)) {
    return null;
  }

  if (!privateKey && privateKeyBase64) {
    privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
  }

  return {
    projectId,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    clientEmail,
  };
}

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    let serviceAccount = loadServiceAccountFromPath();

    if (!serviceAccount) {
      serviceAccount = loadServiceAccountFromEnv();
    }

    if (!serviceAccount) {
      serviceAccount = loadServiceAccountFromIndividualEnv();
    }

    if (!serviceAccount) {
      throw new Error(
        'Firebase configuration not found. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_PROJECT_ID/FIREBASE_PRIVATE_KEY/FIREBASE_CLIENT_EMAIL.'
      );
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

export function getFirebaseAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

// Verify Firebase ID token
export async function verifyFirebaseToken(idToken) {
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
}

// Create custom token (for testing or special cases)
export async function createCustomToken(uid, additionalClaims = {}) {
  try {
    const auth = getFirebaseAuth();
    const customToken = await auth.createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw error;
  }
}

// Get user by UID
export async function getUserByUid(uid) {
  try {
    const auth = getFirebaseAuth();
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Create user in Firebase Auth
export async function createFirebaseUser(email, password, displayName = null, customClaims = {}) {
  try {
    const auth = getFirebaseAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    // Set custom claims if provided
    if (Object.keys(customClaims).length > 0) {
      await auth.setCustomUserClaims(userRecord.uid, customClaims);
    }

    return userRecord;
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    throw error;
  }
}

// Update user in Firebase Auth
export async function updateFirebaseUser(uid, updates) {
  try {
    const auth = getFirebaseAuth();
    const userRecord = await auth.updateUser(uid, updates);
    return userRecord;
  } catch (error) {
    console.error('Error updating Firebase user:', error);
    throw error;
  }
}

// Delete user from Firebase Auth
export async function deleteFirebaseUser(uid) {
  try {
    const auth = getFirebaseAuth();
    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    console.error('Error deleting Firebase user:', error);
    throw error;
  }
}

// Get Firestore instance
export function getFirestore() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

export default admin;

