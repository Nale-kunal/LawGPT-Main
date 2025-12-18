/**
 * One-off migration script: local uploads folder -> Cloudinary + Firestore metadata.
 *
 * This is safe to run multiple times; existing documents that already have
 * Cloudinary URLs will be skipped by default.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadFile } from '../cloudinary/index.js';
import { createDocument, queryDocuments, COLLECTIONS } from '../src/services/firestore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findUploadsDirs() {
  const dirs = [];
  const candidates = [
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'server', 'server', 'uploads'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      dirs.push(dir);
    }
  }
  return dirs;
}

async function migrateFile(filePath, ownerId = null, folderId = null) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return null;

  const fileName = path.basename(filePath);

  // Skip if this file already has metadata in Firestore with a Cloudinary URL
  const existing = await queryDocuments(
    COLLECTIONS.DOCUMENTS,
    [
      { field: 'name', operator: '==', value: fileName },
      ...(ownerId ? [{ field: 'ownerId', operator: '==', value: ownerId }] : []),
    ],
    null,
    1,
  );

  if (existing.length && existing[0].url && existing[0].url.includes('cloudinary.com')) {
    console.log(`⏭  Skipping ${fileName} (already in Cloudinary)`);
    return existing[0];
  }

  console.log(`☁️  Uploading ${fileName} to Cloudinary...`);
  const uploadResult = await uploadFile(filePath, {
    folder: 'lawyer-zen/legacy-uploads',
  });

  const doc = await createDocument(COLLECTIONS.DOCUMENTS, {
    name: fileName,
    mimetype: 'application/octet-stream',
    size: stat.size,
    url: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type,
    folderId: folderId || null,
    ownerId: ownerId || null,
    tags: ['legacy-upload'],
  });

  console.log(`✅ Migrated ${fileName} -> ${uploadResult.secure_url}`);
  return doc;
}

async function main() {
  const dirs = findUploadsDirs();
  if (!dirs.length) {
    console.log('No local uploads directories found. Nothing to migrate.');
    return;
  }

  console.log('Found uploads directories:', dirs);

  for (const dir of dirs) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      try {
        // Owner/folder cannot be inferred reliably from just the file path,
        // so we store everything as generic legacy uploads.
        // If you have a CSV/DB mapping, you can extend this script.
        // eslint-disable-next-line no-await-in-loop
        await migrateFile(full);
      } catch (error) {
        console.error(`❌ Failed to migrate file ${full}:`, error.message);
      }
    }
  }

  console.log('\n✅ Media migration complete. You can now rely on Cloudinary URLs in Firestore.');
}

main().catch((err) => {
  console.error('❌ Media migration failed:', err);
  process.exit(1);
});


