import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  conversations: [],
  participants: [],
  messages: [],
  blockedusers: [],
  moderationlogs: [],
  abuselogs: [],
  // Dashboard mock store
  cases: [],
  clients: [],
  activities: [],
  hearings: [],
  alerts: [],
};

// Search mock store
const mockSearchStore = {
  acts: [],
  cases: [],
  sections: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.conversations = [];
  mockStore.participants = [];
  mockStore.messages = [];
  mockStore.blockedusers = [];
  mockStore.moderationlogs = [];
  mockStore.abuselogs = [];
  mockStore.cases = [];
  mockStore.clients = [];
  mockStore.activities = [];
  mockStore.hearings = [];
  mockStore.alerts = [];

  mockSearchStore.acts = [];
  mockSearchStore.cases = [];
  mockSearchStore.sections = [];
}

function createQueryObj(wrapped, storeName) {
  const query = {
    select: () => query,
    lean: () => query,
    populate: (opts) => {
      if (storeName === 'participants' && Array.isArray(wrapped)) {
        wrapped.forEach(p => {
          if (p.conversationId) {
            const conv = mockStore.conversations.find(c => String(c._id) === String(p.conversationId));
            p.conversationId = conv || p.conversationId;
          }
          if (p.userId) {
            const user = mockStore.users.find(u => String(u._id) === String(p.userId));
            p.userId = user ? { _id: user._id, name: user.name, profile: { fullName: user.name } } : p.userId;
          }
        });
      }
      if (storeName === 'messages' && Array.isArray(wrapped)) {
        wrapped.forEach(m => {
          if (m.senderId) {
            const user = mockStore.users.find(u => String(u._id) === String(m.senderId));
            m.senderId = user ? { _id: user._id, name: user.name, profile: { fullName: user.name } } : m.senderId;
          }
        });
      }
      return query;
    },
    sort: () => query,
    skip: () => query,
    limit: () => query,
    distinct: (field) => {
      const list = Array.isArray(wrapped) ? wrapped : (wrapped ? [wrapped] : []);
      const values = list.map(x => x[field]).filter(Boolean);
      return Promise.resolve([...new Set(values)]);
    },
    exec: () => Promise.resolve(wrapped),
    then: (resolve, reject) => Promise.resolve(wrapped).then(resolve, reject),
    catch: (reject) => Promise.resolve(wrapped).catch(reject),
  };
  if (wrapped && !Array.isArray(wrapped)) {
    Object.assign(query, wrapped);
  }
  return query;
}

function createMockModel(storeName) {
  function MockClass(data) {
    Object.assign(this, data);
  }
  const matchesQuery = (x, query) => {
    return Object.entries(query).every(([k, v]) => {
      const xVal = x[k];
      if (v === false || v === 'false') {
        return !xVal || String(xVal) === 'false';
      }
      if (v === true || v === 'true') {
        return !!xVal && String(xVal) === 'true';
      }
      if (v && typeof v === 'object') {
        if (v.$in) {
          return v.$in.map(String).includes(String(xVal || x._id));
        }
        if (v.$all) {
          return v.$all.every(val => xVal && xVal.map(String).includes(String(val)));
        }
      }
      if (k === '_id') {
        return String(x._id) === String(v);
      }
      return String(xVal) === String(v);
    });
  };

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
    return createQueryObj(wrapped, storeName);
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
      if (update.$pull) {
        for (const [k, v] of Object.entries(update.$pull)) {
          if (doc[k]) {
            doc[k] = doc[k].filter(x => String(x) !== String(v));
          }
        }
      }
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
    }
    return Promise.resolve(doc);
  });
  MockClass.findOneAndUpdate = jest.fn().mockImplementation((query, update) => {
    const doc = mockStore[storeName].find(x => matchesQuery(x, query));
    if (doc && update.$set) {
      Object.assign(doc, update.$set);
    }
    return createQueryObj(doc, storeName);
  });
  MockClass.findOne = jest.fn().mockImplementation((query) => {
    const doc = mockStore[storeName].find(x => {
      if (query.$or) {
        return query.$or.some(q => matchesQuery(x, q));
      }
      return matchesQuery(x, query);
    });
    const wrapped = doc ? {
      ...doc,
      save: jest.fn().mockImplementation(async function() {
        Object.assign(doc, this);
        return doc;
      }),
    } : null;
    return createQueryObj(wrapped, storeName);
  });
  MockClass.find = jest.fn().mockImplementation((query) => {
    let list = mockStore[storeName];
    if (query && Object.keys(query).length > 0) {
      list = list.filter(x => {
        if (query.$or) {
          return query.$or.some(q => matchesQuery(x, q));
        }
        return matchesQuery(x, query);
      });
    }
    return createQueryObj(list, storeName);
  });
  MockClass.create = jest.fn().mockImplementation(async (data) => {
    if (Array.isArray(data)) {
      const docs = data.map(item => ({ ...item, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() }));
      mockStore[storeName].push(...docs);
      return docs;
    }
    const doc = { ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() };
    mockStore[storeName].push(doc);
    return doc;
  });
  MockClass.insertMany = jest.fn().mockImplementation(async (arr) => {
    const docs = arr.map(data => ({ ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() }));
    mockStore[storeName].push(...docs);
    return docs;
  });
  MockClass.exists = jest.fn().mockImplementation(async (query) => {
    const list = mockStore[storeName];
    const exists = list.some(x => {
      if (query.$or) {
        return query.$or.some(q => matchesQuery(x, q));
      }
      return matchesQuery(x, query);
    });
    return exists ? { _id: 'some-id' } : null;
  });
  MockClass.updateOne = jest.fn().mockImplementation((query, update) => {
    const docs = mockStore[storeName].filter(x => matchesQuery(x, query));
    for (const doc of docs) {
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
    }
    return Promise.resolve({ modifiedCount: docs.length });
  });
  return MockClass;
}

// Register community mocks
jest.unstable_mockModule('../community/models/Conversation.js', () => ({ default: createMockModel('conversations') }));
jest.unstable_mockModule('../community/models/ConversationParticipant.js', () => ({ default: createMockModel('participants') }));
jest.unstable_mockModule('../community/models/Message.js', () => ({ default: createMockModel('messages') }));
jest.unstable_mockModule('../community/models/BlockedUser.js', () => ({ default: createMockModel('blockedusers') }));
jest.unstable_mockModule('../community/models/ModerationLog.js', () => ({ default: createMockModel('moderationlogs') }));

// Register standard models
jest.unstable_mockModule('../models/User.js', () => ({ default: createMockModel('users') }));
jest.unstable_mockModule('../models/AbuseSignalLog.js', () => ({ default: createMockModel('abuselogs') }));

// Register search model mocks
function createSearchMockModel(name) {
  let shouldFailTextSearch = false;
  const mockClass = {
    _setShouldFailTextSearch: (val) => { shouldFailTextSearch = val; },
    find: jest.fn().mockImplementation((query) => {
      const list = mockSearchStore[name] || [];
      const queryObj = {
        sort: () => queryObj,
        limit: (n) => ({
          lean: () => {
            if (shouldFailTextSearch && query && query.$text) {
              return Promise.reject(new Error('Text search failed'));
            }
            return Promise.resolve(list.slice(0, n));
          },
        }),
        lean: () => {
          if (shouldFailTextSearch && query && query.$text) {
            return Promise.reject(new Error('Text search failed'));
          }
          return Promise.resolve(list);
        },
      };
      return queryObj;
    }),
  };
  return mockClass;
}

const mockActsModel = createSearchMockModel('acts');
const mockCasesModel = createSearchMockModel('cases');
const mockSectionsModel = createSearchMockModel('sections');

jest.unstable_mockModule('../models/LegalActs.js', () => ({ default: mockActsModel }));
jest.unstable_mockModule('../models/CaseLaws.js', () => ({ default: mockCasesModel }));
jest.unstable_mockModule('../models/LegalSection.js', () => ({ default: mockSectionsModel }));

// Semantic Search mock
jest.unstable_mockModule('../services/semanticSearch/semanticSearchService.js', () => ({
  semanticSearch: jest.fn().mockImplementation(async (q, limit) => {
    return {
      acts: mockSearchStore.acts.map(a => ({ id: a._id.toString(), semanticScore: 0.8, title: a.title })),
      cases: mockSearchStore.cases.map(c => ({ id: c._id.toString(), semanticScore: 0.8, caseTitle: c.caseTitle })),
    };
  }),
}));

// Encryption Service mock
const mockEncryptMessage = jest.fn().mockImplementation((text, convId) => {
  return { ciphertext: 'cipher_' + text, iv: 'iv_123', authTag: 'tag_123' };
});
const mockDecryptMessage = jest.fn().mockImplementation((cipher, iv, tag, convId) => {
  if (cipher && cipher.startsWith('cipher_')) {
    return cipher.replace('cipher_', '');
  }
  return cipher;
});
const mockDecryptMessages = jest.fn().mockImplementation((msgs) => {
  return msgs.map(m => ({
    ...m,
    content: m.encryptedContent && m.encryptedContent.startsWith('cipher_') 
      ? m.encryptedContent.replace('cipher_', '') 
      : m.encryptedContent,
  }));
});
const mockEncryptAttachment = jest.fn().mockImplementation((filename, secureUrl, conversationId) => {
  return { encryptedData: 'enc_' + filename, iv: 'iv_123', authTag: 'tag_123' };
});
const mockDecryptAttachment = jest.fn().mockImplementation((encryptedData, iv, authTag, conversationId) => {
  return { filename: encryptedData ? encryptedData.replace('enc_', '') : '', secureUrl: 'http://secure' };
});
jest.unstable_mockModule('../community/services/encryptionService.js', () => ({
  encryptMessage: mockEncryptMessage,
  decryptMessage: mockDecryptMessage,
  decryptMessages: mockDecryptMessages,
  encryptAttachmentMetadata: mockEncryptAttachment,
  decryptAttachmentMetadata: mockDecryptAttachment,
  ACTIVE_KEY_VERSION: '1',
  default: {
    encryptMessage: mockEncryptMessage,
    decryptMessage: mockDecryptMessage,
    decryptMessages: mockDecryptMessages,
    encryptAttachmentMetadata: mockEncryptAttachment,
    decryptAttachmentMetadata: mockDecryptAttachment,
    ACTIVE_KEY_VERSION: '1',
  }
}));

// Presence Service mock
jest.unstable_mockModule('../community/services/presenceService.js', () => ({
  getBulkPresence: jest.fn().mockImplementation(async (userIds) => {
    const map = {};
    for (const uid of userIds) {
      map[uid.toString()] = { status: 'online' };
    }
    return map;
  }),
}));

// Socket Server mock
jest.unstable_mockModule('../community/socket/socketServer.js', () => ({
  initSocketServer: jest.fn(),
  getIO: jest.fn(),
  emitToUser: jest.fn(),
  emitToConversation: jest.fn(),
  disconnectUserSockets: jest.fn(),
  default: {
    initSocketServer: jest.fn(),
    getIO: jest.fn(),
    emitToUser: jest.fn(),
    emitToConversation: jest.fn(),
    disconnectUserSockets: jest.fn(),
  }
}));

// Token Service mock
jest.unstable_mockModule('../services/tokenService.js', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

// User cache mock
jest.unstable_mockModule('../utils/userCache.js', () => ({
  getCachedUser: jest.fn().mockImplementation(async (id) => {
    return mockStore.users.find(u => String(u._id) === String(id)) || null;
  }),
  setCachedUser: jest.fn().mockResolvedValue(undefined),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));

// Activity logger mock
jest.unstable_mockModule('../middleware/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

// MongoDB Service layer mock for Dashboard
let dashboardShouldFail = false;
const mockCollections = {
  USERS: 'users',
  CASES: 'cases',
  CLIENTS: 'clients',
  ACTIVITIES: 'activities',
  HEARINGS: 'hearings',
  ALERTS: 'alerts',
  DOCUMENTS: 'documents',
  FOLDERS: 'folders',
  LEGAL_SECTIONS: 'legalSections',
  PASSWORD_RESETS: 'passwordResets',
};
jest.unstable_mockModule('../services/mongodb.js', () => ({
  COLLECTIONS: mockCollections,
  MODELS: mockCollections,
  queryDocuments: jest.fn().mockImplementation(async (collection, filters = [], orderBy = null, limit = null) => {
    if (dashboardShouldFail) {
      throw new Error('Database connection failed');
    }
    let list = mockStore[collection] || [];
    // Filter
    for (const filter of filters) {
      const { field, operator, value } = filter;
      list = list.filter(item => {
        const itemVal = item[field];
        if (operator === '==') {
          return String(itemVal) === String(value);
        }
        return true;
      });
    }
    // Sort
    if (orderBy) {
      list = [...list].sort((a, b) => {
        const aVal = a[orderBy.field];
        const bVal = b[orderBy.field];
        if (orderBy.direction === 'desc') {
          return new Date(bVal) - new Date(aVal);
        }
        return new Date(aVal) - new Date(bVal);
      });
    }
    if (limit) {
      list = list.slice(0, limit);
    }
    return list;
  }),
  getDocumentById: jest.fn().mockImplementation(async (collection, id) => {
    const list = mockStore[collection] || [];
    return list.find(item => String(item.id) === String(id) || String(item._id) === String(id)) || null;
  }),
}));

// ── 2. Express App Building ──────────────────────────────────────────────────

async function buildApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
  process.env.NODE_ENV = 'test';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: dashboardRouter } = await import('../routes/dashboard.js');
  const { default: communityRouter } = await import('../community/routes/index.js');

  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/community', communityRouter);

  return app;
}

// ── 3. Test Cases ────────────────────────────────────────────────────────────

describe('Priority 4 — Dashboard, Search, and Community Chat', () => {
  let app;
  let userToken;
  let adminToken;
  const userId = '654321098765432109876543';
  const adminId = '987654321098765432109876';

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();
    dashboardShouldFail = false;
    mockActsModel._setShouldFailTextSearch(false);
    mockCasesModel._setShouldFailTextSearch(false);
    mockSectionsModel._setShouldFailTextSearch(false);

    // Seed mockStore users
    mockStore.users.push(
      { _id: userId, id: userId, email: 'user@test.com', role: 'lawyer', status: 'active', securityFlags: { blocked: false, abuseScore: 0 } },
      { _id: adminId, id: adminId, email: 'admin@test.com', role: 'admin', status: 'active', securityFlags: { blocked: false, abuseScore: 0 } }
    );

    userToken = jwt.sign({ userId, email: 'user@test.com', role: 'lawyer' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: adminId, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET);
  });

  // ── 3.1 Dashboard Route Tests ──────────────────────────────────────────────
  describe('Dashboard Route Tests', () => {
    test('GET /stats fetches stats correctly', async () => {
      mockStore.cases.push(
        { id: '1', owner: userId, status: 'active', hearingDate: new Date(), priority: 'urgent' },
        { id: '2', owner: userId, status: 'closed', hearingDate: null, priority: 'normal' }
      );
      mockStore.clients.push(
        { id: '1', owner: userId, name: 'Client A' }
      );

      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCases).toBe(2);
      expect(res.body.activeCases).toBe(1);
      expect(res.body.totalClients).toBe(1);
      expect(res.body.urgentCases).toBe(1);
    });

    test('GET /stats handles db error gracefully', async () => {
      dashboardShouldFail = true;

      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch dashboard statistics');
    });

    test('GET /activity returns mapped activity if collection is populated', async () => {
      mockStore.activities.push({
        id: 'act1',
        owner: userId,
        type: 'case_created',
        message: 'Something happened',
        createdAt: new Date(),
        metadata: { caseNumber: '123' },
      });

      const res = await request(app)
        .get('/api/v1/dashboard/activity')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].message).toBe('Something happened');
    });

    test('GET /activity fallback returns generated activity logs from cases, clients, hearings', async () => {
      const now = new Date();
      mockStore.cases.push({
        id: 'c1',
        owner: userId,
        caseNumber: 'CASE-001',
        clientName: 'Client 1',
        priority: 'urgent',
        createdAt: now,
      });
      mockStore.clients.push({
        id: 'cl1',
        owner: userId,
        name: 'Client 1',
        email: 'cl1@test.com',
        createdAt: now,
      });
      mockStore.hearings.push({
        id: 'h1',
        owner: userId,
        caseId: 'c1',
        hearingDate: now,
        createdAt: now,
      });

      const res = await request(app)
        .get('/api/v1/dashboard/activity')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.some(a => a.type === 'case_created')).toBe(true);
      expect(res.body.some(a => a.type === 'client_registered')).toBe(true);
      expect(res.body.some(a => a.type === 'hearing_scheduled')).toBe(true);
    });

    test('GET /activity handles error path', async () => {
      dashboardShouldFail = true;

      const res = await request(app)
        .get('/api/v1/dashboard/activity')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch recent activity');
    });

    test('GET /notifications retrieves alerts, urgent cases and hearings', async () => {
      const now = new Date();
      mockStore.alerts.push({
        id: 'a1',
        owner: userId,
        alertTime: now,
        isRead: false,
      });
      mockStore.cases.push({
        id: 'c1',
        owner: userId,
        priority: 'urgent',
        hearingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
      });

      const res = await request(app)
        .get('/api/v1/dashboard/notifications')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.alerts.length).toBe(1);
      expect(res.body.urgentCases.length).toBe(1);
      expect(res.body.summary.totalUnread).toBe(1);
    });

    test('GET /notifications handles db failure gracefully', async () => {
      dashboardShouldFail = true;

      const res = await request(app)
        .get('/api/v1/dashboard/notifications')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch notifications');
    });
  });

  // ── 3.2 Legal Search Service Tests ──────────────────────────────────────────
  describe('Legal Search Service Tests', () => {
    test('searchLegal handles empty queries and sanitization', async () => {
      const { searchLegal } = await import('../services/legalSearchService.js');
      
      const emptyResult = await searchLegal('');
      expect(emptyResult.acts).toEqual([]);

      const specialCharsResult = await searchLegal('!!!');
      expect(specialCharsResult.acts).toEqual([]);
    });

    test('searchLegal performs hybrid search with fallback text searches', async () => {
      const { searchLegal } = await import('../services/legalSearchService.js');

      mockSearchStore.acts.push({
        _id: new mongoose.Types.ObjectId(),
        title: 'Indian Penal Code',
        actName: 'IPC',
        description: 'Murder cases etc',
        keywords: ['murder', 'ipc'],
        score: 8.5,
      });
      mockSearchStore.cases.push({
        _id: new mongoose.Types.ObjectId(),
        caseTitle: 'Kesavananda Bharati v. State of Kerala',
        court: 'Supreme Court',
        summary: 'Basic structure doctrine',
        keywords: ['constitution', 'structure'],
        score: 9.0,
      });
      mockSearchStore.sections.push({
        _id: new mongoose.Types.ObjectId(),
        sectionNumber: '302',
        title: 'Punishment for murder',
        actName: 'IPC',
        description: 'Death penalty or life imprisonment',
        keywords: ['murder', 'penalty'],
      });

      const results = await searchLegal('murder');
      expect(results.acts.length).toBeGreaterThan(0);
      expect(results.cases.length).toBeGreaterThan(0);
      expect(results.sections.length).toBeGreaterThan(0);

      expect(results.acts[0].title).toBe('Indian Penal Code');
    });

    test('searchLegal falls back to regex search when text query fails', async () => {
      const { searchLegal } = await import('../services/legalSearchService.js');

      mockSearchStore.acts.push({
        _id: new mongoose.Types.ObjectId(),
        title: 'Special Act',
        actName: 'SA',
        description: 'Regex match targets description',
        keywords: [],
      });

      mockActsModel._setShouldFailTextSearch(true);
      mockCasesModel._setShouldFailTextSearch(true);

      const results = await searchLegal('description');
      expect(results.acts.length).toBeGreaterThan(0);
      expect(results.acts[0].title).toBe('Special Act');
    });
  });

  // ── 3.3 Community Chat Route & Controller Tests ─────────────────────────────
  describe('Community Chat Routes & Controllers', () => {
    const targetUserId = '654321098765432109876542';
    
    beforeEach(() => {
      mockStore.users.push({
        _id: targetUserId,
        id: targetUserId,
        email: 'target@test.com',
        role: 'lawyer',
        status: 'active',
      });
    });

    test('GET /community/conversations lists conversations for user', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      mockStore.conversations.push({
        _id: convId,
        type: 'private',
        participants: [userId, targetUserId],
      });
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        isRemoved: false,
        isArchivedByUser: false,
        unreadCount: 0,
      });

      const res = await request(app)
        .get('/api/v1/community/conversations')
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.conversations.length).toBe(1);
    });

    test('POST /community/conversations creates a private conversation', async () => {
      const res = await request(app)
        .post('/api/v1/community/conversations')
        .set('Cookie', `token=${userToken}`)
        .send({ targetUserId, type: 'private' });

      expect(res.status).toBe(201);
      expect(res.body.conversation.type).toBe('private');

      // Attempting again should return the existing one
      const res2 = await request(app)
        .post('/api/v1/community/conversations')
        .set('Cookie', `token=${userToken}`)
        .send({ targetUserId, type: 'private' });

      expect(res2.status).toBe(200);
      expect(res2.body.existed).toBe(true);
    });

    test('POST /community/conversations rejects creation if blocked', async () => {
      mockStore.blockedusers.push({
        blockerId: targetUserId,
        blockedUserId: userId,
      });

      const res = await request(app)
        .post('/api/v1/community/conversations')
        .set('Cookie', `token=${userToken}`)
        .send({ targetUserId, type: 'private' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot message this user');
    });

    test('POST /community/conversations creates a group conversation', async () => {
      const res = await request(app)
        .post('/api/v1/community/conversations')
        .set('Cookie', `token=${userToken}`)
        .send({
          type: 'group',
          name: 'Colleague Group',
          participants: [targetUserId],
        });

      expect(res.status).toBe(201);
      expect(res.body.conversation.type).toBe('group');
      expect(res.body.conversation.name).toBe('Colleague Group');
    });

    test('GET /community/conversations/:conversationId returns conversation details with presence', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      mockStore.conversations.push({
        _id: convId,
        type: 'private',
        participants: [userId, targetUserId],
      });
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        isRemoved: false,
      });

      const res = await request(app)
        .get(`/api/v1/community/conversations/${convId}`)
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.conversation._id).toBe(convId);
      expect(res.body.participants.length).toBe(1);
    });

    test('GET /community/conversations/:conversationId/messages lists decrypted messages', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      mockStore.conversations.push({
        _id: convId,
        type: 'private',
      });
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        isRemoved: false,
      });
      mockStore.messages.push({
        conversationId: convId,
        senderId: userId,
        encryptedContent: 'cipher_hello there!',
        iv: 'iv_123',
        authTag: 'tag_123',
        isDeleted: false,
      });

      const res = await request(app)
        .get(`/api/v1/community/conversations/${convId}/messages`)
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBe(1);
      expect(res.body.messages[0].content).toBe('hello there!');
    });

    test('DELETE /community/conversations/:conversationId leaves conversation', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      mockStore.conversations.push({
        _id: convId,
        participants: [userId],
      });
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        isRemoved: false,
      });

      const res = await request(app)
        .delete(`/api/v1/community/conversations/${convId}`)
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      const participant = mockStore.participants.find(p => p.conversationId === convId && p.userId === userId);
      expect(participant.isRemoved).toBe(true);
    });

    test('PATCH /community/conversations/:conversationId/pin pins conversation', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        isRemoved: false,
        isPinnedByUser: false,
      });

      const res = await request(app)
        .patch(`/api/v1/community/conversations/${convId}/pin`)
        .set('Cookie', `token=${userToken}`)
        .send({ pin: true });

      expect(res.status).toBe(200);
      expect(res.body.pinned).toBe(true);
      
      const participant = mockStore.participants.find(p => p.conversationId === convId && p.userId === userId);
      expect(participant.isPinnedByUser).toBe(true);
    });

    test('PATCH /community/messages/:messageId edits message', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();
      mockStore.messages.push({
        _id: messageId,
        conversationId: convId,
        senderId: userId,
        encryptedContent: 'cipher_old',
        iv: 'iv_123',
        authTag: 'tag_123',
        isDeleted: false,
      });

      const res = await request(app)
        .patch(`/api/v1/community/messages/${messageId}`)
        .set('Cookie', `token=${userToken}`)
        .send({ content: 'new message text' });

      expect(res.status).toBe(200);
      
      const msg = mockStore.messages.find(m => m._id === messageId);
      expect(msg.isEdited).toBe(true);
      expect(msg.encryptedContent).toBe('cipher_new message text');
    });

    test('DELETE /community/messages/:messageId soft deletes message', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();
      mockStore.messages.push({
        _id: messageId,
        conversationId: convId,
        senderId: userId,
        encryptedContent: 'cipher_hello',
        iv: 'iv_123',
        authTag: 'tag_123',
        isDeleted: false,
      });

      const res = await request(app)
        .delete(`/api/v1/community/messages/${messageId}`)
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      
      const msg = mockStore.messages.find(m => m._id === messageId);
      expect(msg.isDeleted).toBe(true);
      expect(msg.encryptedContent).toBeNull();
    });

    test('PATCH /community/messages/:messageId/pin pins message', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();
      mockStore.messages.push({
        _id: messageId,
        conversationId: convId,
        senderId: userId,
        isPinned: false,
      });

      // 1. Without participant record (access denied)
      const resDenied = await request(app)
        .patch(`/api/v1/community/messages/${messageId}/pin`)
        .set('Cookie', `token=${userToken}`)
        .send({ pin: true });
      expect(resDenied.status).toBe(403);

      // 2. Seed a non-moderator participant record (access denied)
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        role: 'member',
        isRemoved: false,
      });
      const resDeniedMember = await request(app)
        .patch(`/api/v1/community/messages/${messageId}/pin`)
        .set('Cookie', `token=${userToken}`)
        .send({ pin: true });
      expect(resDeniedMember.status).toBe(403);

      // 3. Update participant to moderator (authorized)
      const partIdx = mockStore.participants.findIndex(p => p.conversationId === convId && p.userId === userId);
      mockStore.participants[partIdx].role = 'moderator';

      const res = await request(app)
        .patch(`/api/v1/community/messages/${messageId}/pin`)
        .set('Cookie', `token=${userToken}`)
        .send({ pin: true });

      expect(res.status).toBe(200);
      expect(res.body.isPinned).toBe(true);
      
      const msg = mockStore.messages.find(m => m._id === messageId);
      expect(msg.isPinned).toBe(true);
    });

    test('POST /community/messages/:messageId/forward forwards message to target conversation', async () => {
      const srcConvId = new mongoose.Types.ObjectId().toString();
      const dstConvId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();
      
      mockStore.conversations.push(
        { _id: srcConvId, type: 'private' },
        { _id: dstConvId, type: 'private' }
      );
      mockStore.participants.push(
        { conversationId: srcConvId, userId: userId, isRemoved: false },
        { conversationId: dstConvId, userId: userId, isRemoved: false }
      );
      mockStore.messages.push({
        _id: messageId,
        conversationId: srcConvId,
        senderId: userId,
        encryptedContent: 'cipher_important secret',
        iv: 'iv_123',
        authTag: 'tag_123',
        isDeleted: false,
      });

      const res = await request(app)
        .post(`/api/v1/community/messages/${messageId}/forward`)
        .set('Cookie', `token=${userToken}`)
        .send({ targetConversationId: dstConvId });

      expect(res.status).toBe(200);
      expect(res.body.messageId).toBeDefined();

      const fwdMsg = mockStore.messages.find(m => String(m._id) === String(res.body.messageId));
      expect(fwdMsg.encryptedContent).toBe('cipher_important secret');
      expect(String(fwdMsg.conversationId)).toBe(String(dstConvId));
    });

    test('GET /community/messages/search/:conversationId performs decrypted search client-side', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      mockStore.participants.push({
        conversationId: convId,
        userId: userId,
        isRemoved: false,
      });
      mockStore.messages.push(
        { conversationId: convId, senderId: userId, encryptedContent: 'cipher_apples are tasty', iv: 'iv_123', authTag: 'tag_123', isDeleted: false },
        { conversationId: convId, senderId: userId, encryptedContent: 'cipher_oranges are okay', iv: 'iv_123', authTag: 'tag_123', isDeleted: false }
      );

      const res = await request(app)
        .get(`/api/v1/community/messages/search/${convId}?q=apples`)
        .set('Cookie', `token=${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].content).toBe('apples are tasty');
    });
  });
});
