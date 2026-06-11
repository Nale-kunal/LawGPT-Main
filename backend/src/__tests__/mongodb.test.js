import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';

const mockFind = jest.fn().mockImplementation(() => {
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    equals: jest.fn().mockReturnThis(),
    ne: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    elemMatch: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  return mockQuery;
});

const mockFindById = jest.fn().mockResolvedValue(null);

// Intercept mongoose.model registration to return mock Hearing model
const originalModel = mongoose.model.bind(mongoose);
mongoose.model = (name, schema) => {
  if (name === 'Hearing') {
    return {
      find: mockFind,
      findById: mockFindById,
      schema: schema || new mongoose.Schema({}),
    };
  }
  try {
    return originalModel(name, schema);
  } catch (err) {
    // If model already exists or for other mock models, return a mock schema/object
    return {
      schema: schema || new mongoose.Schema({}),
    };
  }
};

describe('MongoDB Service - assertSafeFilterValue validation', () => {
  let queryDocuments;
  let COLLECTIONS;

  beforeAll(async () => {
    // Import dynamically so mongoose.model override is applied
    const mongodbModule = await import('../services/mongodb.js');
    queryDocuments = mongodbModule.queryDocuments;
    COLLECTIONS = mongodbModule.COLLECTIONS;
  });

  test('should allow string filter values', async () => {
    await expect(
      queryDocuments(COLLECTIONS.HEARINGS, [
        { field: 'courtName', operator: '==', value: 'Supreme Court' }
      ])
    ).resolves.not.toThrow();
  });

  test('should allow valid Mongoose ObjectId objects', async () => {
    const objectId = new mongoose.Types.ObjectId();
    await expect(
      queryDocuments(COLLECTIONS.HEARINGS, [
        { field: 'caseId', operator: '==', value: objectId }
      ])
    ).resolves.not.toThrow();
  });

  test('should allow null filter values', async () => {
    await expect(
      queryDocuments(COLLECTIONS.HEARINGS, [
        { field: 'caseId', operator: '==', value: null }
      ])
    ).resolves.not.toThrow();
  });

  test('should reject plain objects / MongoDB operators (injection payload)', async () => {
    const maliciousPayload = { $ne: null };
    await expect(
      queryDocuments(COLLECTIONS.HEARINGS, [
        { field: 'caseId', operator: '==', value: maliciousPayload }
      ])
    ).rejects.toThrow('Filter value for field \'caseId\' must not be an object');
  });
});

describe('MongoDB Service - assertValidObjectId validation', () => {
  let getDocumentById;
  let COLLECTIONS;

  beforeAll(async () => {
    const mongodbModule = await import('../services/mongodb.js');
    getDocumentById = mongodbModule.getDocumentById;
    COLLECTIONS = mongodbModule.COLLECTIONS;
  });

  test('should allow valid 24-character hexadecimal ObjectId strings', async () => {
    const validId = '6a29afec1f93dbad259a9922';
    await expect(
      getDocumentById(COLLECTIONS.HEARINGS, validId)
    ).resolves.toBeNull();
  });

  test('should allow valid Mongoose ObjectId instances', async () => {
    const objectId = new mongoose.Types.ObjectId('6a29afec1f93dbad259a9922');
    await expect(
      getDocumentById(COLLECTIONS.HEARINGS, objectId)
    ).resolves.toBeNull();
  });

  test('should reject invalid hexadecimal ObjectId strings', async () => {
    const invalidId = 'short-id';
    await expect(
      getDocumentById(COLLECTIONS.HEARINGS, invalidId)
    ).rejects.toThrow('Invalid document ID: must be a 24-character hexadecimal ObjectId');
  });

  test('should reject objects that are not ObjectIds', async () => {
    const maliciousPayload = { $ne: null };
    await expect(
      getDocumentById(COLLECTIONS.HEARINGS, maliciousPayload)
    ).rejects.toThrow('Invalid document ID: must be a 24-character hexadecimal ObjectId');
  });

  test('should reject arrays of IDs', async () => {
    const arrayPayload = ['6a29afec1f93dbad259a9922'];
    await expect(
      getDocumentById(COLLECTIONS.HEARINGS, arrayPayload)
    ).rejects.toThrow('Invalid document ID: must be a 24-character hexadecimal ObjectId');
  });
});
