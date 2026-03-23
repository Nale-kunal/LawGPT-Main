import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { User, Case, Document } from '../models/index.js';
import userDeletionService from '../services/userDeletionService.js';

/**
 * Targeted verification for hard deletion logic.
 * Requires MONGODB_URI to be explicitly set — skipped in CI without a real DB.
 */

const MONGODB_URI = process.env.MONGODB_URI;
const itif = MONGODB_URI ? test : test.skip;

describe('Hard Data Deletion Verification', () => {
    let testUser;
    let userId;

    beforeAll(async () => {
        if (!MONGODB_URI) { return; }
        // Connect to DB if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGODB_URI);
        }
    }, 30000);

    afterAll(async () => {
        if (!MONGODB_URI) { return; }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }, 15000);

    itif('should permanently delete user and associated data', async () => {
        const email = `test-delete-${Date.now()}@example.com`;

        // 1. Create a test user
        testUser = await User.create({
            name: 'Test Deletion User',
            email: email,
            passwordHash: 'hashed-password',
            role: 'lawyer'
        });
        userId = testUser._id.toString();

        // 2. Create associated data
        await Case.create({
            caseNumber: 'CASE-123',
            clientName: 'Test Client',
            owner: userId
        });

        await Document.create({
            name: 'test-doc.pdf',
            mimetype: 'application/pdf',
            size: 1024,
            url: 'https://cloudinary.com/test.pdf',
            ownerId: userId
        });

        // Verify data exists
        expect(await User.findById(userId)).toBeDefined();
        expect(await Case.findOne({ owner: userId })).toBeDefined();
        expect(await Document.findOne({ ownerId: userId })).toBeDefined();

        // 3. Perform hard deletion
        await userDeletionService.deleteUserAccount(userId);

        // 4. Verify all data is gone
        const deletedUser = await User.findById(userId);
        const deletedCase = await Case.findOne({ owner: userId });
        const deletedDoc = await Document.findOne({ ownerId: userId });

        expect(deletedUser).toBeNull();
        expect(deletedCase).toBeNull();
        expect(deletedDoc).toBeNull();

        // 5. Verify re-registration is possible
        const newUser = await User.create({
            name: 'New User Same Email',
            email: email,
            passwordHash: 'new-hashed-password',
            role: 'lawyer'
        });

        expect(newUser).toBeDefined();
        expect(newUser._id.toString()).not.toBe(userId);

        // Final cleanup
        await User.findByIdAndDelete(newUser._id);
    });
});
