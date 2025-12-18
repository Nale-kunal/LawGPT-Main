import admin from 'firebase-admin';
import { initializeFirebase, getFirestore as getExistingFirestore } from '../src/config/firebase.js';

/**
 * Ensure the Firebase Admin App is initialised.
 * Prefer using this helper from scripts and tooling.
 */
export function initAdminApp() {
  // backend/src/config/firebase.js already guards against double init
  return initializeFirebase();
}

/**
 * Get a Firestore Admin instance.
 */
export function getFirestore() {
  // Reuse backend config helper so we honour all existing env loading logic
  return getExistingFirestore();
}

/**
 * Convenience wrapper to access a collection reference.
 * @param {string} name
 */
export function getCollection(name) {
  return getFirestore().collection(name);
}

/**
 * Convenience wrapper to access a document reference.
 * @param {string} collection
 * @param {string} id
 */
export function getDocRef(collection, id) {
  return getCollection(collection).doc(id);
}

export default {
  admin,
  initAdminApp,
  getFirestore,
  getCollection,
  getDocRef,
};


