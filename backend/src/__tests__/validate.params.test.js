/**
 * validate.params.test.js
 *
 * Regression tests for:
 *  - idParamSchema  (ObjectId type-confusion prevention)
 *  - documentFilesQuerySchema  (folderId NoSQL injection prevention)
 *  - validateCloudinaryUrl     (Cloudinary SSRF allowlist)
 *  - isAllowedFetchUrl         (internal SSRF guard)
 *  - sanitize()                (log sanitizer deep redaction)
 */

import { describe, test, expect, beforeAll } from '@jest/globals';

// ── Minimum env setup — prevents env.js fail-fast from calling process.exit ───
// urlValidator.js → env.js runs validateEnv() at module load time.
// We must set these before any dynamic import of those modules.
beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-for-test';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars-for-test';
    process.env.ADMIN_INTERNAL_SECRET = 'test-admin-internal-secret-32chars-ok';
});

// ── 1. idParamSchema ─────────────────────────────────────────────────────────

describe('idParamSchema — ObjectId type-confusion prevention', () => {
    test('accepts a valid 24-char hex ObjectId', async () => {
        const { idParamSchema } = await import('../../src/schemas/paramSchemas.js');
        const result = idParamSchema.safeParse({ id: '507f1f77bcf86cd799439011' });
        expect(result.success).toBe(true);
    });

    test('rejects a non-hex string', async () => {
        const { idParamSchema } = await import('../../src/schemas/paramSchemas.js');
        const result = idParamSchema.safeParse({ id: 'not-an-objectid' });
        expect(result.success).toBe(false);
    });

    test('rejects an object (type confusion)', async () => {
        const { idParamSchema } = await import('../../src/schemas/paramSchemas.js');
        const result = idParamSchema.safeParse({ id: { $ne: null } });
        expect(result.success).toBe(false);
    });

    test('rejects an array', async () => {
        const { idParamSchema } = await import('../../src/schemas/paramSchemas.js');
        const result = idParamSchema.safeParse({ id: ['507f1f77bcf86cd799439011'] });
        expect(result.success).toBe(false);
    });

    test('rejects empty string', async () => {
        const { idParamSchema } = await import('../../src/schemas/paramSchemas.js');
        const result = idParamSchema.safeParse({ id: '' });
        expect(result.success).toBe(false);
    });

    test('rejects a 23-char hex string (too short)', async () => {
        const { idParamSchema } = await import('../../src/schemas/paramSchemas.js');
        const result = idParamSchema.safeParse({ id: '507f1f77bcf86cd79943901' }); // 23 chars
        expect(result.success).toBe(false);
    });
});

// ── 2. documentFilesQuerySchema — folderId injection prevention ───────────────

describe('documentFilesQuerySchema — folderId NoSQL injection prevention', () => {
    test('accepts a valid ObjectId folderId', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({ folderId: '507f1f77bcf86cd799439011' });
        expect(result.success).toBe(true);
    });

    test('accepts missing folderId (root files)', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({});
        expect(result.success).toBe(true);
    });

    test('normalises folderId="null" sentinel to undefined', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({ folderId: 'null' });
        expect(result.success).toBe(true);
        expect(result.data.folderId).toBeUndefined();
    });

    test('normalises folderId="" sentinel to undefined', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({ folderId: '' });
        expect(result.success).toBe(true);
        expect(result.data.folderId).toBeUndefined();
    });

    test('rejects a non-ObjectId folderId (injection attempt)', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({ folderId: '[$ne]=null' });
        expect(result.success).toBe(false);
    });

    test('accepts all="true"', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({ all: 'true' });
        expect(result.success).toBe(true);
    });

    test('rejects invalid all value', async () => {
        const { documentFilesQuerySchema } = await import('../../src/schemas/paramSchemas.js');
        const result = documentFilesQuerySchema.safeParse({ all: 'yes' });
        expect(result.success).toBe(false);
    });
});

// ── 3. validateCloudinaryUrl — SSRF allowlist ─────────────────────────────────

describe('validateCloudinaryUrl — Cloudinary SSRF allowlist', () => {
    test('accepts a valid Cloudinary CDN URL', async () => {
        const { validateCloudinaryUrl } = await import('../../src/utils/urlValidator.js');
        // Cloud-name path check is only enforced when CLOUDINARY_CLOUD_NAME env var is set.
        // In test env it won't be set, so any valid res.cloudinary.com HTTPS URL passes.
        const result = validateCloudinaryUrl('https://res.cloudinary.com/testcloud/image/upload/sample.jpg');
        expect(result.ok).toBe(true);
    });

    test('rejects a non-Cloudinary HTTPS URL', async () => {
        const { validateCloudinaryUrl } = await import('../../src/utils/urlValidator.js');
        const result = validateCloudinaryUrl('https://evil-site.example.com/steal-credentials');
        expect(result.ok).toBe(false);
    });

    test('rejects http:// Cloudinary URL (must be https)', async () => {
        const { validateCloudinaryUrl } = await import('../../src/utils/urlValidator.js');
        const result = validateCloudinaryUrl('http://res.cloudinary.com/demo/image/upload/sample.jpg');
        expect(result.ok).toBe(false);
    });

    test('rejects a loopback address', async () => {
        const { validateCloudinaryUrl } = await import('../../src/utils/urlValidator.js');
        const result = validateCloudinaryUrl('http://127.0.0.1/admin');
        expect(result.ok).toBe(false);
    });

    test('rejects an empty string', async () => {
        const { validateCloudinaryUrl } = await import('../../src/utils/urlValidator.js');
        const result = validateCloudinaryUrl('');
        expect(result.ok).toBe(false);
    });
});

// ── 4. isAllowedFetchUrl — internal SSRF guard ────────────────────────────────

describe('isAllowedFetchUrl — SSRF protection for server-side fetches', () => {
    test('accepts a public HTTPS URL', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('https://hooks.slack.com/services/T00/B00/xyz');
        expect(result.ok).toBe(true);
    });

    test('rejects a loopback URL (127.0.0.1)', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('http://127.0.0.1:8080/admin');
        expect(result.ok).toBe(false);
    });

    test('rejects a private 10.x.x.x address', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('http://10.0.0.1/internal-api');
        expect(result.ok).toBe(false);
    });

    test('rejects a private 192.168.x.x address', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('http://192.168.1.100/secret');
        expect(result.ok).toBe(false);
    });

    test('rejects localhost hostname', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('http://localhost:3000/metrics');
        expect(result.ok).toBe(false);
    });

    test('rejects a metadata endpoint (169.254.x.x)', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('http://169.254.169.254/latest/meta-data/');
        expect(result.ok).toBe(false);
    });

    test('rejects http:// URL (must be https)', async () => {
        const { isAllowedFetchUrl } = await import('../../src/utils/urlValidator.js');
        const result = isAllowedFetchUrl('http://example.com/webhook');
        expect(result.ok).toBe(false);
    });
});

// ── 5. sanitize() — log sanitizer deep redaction ─────────────────────────────

describe('sanitize() — log sanitizer deep redaction', () => {
    test('redacts password field', async () => {
        const { sanitize } = await import('../../src/utils/logSanitizer.js');
        const result = sanitize({ user: { email: 'a@b.com', password: 'secret123' } });
        expect(JSON.stringify(result)).not.toContain('secret123');
        expect(result.user.password).toBe('[REDACTED]');
    });

    test('redacts authorization header value', async () => {
        const { sanitize } = await import('../../src/utils/logSanitizer.js');
        const result = sanitize({ headers: { authorization: 'Bearer eyJhb...' } });
        const json = JSON.stringify(result);
        expect(json).not.toContain('eyJhb');
    });

    test('redacts nested token field', async () => {
        const { sanitize } = await import('../../src/utils/logSanitizer.js');
        const result = sanitize({ data: { accessToken: 'super-secret-jwt' } });
        const json = JSON.stringify(result);
        expect(json).not.toContain('super-secret-jwt');
    });

    test('preserves non-sensitive fields', async () => {
        const { sanitize } = await import('../../src/utils/logSanitizer.js');
        const result = sanitize({ userId: 'abc123', action: 'login' });
        expect(result.userId).toBe('abc123');
        expect(result.action).toBe('login');
    });

    test('handles null/undefined gracefully', async () => {
        const { sanitize } = await import('../../src/utils/logSanitizer.js');
        expect(() => sanitize(null)).not.toThrow();
        expect(() => sanitize(undefined)).not.toThrow();
    });
});

// ── 6. Profile & Settings Update Schemas ─────────────────────────────────────

describe('Profile & Settings Update Schemas', () => {
    test('updateUserSchema accepts valid updates and strips unknown fields', async () => {
        const { updateUserSchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            name: 'John Doe',
            profile: {
                lawFirmName: 'Zen Law',
                practiceAreas: ['Criminal', 'Civil'],
            },
            notifications: {
                emailAlerts: true,
            },
            extraneousField: 'should be stripped'
        };
        const result = updateUserSchema.safeParse(payload);
        expect(result.success).toBe(true);
        expect(result.data.extraneousField).toBeUndefined();
        expect(result.data.name).toBe('John Doe');
        expect(result.data.profile.lawFirmName).toBe('Zen Law');
    });

    test('updateUserSchema rejects invalid field types', async () => {
        const { updateUserSchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            name: 123, // should be string
        };
        const result = updateUserSchema.safeParse(payload);
        expect(result.success).toBe(false);
    });

    test('updateSecuritySchema validates security keys strictly', async () => {
        const { updateSecuritySchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            twoFactorEnabled: true,
            sessionTimeout: '60',
            loginNotifications: false,
        };
        const result = updateSecuritySchema.safeParse(payload);
        expect(result.success).toBe(true);
        expect(result.data.twoFactorEnabled).toBe(true);
    });

    test('updateSecuritySchema rejects invalid sessionTimeout type', async () => {
        const { updateSecuritySchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            sessionTimeout: 60, // should be string
        };
        const result = updateSecuritySchema.safeParse(payload);
        expect(result.success).toBe(false);
    });
});

// ── 7. importDataSchema — backup validation ─────────────────────────────────

describe('importDataSchema — Backup schema validation', () => {
    test('accepts a valid backup payload', async () => {
        const { importDataSchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            user: {
                name: 'Jane Doe',
                profile: {
                    fullName: 'Jane Doe',
                }
            },
            data: {
                cases: [
                    {
                        caseNumber: 'CASE-123',
                        clientName: 'Client A',
                        status: 'active',
                    }
                ],
                clients: [
                    {
                        name: 'Client A',
                        phone: '1234567890',
                    }
                ],
            }
        };
        const result = importDataSchema.safeParse(payload);
        expect(result.success).toBe(true);
        expect(result.data.user.name).toBe('Jane Doe');
        expect(result.data.data.cases[0].caseNumber).toBe('CASE-123');
    });

    test('rejects backup payload if required cases fields are missing', async () => {
        const { importDataSchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            user: { name: 'Jane Doe' },
            data: {
                cases: [
                    {
                        caseNumber: 'CASE-123',
                        // missing clientName
                    }
                ]
            }
        };
        const result = importDataSchema.safeParse(payload);
        expect(result.success).toBe(false);
    });

    test('rejects backup payload with excessively long string to prevent DoS', async () => {
        const { importDataSchema } = await import('../../src/schemas/authSchemas.js');
        const payload = {
            user: { name: 'A'.repeat(500) }, // name limit is 100
            data: {}
        };
        const result = importDataSchema.safeParse(payload);
        expect(result.success).toBe(false);
    });
});
