import { getFirestore as getAdminFirestore } from './admin.js';

const db = getAdminFirestore();

/**
 * Create a document in a collection.
 * Returns the created document with its generated id.
 */
export async function createDoc(collection, data) {
  try {
    const ref = await db.collection(collection).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const snap = await ref.get();
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[firebase/createDoc] ${collection}:`, error);
    throw error;
  }
}

/**
 * Get a single document by id.
 */
export async function getDoc(collection, id) {
  try {
    const snap = await db.collection(collection).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[firebase/getDoc] ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Update a document and return the updated data.
 */
export async function updateDoc(collection, id, data) {
  try {
    await db.collection(collection).doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
    return await getDoc(collection, id);
  } catch (error) {
    console.error(`[firebase/updateDoc] ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Delete a document.
 */
export async function deleteDoc(collection, id) {
  try {
    await db.collection(collection).doc(id).delete();
    return true;
  } catch (error) {
    console.error(`[firebase/deleteDoc] ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Run a Firestore transaction.
 * @param {(tx: FirebaseFirestore.Transaction) => Promise<any>} fn
 */
export async function runTransaction(fn) {
  return db.runTransaction(fn);
}

export { db as firestore };


