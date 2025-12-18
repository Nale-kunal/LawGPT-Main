/**
 * One-off migration script: MongoDB (Mongoose models) -> Firestore.
 *
 * This does not run in the main API. It is safe to keep Mongo as a source-only
 * dependency just for migration. The running backend already uses Firestore.
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { initAdminApp } from '../firebase/admin.js';
import { createDocument, COLLECTIONS } from '../src/services/firestore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBackendPath(rel) {
  return path.join(__dirname, '..', 'src', rel);
}

async function loadMongooseModels() {
  // Dynamically import all Mongoose models from the legacy backend
  const models = {};
  models.User = (await import(resolveBackendPath('models/User.js'))).default;
  models.Case = (await import(resolveBackendPath('models/Case.js'))).default;
  models.Client = (await import(resolveBackendPath('models/Client.js'))).default;
  models.Document = (await import(resolveBackendPath('models/Document.js'))).default;
  models.Folder = (await import(resolveBackendPath('models/Folder.js'))).default;
  models.Invoice = (await import(resolveBackendPath('models/Invoice.js'))).default;
  models.Hearing = (await import(resolveBackendPath('models/Hearing.js'))).default;
  models.Alert = (await import(resolveBackendPath('models/Alert.js'))).default;
  models.TimeEntry = (await import(resolveBackendPath('models/TimeEntry.js'))).default;
  models.Activity = (await import(resolveBackendPath('models/Activity.js'))).default;
  models.LegalSection = (await import(resolveBackendPath('models/LegalSection.js'))).default;
  return models;
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not set. This script needs read-only access to your legacy MongoDB.');
  }
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB for migration');
}

async function migrateCollection({ model, collectionName, mapDoc }) {
  console.log(`\n▶ Migrating ${collectionName}...`);
  const total = await model.countDocuments();
  console.log(`  Found ${total} records`);

  const cursor = model.find().cursor();
  let migrated = 0;
  for await (const doc of cursor) {
    try {
      const plain = doc.toObject();
      const data = mapDoc(plain);
      await createDocument(collectionName, data);
      migrated += 1;
      if (migrated % 100 === 0) {
        console.log(`  Migrated ${migrated}/${total}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${collectionName} document ${doc._id}:`, error.message);
    }
  }

  console.log(`  ✅ Completed ${collectionName}: ${migrated}/${total} migrated`);
}

async function main() {
  console.log('Starting MongoDB -> Firestore migration...');

  await connectMongo();
  initAdminApp();
  const models = await loadMongooseModels();

  // Simple field-level mappings; Firestore IDs are generated, and we store the
  // legacy Mongo _id as legacyId so nothing is lost.
  await migrateCollection({
    model: models.User,
    collectionName: COLLECTIONS.USERS,
    mapDoc: (u) => ({
      legacyId: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }),
  });

  await migrateCollection({
    model: models.Client,
    collectionName: COLLECTIONS.CLIENTS,
    mapDoc: (c) => ({
      legacyId: String(c._id),
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      notes: c.notes,
      owner: c.owner ? String(c.owner) : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }),
  });

  await migrateCollection({
    model: models.Case,
    collectionName: COLLECTIONS.CASES,
    mapDoc: (k) => ({
      legacyId: String(k._id),
      caseNumber: k.caseNumber,
      clientName: k.clientName,
      opposingParty: k.opposingParty,
      courtName: k.courtName,
      judgeName: k.judgeName,
      hearingDate: k.hearingDate,
      hearingTime: k.hearingTime,
      status: k.status,
      priority: k.priority,
      caseType: k.caseType,
      description: k.description,
      nextHearing: k.nextHearing,
      documents: (k.documents || []).map(String),
      notes: k.notes,
      alerts: (k.alerts || []).map(String),
      owner: k.owner ? String(k.owner) : null,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }),
  });

  await migrateCollection({
    model: models.Document,
    collectionName: COLLECTIONS.DOCUMENTS,
    mapDoc: (d) => ({
      legacyId: String(d._id),
      name: d.name,
      mimetype: d.mimetype,
      size: d.size,
      url: d.url,
      cloudinaryPublicId: d.cloudinaryPublicId,
      resourceType: d.resourceType,
      folderId: d.folderId ? String(d.folderId) : null,
      ownerId: d.ownerId ? String(d.ownerId) : null,
      tags: d.tags || [],
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }),
  });

  await migrateCollection({
    model: models.Folder,
    collectionName: COLLECTIONS.FOLDERS,
    mapDoc: (f) => ({
      legacyId: String(f._id),
      name: f.name,
      parentId: f.parentId ? String(f.parentId) : null,
      ownerId: f.ownerId ? String(f.ownerId) : null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }),
  });

  await migrateCollection({
    model: models.Invoice,
    collectionName: COLLECTIONS.INVOICES,
    mapDoc: (i) => ({
      legacyId: String(i._id),
      ...i,
    }),
  });

  await migrateCollection({
    model: models.Hearing,
    collectionName: COLLECTIONS.HEARINGS,
    mapDoc: (h) => ({
      legacyId: String(h._id),
      ...h,
    }),
  });

  await migrateCollection({
    model: models.Alert,
    collectionName: COLLECTIONS.ALERTS,
    mapDoc: (a) => ({
      legacyId: String(a._id),
      ...a,
    }),
  });

  await migrateCollection({
    model: models.TimeEntry,
    collectionName: COLLECTIONS.TIME_ENTRIES,
    mapDoc: (t) => ({
      legacyId: String(t._id),
      ...t,
    }),
  });

  await migrateCollection({
    model: models.Activity,
    collectionName: COLLECTIONS.ACTIVITIES,
    mapDoc: (a) => ({
      legacyId: String(a._id),
      ...a,
    }),
  });

  await migrateCollection({
    model: models.LegalSection,
    collectionName: COLLECTIONS.LEGAL_SECTIONS,
    mapDoc: (s) => ({
      legacyId: String(s._id),
      ...s,
    }),
  });

  await mongoose.disconnect();
  console.log('\n✅ Migration complete. Verify data in Firestore before disabling MongoDB.');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});


