# Database Schemas

## Models Overview (29 Mongoose Models)

### User & Auth
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `User` | email, password, name, phone, role, isVerified, is2FAEnabled, googleId | email (unique) |
| `PasswordReset` | userId, token, expiresAt | token (unique), expiresAt (TTL) |

### Cases & Legal
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `Case` | ownerId, title, caseNumber, court, clientId, status, filingDate | (ownerId, createdAt), (ownerId, status), (clientId, ownerId) |
| `CaseNote` | caseId, ownerId, content, parentNoteId, attachments | (caseId, ownerId) |
| `CaseLaws` | caseTitle, court, date, summary, content | (caseTitle, court) unique, (date) |
| `LegalActs` | actName, section, content, lastUpdated | (actName, section) unique sparse, (lastUpdated) |
| `LegalSection` | actId, sectionNumber, title, content | (actId, sectionNumber) |
| `Hearing` | ownerId, caseId, date, court, description, status | (ownerId, date), (caseId) |

### Documents
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `Document` | ownerId, fileName, fileUrl, fileType, folderId, caseId | (ownerId, folderId), (ownerId, createdAt), (fileType, ownerId) |
| `Folder` | ownerId, name, parentId | (ownerId), (ownerId, parentId) |
| `TemplateDocument` | ownerId, templateId, content, variables | (ownerId) |

### Finance
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `Invoice` | ownerId, clientId, amount, status, dueDate | (ownerId, status), (ownerId, createdAt), (clientId, ownerId) |
| `TimeEntry` | ownerId, caseId, duration, rate, description, date | (ownerId, caseId) |
| `Payment` | userId, razorpayPaymentId, amount, status, subscriptionId | (userId), (razorpayPaymentId) |
| `PaymentInvoice` | paymentId, invoiceNumber | (paymentId) |
| `PaymentLog` | paymentId, event, details | (paymentId) |

### Subscriptions
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `Subscription` | userId, planId, razorpaySubscriptionId, status, currentPeriod | (userId), (razorpaySubscriptionId) |
| `CouponUsageLog` | userId, couponCode, usedAt | (userId, couponCode) |
| `RefundLog` | paymentId, amount, reason, status | (paymentId) |
| `SettlementLog` | settlementId, amount, status | (settlementId) |

### Activity & Audit
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `Activity` | userId, action, resource, details | (userId) |
| `ActivityEvent` | userId, type, data | (userId) |
| `AuditLog` | userId, action, resource, details | (userId, createdAt), (action, createdAt) |
| `AdminAuditLog` | adminId, action, targetUserId | (adminId) |
| `AbuseSignalLog` | ip, userId, type, details | (ip) |

### Other
| Model | Key Fields | Indexes |
|-------|-----------|---------|
| `Client` | ownerId, name, email, phone, address | (ownerId, createdAt), (ownerId, status) |
| `Alert` | userId, type, message, read, caseId | (userId) |
| `AlertQueue` | alertId, scheduledFor, delivered | (scheduledFor) |
| `AnalyticsDaily` | userId, date, metrics | (userId, date) |
| `UserUsageSnapshot` | userId, snapshotDate, usage | (userId, snapshotDate) |
| `ClientErrorLog` | message, source, level, userId, createdAt | (createdAt) TTL 14d |

## Multi-Tenancy

All user-owned models include an `ownerId` field. Every query filters by `ownerId` to ensure strict data isolation between users.
