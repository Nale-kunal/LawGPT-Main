import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  cases: [],
  clients: [],
  documents: [],
  folders: [],
  hearings: [],
  casenotes: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.cases = [];
  mockStore.clients = [];
  mockStore.documents = [];
  mockStore.folders = [];
  mockStore.hearings = [];
  mockStore.casenotes = [];
}

// Mock Mongoose models as dynamic classes to handle both instantiations and queries
function createQueryObj(wrapped) {
  const query = {
    select: () => query,
    lean: () => query,
    populate: () => query,
    sort: jest.fn().mockImplementation((sorter) => {
      if (Array.isArray(wrapped)) {
        wrapped.sort((a, b) => {
          const aTime = a.hearingTime || '';
          const bTime = b.hearingTime || '';
          return aTime.localeCompare(bTime);
        });
      }
      return query;
    }),
    skip: () => query,
    limit: () => query,
    exec: () => Promise.resolve(wrapped),
    then: (resolve, reject) => Promise.resolve(wrapped).then(resolve, reject),
    catch: (reject) => Promise.resolve(wrapped).catch(reject),
  };
  if (wrapped) {
    Object.assign(query, wrapped);
  }
  return query;
}

function createMockModel(storeName) {
  function MockClass(data) {
    Object.assign(this, data);
  }
  MockClass.prototype.save = jest.fn().mockImplementation(async function() {
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId().toString();
      mockStore[storeName].push(this);
    }
    return this;
  });
  MockClass.findById = jest.fn().mockImplementation((id) => {
    const doc = mockStore[storeName].find(x => String(x._id) === String(id) || String(x.id) === String(id));
    const wrapped = doc ? {
      ...doc,
      save: jest.fn().mockImplementation(async function() {
        Object.assign(doc, this);
        return doc;
      }),
    } : null;
    return createQueryObj(wrapped);
  });
  MockClass.findByIdAndUpdate = jest.fn().mockImplementation((id, update) => {
    const doc = mockStore[storeName].find(x => String(x._id) === String(id) || String(x.id) === String(id));
    if (doc) {
      if (update.$push) {
        for (const [k, v] of Object.entries(update.$push)) {
          if (!doc[k]) {doc[k] = [];}
          doc[k].push(v);
        }
      }
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
    }
    return Promise.resolve(doc);
  });
  MockClass.findOne = jest.fn().mockImplementation((query) => {
    const doc = mockStore[storeName].find(x => {
      return Object.entries(query).every(([k, v]) => {
        const val = x[k];
        if (v === false || v === 'false') {
          return !val || String(val) === 'false';
        }
        return String(val) === String(v);
      });
    });
    const wrapped = doc ? {
      ...doc,
      save: jest.fn().mockImplementation(async function() {
        Object.assign(doc, this);
        return doc;
      }),
    } : null;
    return createQueryObj(wrapped);
  });
  MockClass.find = jest.fn().mockImplementation((query) => {
    const list = mockStore[storeName].filter(x => {
      return Object.entries(query).every(([k, v]) => {
        const val = x[k];
        if (v === false || v === 'false') {
          return !val || String(val) === 'false';
        }
        return String(val) === String(v);
      });
    });
    return createQueryObj(list);
  });
  MockClass.create = jest.fn().mockImplementation(async (data) => {
    const doc = { ...data, _id: new mongoose.Types.ObjectId().toString() };
    mockStore[storeName].push(doc);
    return doc;
  });
  MockClass.deleteMany = jest.fn().mockImplementation(async (query) => {
    const beforeCount = mockStore[storeName].length;
    mockStore[storeName] = mockStore[storeName].filter(x => String(x.folderId) !== String(query.folderId));
    return { deletedCount: beforeCount - mockStore[storeName].length };
  });
  return { default: MockClass };
}

jest.unstable_mockModule('../models/User.js', () => createMockModel('users'));
jest.unstable_mockModule('../models/AbuseSignalLog.js', () => createMockModel('abuseLogs'));
jest.unstable_mockModule('../models/Case.js', () => createMockModel('cases'));
jest.unstable_mockModule('../models/Client.js', () => createMockModel('clients'));
jest.unstable_mockModule('../models/Document.js', () => createMockModel('documents'));
jest.unstable_mockModule('../models/Folder.js', () => createMockModel('folders'));
jest.unstable_mockModule('../models/Hearing.js', () => createMockModel('hearings'));
jest.unstable_mockModule('../models/CaseNote.js', () => createMockModel('casenotes'));

// Mock ownershipService
jest.unstable_mockModule('../services/ownershipService.js', () => ({
  validateFolderOwnership: jest.fn().mockImplementation(async (folderId, userId) => {
    const folder = mockStore.folders.find(x => String(x._id) === String(folderId));
    return folder && String(folder.ownerId) === String(userId);
  }),
  validateCaseOwnership: jest.fn().mockImplementation(async (caseId, userId) => {
    const caseDoc = mockStore.cases.find(x => String(x._id) === String(caseId));
    return caseDoc && String(caseDoc.owner) === String(userId);
  }),
  validateDocumentOwnership: jest.fn().mockImplementation(async (docId, userId) => {
    const doc = mockStore.documents.find(x => String(x._id) === String(docId));
    return doc && String(doc.ownerId) === String(userId);
  }),
  validateClientOwnership: jest.fn().mockImplementation(async (clientId, userId) => {
    const client = mockStore.clients.find(x => String(x._id) === String(clientId));
    return client && String(client.owner) === String(userId);
  }),
}));

// Mock conflictDetection
let mockConflicts = [];
jest.unstable_mockModule('../utils/conflictDetection.js', () => ({
  checkHearingConflicts: jest.fn().mockImplementation(async () => mockConflicts),
  computeHearingTimes: jest.fn().mockImplementation((date, time, tz, duration) => {
    const startAt = new Date(date);
    const endAt = new Date(startAt.getTime() + duration * 60000);
    return { startAt, endAt };
  }),
}));

// Mock uploadSecurityMiddleware
jest.unstable_mockModule('../middleware/uploadSecurity.js', () => ({
  uploadSecurityMiddleware: (req, res, next) => next()
}));

// Mock mongodb service
jest.unstable_mockModule('../services/mongodb.js', () => {
  const collections = {
    USERS: 'users',
    CASES: 'cases',
    CLIENTS: 'clients',
    DOCUMENTS: 'documents',
    FOLDERS: 'folders',
    HEARINGS: 'hearings',
  };
  return {
    COLLECTIONS: collections,
    MODELS: collections,
    getDocumentById: jest.fn().mockImplementation(async (col, id) => {
      return mockStore[col]?.find(x => String(x._id) === String(id) || String(x.id) === String(id)) || null;
    }),
    updateDocument: jest.fn().mockImplementation(async (col, id, update) => {
      const doc = mockStore[col]?.find(x => String(x._id) === String(id) || String(x.id) === String(id));
      if (doc) {
        Object.assign(doc, update);
      }
      return doc;
    }),
    createDocument: jest.fn().mockImplementation(async (col, data) => {
      const doc = { ...data, _id: new mongoose.Types.ObjectId().toString(), id: new mongoose.Types.ObjectId().toString() };
      mockStore[col]?.push(doc);
      return doc;
    }),
    deleteDocument: jest.fn().mockImplementation(async (col, id) => {
      const idx = mockStore[col]?.findIndex(x => String(x._id) === String(id) || String(x.id) === String(id));
      if (idx !== -1) {mockStore[col].splice(idx, 1);}
      return { ok: true };
    }),
    deleteManyDocuments: jest.fn().mockResolvedValue(1),
    queryDocuments: jest.fn().mockImplementation(async (col, filters) => {
      let list = mockStore[col] || [];
      if (filters && Array.isArray(filters)) {
        list = list.filter(doc => {
          return filters.every(f => {
            const val = doc[f.field];
            if (f.operator === '==') {
              if (f.value === false) {return !val || String(val) === 'false';}
              return String(val) === String(f.value);
            }
            if (f.operator === '!=') {return String(val) !== String(f.value);}
            return true;
          });
        });
      }
      return list.map(doc => ({
        id: doc._id || doc.id,
        ...doc
      }));
    }),
    default: mongoose,
  };
});

// Mock userCache
jest.unstable_mockModule('../utils/userCache.js', () => ({
  getCachedUser: jest.fn().mockImplementation(async (id) => {
    return { _id: id, id, status: 'active', accountStatus: { isSuspended: false }, securityFlags: { blocked: false } };
  }),
  setCachedUser: jest.fn().mockResolvedValue(undefined),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));

// Mock Cloudinary config
const mockCloudinary = {
  config: jest.fn(),
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn(),
    upload_stream: jest.fn(),
  },
  url: jest.fn(),
};
jest.unstable_mockModule('../config/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test.pdf', public_id: 'test' }),
  uploadFileToCloudinary: jest.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test.pdf', public_id: 'test' }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(true),
  extractPublicIdFromUrl: jest.fn().mockReturnValue('test'),
  getCloudinaryUrl: jest.fn().mockReturnValue('https://res.cloudinary.com/test-cloud/image/upload/test.pdf'),
  default: mockCloudinary,
}));

// Mock Redis
const mockRedis = {
  exists: jest.fn().mockResolvedValue(0),
  isAvailable: jest.fn().mockReturnValue(false),
};
jest.unstable_mockModule('../utils/redis.js', () => ({
  redis: mockRedis,
  default: mockRedis,
}));

// Mock Activity Logger
jest.unstable_mockModule('../middleware/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined)
}));

// Mock plan enforcement
jest.unstable_mockModule('../middleware/planEnforcement.js', () => ({
  enforcePlanLimits: () => (req, res, next) => next(),
}));

jest.unstable_mockModule('../middleware/checkPlanAccess.js', () => ({
  checkPlanAccess: () => (req, res, next) => next(),
}));

// ── 2. Express App Building ──────────────────────────────────────────────────

async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.NODE_ENV = 'test';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: clientRouter } = await import('../routes/clients.js');
  const { default: caseRouter } = await import('../routes/cases.js');
  const { default: hearingRouter } = await import('../routes/hearings.js');
  const { default: documentRouter } = await import('../routes/documents.js');
  const { default: caseNoteRouter } = await import('../routes/caseNotes.js');
  const { default: noteAttachmentsRouter } = await import('../routes/noteAttachments.js');

  app.use('/api/v1/clients', clientRouter);
  app.use('/api/v1/cases', caseRouter);
  app.use('/api/v1/hearings', hearingRouter);
  app.use('/api/v1/documents', documentRouter);
  app.use('/api/v1/cases/:caseId/notes/:noteId/attachments', noteAttachmentsRouter);
  app.use('/api/v1/cases/:caseId/notes', caseNoteRouter);

  return app;
}

// ── 3. Test Cases ────────────────────────────────────────────────────────────

describe('Priority 2 — Core Entities CRUD and Isolation Checks', () => {
  let app;
  let userAToken;
  let userBToken;
  let clientA;
  let caseA;

  beforeAll(async () => {
    app = await buildApp();
    global.fetch = jest.fn().mockImplementation((url) => {
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('PDF Dummy content')),
        statusText: 'OK',
      });
    });
  });

  beforeEach(async () => {
    resetMockStore();
    jest.clearAllMocks();
    mockConflicts = [];

    // Seed mock users
    mockStore.users.push(
      { _id: '654321098765432109876543', id: '654321098765432109876543', email: 'userA@test.com', status: 'active', accountStatus: { isSuspended: false }, securityFlags: { blocked: false } },
      { _id: '987654321098765432109876', id: '987654321098765432109876', email: 'userB@test.com', status: 'active', accountStatus: { isSuspended: false }, securityFlags: { blocked: false } }
    );

    userAToken = jwt.sign({ userId: '654321098765432109876543', email: 'userA@test.com', role: 'lawyer' }, process.env.JWT_SECRET);
    userBToken = jwt.sign({ userId: '987654321098765432109876', email: 'userB@test.com', role: 'lawyer' }, process.env.JWT_SECRET);

    // Seed User A Client and Case
    const { createDocument } = await import('../services/mongodb.js');
    clientA = await createDocument('clients', {
      name: 'Client A',
      email: 'clientA@test.com',
      phone: '1234567890',
      owner: '654321098765432109876543',
    });

    caseA = await createDocument('cases', {
      caseNumber: 'CASE-001',
      title: 'Case of User A',
      owner: '654321098765432109876543',
    });
  });

  // ── 3.1 Clients CRUD and Tenant Isolation ─────────────────────────────────
  describe('Clients CRUD & Isolation', () => {
    test('User A can create and fetch their own clients', async () => {
      const resCreate = await request(app)
        .post('/api/v1/clients')
        .set('Cookie', `token=${userAToken}`)
        .send({ name: 'Client A-2', email: 'clientA2@test.com', phone: '9876543210' });

      expect(resCreate.status).toBe(201);
      expect(resCreate.body.name).toBe('Client A-2');

      const resFetch = await request(app)
        .get(`/api/v1/clients`)
        .set('Cookie', `token=${userAToken}`);

      expect(resFetch.status).toBe(200);
      expect(resFetch.body.length).toBeGreaterThan(0);
      expect(resFetch.body[0].name).toBe('Client A');
    });

    test('User B cannot view User A\'s client (returns 404/IDOR block)', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${clientA._id}`)
        .set('Cookie', `token=${userBToken}`);

      expect(res.status).toBe(404);
    });

    test('User B cannot update User A\'s client', async () => {
      const res = await request(app)
        .put(`/api/v1/clients/${clientA._id}`)
        .set('Cookie', `token=${userBToken}`)
        .send({ name: 'Hacked name' });

      expect(res.status).toBe(404);
    });
  });

  // ── 3.2 Cases CRUD and Tenant Isolation ───────────────────────────────────
  describe('Cases CRUD & Isolation', () => {
    test('User A can create and update their own cases', async () => {
      const resUpdate = await request(app)
        .put(`/api/v1/cases/${caseA._id}`)
        .set('Cookie', `token=${userAToken}`)
        .send({ title: 'New Case Title' });

      expect(resUpdate.status).toBe(200);

      const caseDoc = mockStore.cases.find(x => String(x._id) === String(caseA._id));
      expect(caseDoc.title).toBe('New Case Title');
    });

    test('User B cannot update User A\'s case', async () => {
      const res = await request(app)
        .put(`/api/v1/cases/${caseA._id}`)
        .set('Cookie', `token=${userBToken}`)
        .send({ title: 'Malicious Title' });

      expect(res.status).toBe(404);
    });
  });

  // ── 3.3 Case Notes & noteAttachments CRUD and Tenant Isolation ─────────────
  describe('Case Notes & Attachments CRUD & Isolation', () => {
    let noteA;

    beforeEach(async () => {
      // Seed Case Note under Case A
      const MockCaseNote = (await import('../models/CaseNote.js')).default;
      noteA = await MockCaseNote.create({
        caseId: caseA._id.toString(),
        authorId: '654321098765432109876543',
        title: 'Confidential Note',
        content: 'Crucial case details',
        attachments: [],
      });
    });

    test('User A can create a case note under their own case', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${caseA._id}/notes`)
        .set('Cookie', `token=${userAToken}`)
        .send({ content: 'Test note content', title: 'Note 2' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Note 2');
    });

    test('User B cannot view case notes under User A\'s case', async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${caseA._id}/notes`)
        .set('Cookie', `token=${userBToken}`);

      expect(res.status).toBe(403);
    });

    test('User A can attach a file to their case note', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${caseA._id}/notes/${noteA._id}/attachments`)
        .set('Cookie', `token=${userAToken}`)
        .attach('files', Buffer.from('PDF Dummy content'), 'briefcase.pdf');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.attachments[0].fileName).toBe('briefcase.pdf');
    });

    test('User B cannot upload attachments to User A\'s case note', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${caseA._id}/notes/${noteA._id}/attachments`)
        .set('Cookie', `token=${userBToken}`)
        .attach('files', Buffer.from('Hack dummy content'), 'hack.pdf');

      expect(res.status).toBe(403);
    });
  });

  // ── 3.4 Documents & Folders CRUD and Tenant Isolation ──────────────────────
  describe('Documents & Folders CRUD & Isolation', () => {
    let folderA;
    let documentA;

    beforeEach(async () => {
      const { createDocument } = await import('../services/mongodb.js');
      folderA = await createDocument('folders', {
        name: 'My Briefs',
        ownerId: '654321098765432109876543',
      });
      documentA = await createDocument('documents', {
        name: 'contract.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        url: 'https://res.cloudinary.com/test-cloud/image/upload/contract.pdf',
        ownerId: '654321098765432109876543',
      });
    });

    test('User A can create folders and view documents', async () => {
      const resFolder = await request(app)
        .post('/api/v1/documents/folders')
        .set('Cookie', `token=${userAToken}`)
        .send({ name: 'Sub folder', parentId: folderA._id });

      expect(resFolder.status).toBe(201);

      const resView = await request(app)
        .get(`/api/v1/documents/files/${documentA._id}/view`)
        .set('Cookie', `token=${userAToken}`);

      expect(resView.status).toBe(200);
      expect(resView.body.toString()).toBe('PDF Dummy content');
    });

    test('User B cannot create a folder under User A\'s parent folder', async () => {
      const res = await request(app)
        .post('/api/v1/documents/folders')
        .set('Cookie', `token=${userBToken}`)
        .send({ name: 'Hack folder', parentId: folderA._id });

      expect(res.status).toBe(404);
    });

    test('User B cannot view User A\'s document', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/files/${documentA._id}/view`)
        .set('Cookie', `token=${userBToken}`);

      expect(res.status).toBe(404);
    });

    test('User A can download document successfully', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/files/${documentA._id}/download`)
        .set('Cookie', `token=${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    test('User A can upload document successfully', async () => {
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Cookie', `token=${userAToken}`)
        .attach('files', Buffer.from('test pdf content'), 'test.pdf');
      expect(res.status).toBe(201);
      expect(res.body.files[0].name).toBe('test.pdf');
    });

    test('User A can update and delete file successfully', async () => {
      const resPut = await request(app)
        .put(`/api/v1/documents/files/${documentA._id}`)
        .set('Cookie', `token=${userAToken}`)
        .send({ name: 'renamed.pdf' });
      expect(resPut.status).toBe(200);
      expect(resPut.body.file.name).toBe('renamed.pdf');

      const resDel = await request(app)
        .delete(`/api/v1/documents/files/${documentA._id}`)
        .set('Cookie', `token=${userAToken}`);
      expect(resDel.status).toBe(200);
    });
  });

  // ── 3.5 Hearings CRUD and Tenant Isolation ─────────────────────────────────
  describe('Hearings CRUD & Isolation', () => {
    let hearingA;

    beforeEach(async () => {
      const { createDocument } = await import('../services/mongodb.js');
      hearingA = await createDocument('hearings', {
        caseId: caseA._id,
        hearingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        hearingTime: '11:00',
        timezone: 'Asia/Kolkata',
        duration: 45,
        courtName: 'Supreme Court',
        hearingType: 'interim_hearing',
        status: 'scheduled',
        owner: '654321098765432109876543',
      });
    });

    test('POST /check-conflict detects conflicts', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const start = new Date(tomorrow.setHours(11, 0, 0, 0)).toISOString();
      const end = new Date(tomorrow.setHours(12, 0, 0, 0)).toISOString();

      const res = await request(app)
        .post('/api/v1/hearings/check-conflict')
        .set('Cookie', `token=${userAToken}`)
        .send({ startAt: start, endAt: end });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasConflict');
    });

    test('GET /case/:caseId fetches case hearings', async () => {
      const res = await request(app)
        .get(`/api/v1/hearings/case/${caseA._id}`)
        .set('Cookie', `token=${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET / fetches user hearings', async () => {
      const res = await request(app)
        .get('/api/v1/hearings')
        .set('Cookie', `token=${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /:id fetches single hearing', async () => {
      const res = await request(app)
        .get(`/api/v1/hearings/${hearingA._id}`)
        .set('Cookie', `token=${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.courtName).toBe('Supreme Court');
    });

    test('POST / creates a hearing', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const res = await request(app)
        .post('/api/v1/hearings')
        .set('Cookie', `token=${userAToken}`)
        .send({
          caseId: caseA._id,
          hearingDate: tomorrow.toISOString(),
          hearingTime: '14:00',
          timezone: 'Asia/Kolkata',
          duration: 30,
          courtName: 'High Court',
          hearingType: 'final_hearing',
          status: 'scheduled'
        });

      expect(res.status).toBe(201);
      expect(res.body.courtName).toBe('High Court');
    });

    test('PUT /:id updates a hearing', async () => {
      const res = await request(app)
        .put(`/api/v1/hearings/${hearingA._id}`)
        .set('Cookie', `token=${userAToken}`)
        .send({ courtName: 'District Court' });

      expect(res.status).toBe(200);
      expect(res.body.courtName).toBe('District Court');
    });

    test('DELETE /:id deletes a hearing', async () => {
      const res = await request(app)
        .delete(`/api/v1/hearings/${hearingA._id}`)
        .set('Cookie', `token=${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('GET /today/list gets today\'s hearings', async () => {
      // Seed a hearing for today
      const { createDocument } = await import('../services/mongodb.js');
      await createDocument('hearings', {
        caseId: caseA._id,
        hearingDate: new Date().toISOString(),
        hearingTime: '10:00',
        timezone: 'Asia/Kolkata',
        duration: 30,
        courtName: 'Today Court',
        owner: '654321098765432109876543'
      });

      const res = await request(app)
        .get('/api/v1/hearings/today/list')
        .set('Cookie', `token=${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
