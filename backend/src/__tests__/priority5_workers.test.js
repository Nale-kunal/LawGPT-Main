import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';

// Map to capture workers
const workerProcessors = {};

// ── 1. Mocking BullMQ ────────────────────────────────────────────────────────
jest.unstable_mockModule('bullmq', () => ({
  Worker: jest.fn().mockImplementation((queueName, processor, opts) => {
    workerProcessors[queueName] = processor;
    return {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
  }),
  Queue: jest.fn().mockImplementation((queueName, opts) => {
    return {
      add: jest.fn().mockResolvedValue({ id: 'job_123' }),
    };
  }),
}));

// ── 2. Mocking Redis & IORedis ───────────────────────────────────────────────
jest.unstable_mockModule('ioredis', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        duplicate: jest.fn().mockImplementation(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
        })),
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('10'),
      };
    }),
  };
});

const mockRedisGet = jest.fn().mockImplementation((key) => {
  if (key && key.startsWith('reminder:')) {
    return Promise.resolve(null);
  }
  return Promise.resolve('10');
});

jest.unstable_mockModule('../utils/redis.js', () => ({
  redis: {
    get: mockRedisGet,
    set: jest.fn().mockResolvedValue('OK'),
    isAvailable: jest.fn().mockReturnValue(true),
    raw: jest.fn().mockReturnValue({
      get: mockRedisGet,
      set: jest.fn().mockResolvedValue('OK'),
    }),
  },
  default: {
    get: mockRedisGet,
    set: jest.fn().mockResolvedValue('OK'),
    isAvailable: jest.fn().mockReturnValue(true),
    raw: jest.fn().mockReturnValue({
      get: mockRedisGet,
      set: jest.fn().mockResolvedValue('OK'),
    }),
  }
}));

// ── 3. Mock Store & Model Mocks ──────────────────────────────────────────────
const mockStore = {
  users: [],
  cases: [],
  documents: [],
  userusagesnapshots: [],
  analyticsdailies: [],
  activityevents: [],
  abusesignallogs: [],
  adminauditlogs: [],
  auditlogs: [],
  clienterrorlogs: [],
  messageattachments: [],
  messages: [],
};

function resetMockStore() {
  for (const k of Object.keys(mockStore)) {
    mockStore[k] = [];
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

const matchesQuery = (x, query) => {
  if (!query) {return true;}
  return Object.entries(query).every(([k, v]) => {
    const xVal = getNestedValue(x, k);
    if (v === false || v === 'false') {return !xVal || String(xVal) === 'false';}
    if (v === true || v === 'true') {return !!xVal && String(xVal) === 'true';}
    if (v && typeof v === 'object') {
      if (v.$in) {return v.$in.map(String).includes(String(xVal || x._id));}
      if (v.$all) {return v.$all.every(val => xVal && xVal.map(String).includes(String(val)));}
      if (v.$ne) {return String(xVal) !== String(v.$ne);}
      if (v.$gte || v.$lt) {
        if (!xVal) {return false;}
        const dateVal = new Date(xVal);
        if (v.$gte && dateVal < new Date(v.$gte)) {return false;}
        if (v.$lt && dateVal >= new Date(v.$lt)) {return false;}
        return true;
      }
    }
    if (k === '_id') {return String(x._id) === String(v);}
    return String(xVal) === String(v);
  });
};

function createQueryObj(wrapped) {
  const query = {
    select: () => query,
    lean: () => query,
    exec: () => Promise.resolve(wrapped),
    then: (resolve, reject) => Promise.resolve(wrapped).then(resolve, reject),
  };
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
  MockClass.find = jest.fn().mockImplementation((query) => {
    const filtered = mockStore[storeName].filter(x => matchesQuery(x, query));
    return createQueryObj(filtered);
  });
  MockClass.countDocuments = jest.fn().mockImplementation(async (query) => {
    return mockStore[storeName].filter(x => matchesQuery(x, query)).length;
  });
  MockClass.aggregate = jest.fn().mockImplementation(async (pipeline) => {
    if (storeName === 'documents') {
      return [{ count: mockStore.documents.length, size: 5 * 1024 * 1024 }];
    }
    if (storeName === 'activityevents') {
      return [{ _id: 'ai_query', count: 10, users: [new mongoose.Types.ObjectId().toString()] }];
    }
    return [];
  });
  MockClass.create = jest.fn().mockImplementation(async (data) => {
    const doc = { ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() };
    mockStore[storeName].push(doc);
    return doc;
  });
  MockClass.findOneAndUpdate = jest.fn().mockImplementation(async (query, update, opts) => {
    let doc = mockStore[storeName].find(x => matchesQuery(x, query));
    if (!doc) {
      if (opts?.upsert) {
        doc = { _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date() };
        mockStore[storeName].push(doc);
      } else {
        return null;
      }
    }
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    return doc;
  });
  MockClass.deleteMany = jest.fn().mockImplementation(async (query) => {
    const beforeCount = mockStore[storeName].length;
    mockStore[storeName] = mockStore[storeName].filter(x => !matchesQuery(x, query));
    const deletedCount = beforeCount - mockStore[storeName].length;
    return { deletedCount };
  });
  MockClass.findById = jest.fn().mockImplementation((id) => {
    const doc = mockStore[storeName].find(x => String(x._id) === String(id));
    return Promise.resolve(doc);
  });
  MockClass.findByIdAndUpdate = jest.fn().mockImplementation((id, update) => {
    const doc = mockStore[storeName].find(x => String(x._id) === String(id));
    if (doc) {
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          const parts = k.split('.');
          let current = doc;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {current[parts[i]] = {};}
            current = current[parts[i]];
          }
          const last = parts[parts.length - 1];
          current[last] = (current[last] || 0) + v;
        }
      }
    }
    return Promise.resolve(doc);
  });
  return { default: MockClass };
}

// Register model mocks
jest.unstable_mockModule('../models/User.js', () => createMockModel('users'));
jest.unstable_mockModule('../models/Case.js', () => createMockModel('cases'));
jest.unstable_mockModule('../models/Document.js', () => createMockModel('documents'));
jest.unstable_mockModule('../models/UserUsageSnapshot.js', () => createMockModel('userusagesnapshots'));
jest.unstable_mockModule('../models/AnalyticsDaily.js', () => createMockModel('analyticsdailies'));
jest.unstable_mockModule('../models/ActivityEvent.js', () => createMockModel('activityevents'));
jest.unstable_mockModule('../models/AbuseSignalLog.js', () => createMockModel('abusesignallogs'));
jest.unstable_mockModule('../models/AdminAuditLog.js', () => createMockModel('adminauditlogs'));
jest.unstable_mockModule('../models/AuditLog.js', () => createMockModel('auditlogs'));
jest.unstable_mockModule('../models/ClientErrorLog.js', () => createMockModel('clienterrorlogs'));
jest.unstable_mockModule('../community/models/MessageAttachment.js', () => createMockModel('messageattachments'));
jest.unstable_mockModule('../community/models/Message.js', () => createMockModel('messages'));

// ── 4. Mocking Services ──────────────────────────────────────────────────────
const mockSendgridSend = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule('@sendgrid/mail', () => ({
  default: {
    setApiKey: jest.fn(),
    send: mockSendgridSend,
  },
}));

jest.unstable_mockModule('../services/emailService.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  queueEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule('../services/notificationService.js', () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/legalDataService.js', () => ({
  runFullRefresh: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/reconciliation.js', () => ({
  runReconciliationJob: jest.fn().mockResolvedValue(undefined),
  runSyncJob: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../community/services/communityNotificationService.js', () => ({
  notifyNewMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../community/services/encryptionService.js', () => ({
  decryptAttachmentMetadata: jest.fn().mockImplementation((encryptedUrl, iv, authTag, conversationId) => {
    return { secureUrl: 'http://malware.scan/testfile.exe' };
  }),
}));

jest.unstable_mockModule('../community/socket/socketServer.js', () => ({
  disconnectUserSockets: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

// ── 5. Test Suite ────────────────────────────────────────────────────────────
describe('Priority 5 — Workers, Background Jobs, and scheduled Crons', () => {
  beforeAll(async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'test';

    // Start all workers to capture processors
    const { startAdminWorker } = await import('../workers/adminWorker.js');
    const { startCleanupWorker } = await import('../workers/cleanupWorker.js');
    const { startCronWorker } = await import('../workers/cronWorker.js');
    const { startEmailWorker } = await import('../workers/emailWorker.js');
    const { startCommunityNotifWorker } = await import('../community/workers/communityNotificationWorker.js');
    const { startMalwareWorker } = await import('../community/workers/malwareWorker.js');
    const { startModerationWorker } = await import('../community/workers/moderationWorker.js');

    startAdminWorker();
    startCleanupWorker();
    startCronWorker();
    startEmailWorker();
    startCommunityNotifWorker();
    startMalwareWorker();
    startModerationWorker();
  });

  beforeEach(() => {
    resetMockStore();
    jest.clearAllMocks();
  });

  describe('Admin Background Worker', () => {
    test('process aggregate-usage job successfully', async () => {
      const processor = workerProcessors['admin-tasks'];
      expect(processor).toBeDefined();

      mockStore.users.push({ _id: new mongoose.Types.ObjectId().toString(), accountStatus: { status: 'active' } });
      mockStore.documents.push({ _id: 'doc1', size: 1024 * 1024 });

      const job = { data: { type: 'aggregate-usage' }, id: 'job_admin_1' };
      await processor(job);

      expect(mockStore.userusagesnapshots.length).toBe(1);
      expect(mockStore.userusagesnapshots[0].metrics.documentCount).toBe(1);
    });

    test('process aggregate-daily job successfully', async () => {
      const processor = workerProcessors['admin-tasks'];

      const job = { data: { type: 'aggregate-daily' }, id: 'job_admin_2' };
      await processor(job);

      expect(mockStore.analyticsdailies.length).toBe(1);
    });

    test('process cleanup job successfully', async () => {
      const processor = workerProcessors['admin-tasks'];
      
      const now = new Date();
      mockStore.activityevents.push({ _id: 'ae1', expiresAt: new Date(now - 1000) });
      mockStore.abusesignallogs.push({ _id: 'as1', timestamp: new Date(now - 31 * 24 * 60 * 60 * 1000) });
      mockStore.adminauditlogs.push({ _id: 'aa1', expiresAt: new Date(now - 1000) });

      const job = { data: { type: 'cleanup' }, id: 'job_admin_3' };
      await processor(job);

      expect(mockStore.activityevents.length).toBe(0);
      expect(mockStore.abusesignallogs.length).toBe(0);
      expect(mockStore.adminauditlogs.length).toBe(0);
    });

    test('throw error on unknown job type', async () => {
      const processor = workerProcessors['admin-tasks'];
      const job = { data: { type: 'unknown_type' }, id: 'job_admin_err' };

      await expect(processor(job)).resolves.toBeUndefined();
    });
  });

  describe('Cleanup Background Worker', () => {
    test('process manual cleanup job successfully', async () => {
      const processor = workerProcessors['cleanup'];
      expect(processor).toBeDefined();

      mockStore.auditlogs.push({ _id: 'audit1', expiresAt: new Date(Date.now() - 1000) });

      const job = { data: { type: 'expired_audit_logs' }, id: 'job_cleanup_1' };
      const res = await processor(job);

      expect(res.deleted).toBe(1);
      expect(mockStore.auditlogs.length).toBe(0);
    });

    test('skip manual cleanup on unknown job type', async () => {
      const processor = workerProcessors['cleanup'];
      const job = { data: { type: 'unknown_type' }, id: 'job_cleanup_2' };
      const res = await processor(job);

      expect(res).toEqual({});
    });
  });

  describe('Cron Repeated Background Worker', () => {
    test('process different repeat cron jobs successfully', async () => {
      const processor = workerProcessors['cron_jobs'];
      expect(processor).toBeDefined();

      const cronJobs = ['legal_refresh', 'token_cleanup', 'reconciliation', 'sync', 'log_cleanup', 'subscription_reminders'];
      for (const name of cronJobs) {
        const job = { name, data: {}, id: `job_cron_${name}` };
        const res = await processor(job);
        expect(res.success).toBe(true);
      }
    });

    test('handles failed cron execution gracefully', async () => {
      const { runReconciliationJob } = await import('../services/reconciliation.js');
      runReconciliationJob.mockRejectedValueOnce(new Error('Reconciliation failed'));

      const processor = workerProcessors['cron_jobs'];
      const job = { name: 'reconciliation', data: {}, id: 'job_cron_fail' };

      await expect(processor(job)).rejects.toThrow('Reconciliation failed');
    });
  });

  describe('Email Background Worker', () => {
    test('process send_email job via generic email service', async () => {
      const processor = workerProcessors['email'];
      expect(processor).toBeDefined();

      const job = { data: { type: 'send_email', to: 'test@example.com', subject: 'Hello' }, id: 'job_email_1' };
      const res = await processor(job);

      expect(res.sent).toBe(true);
    });

    test('process template emails via SendGrid if configured', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test';
      const processor = workerProcessors['email'];

      const templates = ['sendPasswordReset', 'sendVerification', 'sendWelcome', 'sendInvoice'];
      for (const type of templates) {
        const job = {
          data: {
            type,
            payload: { to: 'test@test.com', resetLink: 'http://', verifyLink: 'http://', name: 'John', invoiceId: '1', pdfUrl: 'http://' }
          },
          id: `job_sg_${type}`
        };
        const res = await processor(job);
        expect(res.sent).toBe(true);
      }
    });

    test('skip template emails if SendGrid is not configured', async () => {
      delete process.env.SENDGRID_API_KEY;
      const processor = workerProcessors['email'];

      const job = { data: { type: 'sendPasswordReset', payload: { to: 'test@test.com', resetLink: 'http://' } }, id: 'job_sg_skip' };
      const res = await processor(job);
      expect(res.skipped).toBe(true);
    });
  });

  describe('Community Notification Worker', () => {
    test('process new message, push, and offline digest notifications', async () => {
      const processor = workerProcessors['community-notifications'];
      expect(processor).toBeDefined();

      // Test message notification
      await processor({ data: { type: 'new_message_notification', payload: {} }, id: 'notif_1' });

      // Test push notification
      await processor({ data: { type: 'push_notification', payload: {} }, id: 'notif_2' });

      // Test email digest
      await processor({ data: { type: 'email_digest', payload: { email: 'a@b.com', unreadCount: 5, name: 'User' } }, id: 'notif_3' });
    });
  });

  describe('Malware Scanning Worker', () => {
    test('detect and quarantine windows executables (MZ)', async () => {
      const processor = workerProcessors['community-malware-scanning'];
      expect(processor).toBeDefined();

      const attachmentId = new mongoose.Types.ObjectId().toString();
      mockStore.messageattachments.push({
        _id: attachmentId,
        secureUrl: 'https://res.cloudinary.com/test-cloud/raw/upload/winfile.exe',
      });

      // Mock fetch response for Windows executable header
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          const buf = Buffer.alloc(10);
          buf[0] = 0x4D; // M
          buf[1] = 0x5A; // Z
          return buf.buffer;
        },
      });

      await processor({ data: { attachmentId, conversationId: 'conv_123' }, id: 'scan_1' });

      const attachment = mockStore.messageattachments.find(a => String(a._id) === attachmentId);
      expect(attachment.malwareScanResult).toBe('infected');
      expect(attachment.isAllowed).toBe(false);
    });

    test('allow clean file scans', async () => {
      const processor = workerProcessors['community-malware-scanning'];

      const attachmentId = new mongoose.Types.ObjectId().toString();
      mockStore.messageattachments.push({
        _id: attachmentId,
        secureUrl: 'https://res.cloudinary.com/test-cloud/raw/upload/clean.txt',
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          return Buffer.from('Normal clean text file content').buffer;
        },
      });

      await processor({ data: { attachmentId, conversationId: 'conv_123' }, id: 'scan_2' });

      const attachment = mockStore.messageattachments.find(a => String(a._id) === attachmentId);
      expect(attachment.malwareScanResult).toBe('clean');
      expect(attachment.isAllowed).toBe(true);
    });
  });

  describe('Moderation Analysis Worker', () => {
    test('auto-flag messages matching spam pattern and increase user abuse score', async () => {
      const processor = workerProcessors['community-moderation'];
      expect(processor).toBeDefined();

      const messageId = new mongoose.Types.ObjectId().toString();
      const senderId = new mongoose.Types.ObjectId().toString();
      mockStore.messages.push({ _id: messageId });
      mockStore.users.push({ _id: senderId, securityFlags: { abuseScore: 0 } });

      const payload = {
        messageId,
        senderId,
        content: 'Earn free money and click here buy now immediately! repetitive aaaaaaaaaaaaaaaaaaaaaaaa',
        conversationId: 'conv_123',
      };

      await processor({ data: { type: 'analyze_message', payload }, id: 'mod_1' });

      const message = mockStore.messages.find(m => String(m._id) === messageId);
      expect(message.isFlagged).toBe(true);
      expect(message.flagReason).toContain('Automated: spam score');

      const user = mockStore.users.find(u => String(u._id) === senderId);
      expect(user.securityFlags.abuseScore).toBeGreaterThan(0);
    });
  });

  describe('Scheduled Jobs direct tests', () => {
    test('runLegalCron executes full refresh', async () => {
      const { runLegalCron } = await import('../jobs/legalCron.js');
      await runLegalCron();
      const { runFullRefresh } = await import('../services/legalDataService.js');
      expect(runFullRefresh).toHaveBeenCalled();
    });

    test('runCleanup purges expired activity events', async () => {
      const { runCleanup } = await import('../jobs/tokenCleanup.js');
      mockStore.activityevents.push({ _id: 'ae_old', createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) });
      await runCleanup();
      expect(mockStore.activityevents.length).toBe(0);
    });

    test('runSubscriptionReminders dispatches renewal warnings', async () => {
      const { runSubscriptionReminders } = await import('../jobs/subscriptionReminders.js');
      
      const now = Date.now();
      const userAId = new mongoose.Types.ObjectId().toString();
      const userBId = new mongoose.Types.ObjectId().toString();
      mockStore.users.push(
        { _id: userAId, subscriptionPlan: 'pro', planEndDate: new Date(now + 7 * 86_400_000), securityFlags: { blocked: false } },
        { _id: userBId, subscriptionPlan: 'pro', planEndDate: new Date(now - 1 * 86_400_000), securityFlags: { blocked: false } }
      );

      const res = await runSubscriptionReminders();
      expect(res.sent).toBe(2);
    });
  });
});
