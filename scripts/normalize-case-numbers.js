/**
 * Migration Script: Normalize Case Numbers
 * 
 * This script normalizes existing case numbers to the format: CASE-YYYY-NNNNN
 * 
 * Usage:
 *   node scripts/normalize-case-numbers.js --dry-run  (preview changes)
 *   node scripts/normalize-case-numbers.js --apply    (apply changes)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--apply');

console.log('='.repeat(60));
console.log('CASE NUMBER NORMALIZATION MIGRATION');
console.log('='.repeat(60));
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (changes will be made)'}`);
console.log('');

// Initialize Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../backend/serviceAccountKey.json';
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(__dirname, serviceAccountPath), 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

/**
 * Generate normalized case number
 * Format: CASE-YYYY-NNNNN
 */
function normalizeCaseNumber(originalNumber, createdAt, index) {
    // Extract year from createdAt or use current year
    let year = new Date().getFullYear();
    if (createdAt) {
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        year = date.getFullYear();
    }

    // Generate 5-digit number (padded with zeros)
    const number = String(index + 1).padStart(5, '0');

    return `CASE-${year}-${number}`;
}

/**
 * Check if case number already matches the format
 */
function isValidFormat(caseNumber) {
    return /^CASE-\d{4}-\d{5}$/.test(caseNumber);
}

async function migrateCaseNumbers() {
    try {
        console.log('Fetching all cases...');
        const casesSnapshot = await db.collection('cases').get();

        if (casesSnapshot.empty) {
            console.log('No cases found in database.');
            return;
        }

        console.log(`Found ${casesSnapshot.size} cases\n`);

        const updates = [];
        const backup = [];
        let validCount = 0;
        let invalidCount = 0;

        casesSnapshot.forEach((doc, index) => {
            const caseData = doc.data();
            const originalNumber = caseData.caseNumber;

            backup.push({
                id: doc.id,
                caseNumber: originalNumber,
                ...caseData
            });

            if (isValidFormat(originalNumber)) {
                validCount++;
                console.log(`✓ [${index + 1}] ${originalNumber} - Already valid`);
            } else {
                invalidCount++;
                const normalizedNumber = normalizeCaseNumber(originalNumber, caseData.createdAt, index);

                console.log(`✗ [${index + 1}] ${originalNumber} → ${normalizedNumber}`);

                updates.push({
                    id: doc.id,
                    oldNumber: originalNumber,
                    newNumber: normalizedNumber
                });
            }
        });

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total cases: ${casesSnapshot.size}`);
        console.log(`Valid format: ${validCount}`);
        console.log(`Need update: ${invalidCount}`);
        console.log('');

        if (updates.length === 0) {
            console.log('✓ All case numbers are already in the correct format!');
            return;
        }

        // Create backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, `backup-case-numbers-${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        console.log(`Backup created: ${backupPath}`);
        console.log('');

        if (isDryRun) {
            console.log('DRY RUN MODE - No changes were made');
            console.log('Run with --apply to apply these changes');
        } else {
            console.log('Applying changes...');

            const batch = db.batch();
            updates.forEach(update => {
                const caseRef = db.collection('cases').doc(update.id);
                batch.update(caseRef, {
                    caseNumber: update.newNumber,
                    oldCaseNumber: update.oldNumber,
                    migrated: true,
                    migratedAt: new Date().toISOString()
                });
            });

            await batch.commit();
            console.log(`✓ Successfully updated ${updates.length} case numbers`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('MIGRATION COMPLETE');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateCaseNumbers()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
