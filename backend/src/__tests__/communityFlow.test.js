import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

// ── 1. Mocking Dependencies ──────────────────────────────────────────────────

const mockStore = {
  users: [],
  conversations: [],
  participants: [],
  messages: [],
  blockedusers: [],
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.conversations = [];
  mockStore.participants = [];
  mockStore.messages = [];
  mockStore.blockedusers = [];
}

// Helper to create mocked MongoDB queries
function createQueryObj(wrapped, storeName) {
  const query = {
    select: () => query,
    lean: () => query,
    populate: (opts) => {
      // Nested populate simulation for participants & senderId
      if (storeName === 'participants' && Array.isArray(wrapped)) {
        wrapped.forEach(p => {
          if (p.conversationId) {
            // Find in mock store and clone to avoid side-effects
            const convDoc = mockStore.conversations.find(c => String(c._id) === String(p.conversationId));
            if (convDoc) {
              const conv = { ...convDoc };
              // Simulate nested populate of participants
              if (conv.participants) {
                conv.participants = conv.participants.map(partId => {
                  if (typeof partId === 'object') {return partId;}
                  const user = mockStore.users.find(u => String(u._id) === String(partId));
                  return user ? { _id: user._id, name: user.name, email: user.email, role: user.role } : partId;
                });
              }
              // Simulate nested populate of lastMessage.senderId
              if (conv.lastMessage && conv.lastMessage.senderId) {
                const user = mockStore.users.find(u => String(u._id) === String(conv.lastMessage.senderId));
                if (user) {
                  conv.lastMessage = {
                    ...conv.lastMessage,
                    senderId: { _id: user._id, name: user.name, email: user.email, role: user.role }
                  };
                }
              }
              p.conversationId = conv;
            }
          }
          if (p.userId) {
            const user = mockStore.users.find(u => String(u._id) === String(p.userId));
            p.userId = user ? { _id: user._id, name: user.name, email: user.email, role: user.role } : p.userId;
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
    const doc = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...data,
    };
    mockStore[storeName].push(doc);
    return doc;
  });

  MockClass.exists = jest.fn().mockImplementation(async (query) => {
    return mockStore[storeName].some(x => {
      if (query.$or) {
        return query.$or.some(q => matchesQuery(x, q));
      }
      return matchesQuery(x, query);
    });
  });

  MockClass.insertMany = jest.fn().mockImplementation(async (arr) => {
    const docs = arr.map(data => ({
      _id: new mongoose.Types.ObjectId().toString(),
      ...data,
    }));
    mockStore[storeName].push(...docs);
    return docs;
  });

  MockClass.updateOne = jest.fn().mockImplementation((query, update) => {
    const doc = mockStore[storeName].find(x => matchesQuery(x, query));
    if (doc && update.$set) {
      Object.assign(doc, update.$set);
    }
    return Promise.resolve({ nModified: doc ? 1 : 0 });
  });

  return MockClass;
}

// Register unstable mocks
jest.unstable_mockModule('../community/models/Conversation.js', () => ({
  default: createMockModel('conversations'),
}));
jest.unstable_mockModule('../community/models/ConversationParticipant.js', () => ({
  default: createMockModel('participants'),
}));
jest.unstable_mockModule('../community/models/Message.js', () => ({
  default: createMockModel('messages'),
}));
jest.unstable_mockModule('../community/models/BlockedUser.js', () => ({
  default: createMockModel('blockedusers'),
}));

// Mock Socket.IO server and helper services
jest.unstable_mockModule('../community/socket/socketServer.js', () => ({
  initSocketServer: jest.fn(),
  emitToConversation: jest.fn(),
  disconnectUserSockets: jest.fn(),
}));
jest.unstable_mockModule('../community/services/presenceService.js', () => ({
  getBulkPresence: jest.fn().mockResolvedValue({}),
}));

// Import target controllers after mocking
let formatConversation, listConversations, createPrivateConversation, getConversationDetails;

beforeAll(async () => {
  const mod = await import('../community/controllers/conversationController.js');
  formatConversation = mod.formatConversation;
  listConversations = mod.listConversations;
  createPrivateConversation = mod.createPrivateConversation;
  getConversationDetails = mod.getConversationDetails;
});

// ── 2. Test Cases ────────────────────────────────────────────────────────────

describe('Community module contract and formatting tests', () => {
  const myUserId = '654321098765432109876543';
  const otherUserId = '123456789012345678901234';

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();
  });

  test('1. Empty conversation list formatting matches schema', () => {
    const result = formatConversation(null, myUserId);
    expect(result).toBeNull();
  });

  test('2. Conversation with no messages should map lastMessage to undefined/safe', () => {
    const conv = {
      _id: 'conv123',
      type: 'private',
      participants: [myUserId],
      pinnedMessages: [],
    };
    const result = formatConversation(conv, myUserId);
    expect(result.lastMessage).toBeUndefined();
    expect(result.pinnedMessages).toEqual([]);
  });

  test('3. Conversation with deleted user should map to Unknown User placeholder', () => {
    const conv = {
      _id: 'conv123',
      type: 'private',
      participants: [
        otherUserId // missing / unpopulated ID string
      ],
      pinnedMessages: [],
    };
    const result = formatConversation(conv, myUserId);
    expect(result.participants[0]).toEqual({
      _id: otherUserId,
      name: 'Unknown User',
      email: '',
      role: 'user',
      avatarUrl: null,
    });
  });

  test('4. Conversation/user with missing avatar should map to null avatarUrl', () => {
    const conv = {
      _id: 'conv123',
      type: 'private',
      participants: [
        { _id: otherUserId, name: 'Alice', email: 'alice@test.com' } // missing avatarUrl
      ],
      avatarUrl: undefined,
      pinnedMessages: [],
    };
    const result = formatConversation(conv, myUserId);
    expect(result.avatarUrl).toBeNull();
    expect(result.participants[0].avatarUrl).toBeNull();
  });

  test('5. Conversation with missing participants should default to empty array', () => {
    const conv = {
      _id: 'conv123',
      type: 'private',
      participants: null,
      pinnedMessages: [],
    };
    const result = formatConversation(conv, myUserId);
    expect(result.participants).toEqual([]);
  });

  test('6. Corrupted conversation record should fall back to schema defaults', () => {
    const conv = {
      _id: 'conv123',
      // missing isEncrypted, isArchived, isReadOnly, description
    };
    const result = formatConversation(conv, myUserId);
    expect(result.isEncrypted).toBe(false);
    expect(result.isArchived).toBe(false);
    expect(result.isReadOnly).toBe(false);
    expect(result.description).toBeNull();
    expect(result.pinnedMessages).toEqual([]);
  });

  test('7. Community listConversations endpoint should return populated and mapped array', async () => {
    // Add user and conversation participant record
    mockStore.users.push(
      { _id: myUserId, name: 'Me', email: 'me@test.com', role: 'lawyer' },
      { _id: otherUserId, name: 'Alice', email: 'alice@test.com', role: 'lawyer' }
    );
    mockStore.conversations.push({
      _id: 'conv1',
      type: 'private',
      participants: [myUserId, otherUserId],
      pinnedMessages: [],
      isEncrypted: true,
    });
    mockStore.participants.push({
      conversationId: 'conv1',
      userId: myUserId,
      unreadCount: 5,
      isRemoved: false,
      isArchivedByUser: false,
    });

    const req = {
      user: { userId: myUserId },
      query: { page: 1, limit: 30, archived: 'false' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        expect(data.ok).toBe(true);
        expect(data.conversations.length).toBe(1);
        const c = data.conversations[0];
        expect(c.unreadCount).toBe(5);
        expect(c.participants[0].email).toBe('me'); // my email mapped to 'me'
        expect(c.participants[1].name).toBe('Alice');
        expect(c.pinnedMessages).toEqual([]);
      }),
    };

    await listConversations(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('8. createPrivateConversation returns fully formatted conversation', async () => {
    mockStore.users.push(
      { _id: myUserId, name: 'Me', email: 'me@test.com', role: 'lawyer' },
      { _id: otherUserId, name: 'Alice', email: 'alice@test.com', role: 'lawyer' }
    );

    const req = {
      user: { userId: myUserId },
      body: { targetUserId: otherUserId, type: 'private' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        expect(data.ok).toBe(true);
        expect(data.conversation.type).toBe('private');
        expect(data.conversation.pinnedMessages).toEqual([]);
        expect(data.conversation.participants.length).toBe(2);
      }),
    };

    await createPrivateConversation(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('9. getConversationDetails formats and returns enriched details', async () => {
    mockStore.users.push(
      { _id: myUserId, name: 'Me', email: 'me@test.com', role: 'lawyer' },
      { _id: otherUserId, name: 'Alice', email: 'alice@test.com', role: 'lawyer' }
    );
    mockStore.conversations.push({
      _id: 'conv1',
      type: 'private',
      participants: [myUserId, otherUserId],
      pinnedMessages: [],
    });
    mockStore.participants.push({
      conversationId: 'conv1',
      userId: myUserId,
      isRemoved: false,
    });

    const req = {
      user: { userId: myUserId },
      params: { conversationId: 'conv1' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        expect(data.ok).toBe(true);
        expect(data.conversation._id).toBe('conv1');
        expect(data.conversation.pinnedMessages).toEqual([]);
        expect(data.participants.length).toBe(1);
      }),
    };

    await getConversationDetails(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('10. listConversations with zero records does not crash and returns empty array', async () => {
    const req = {
      user: { userId: myUserId },
      query: { page: 1, limit: 30, archived: 'false' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        expect(data.ok).toBe(true);
        expect(data.conversations).toEqual([]);
      }),
    };

    await listConversations(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});
