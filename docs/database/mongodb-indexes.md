# MongoDB Indexes

All indexes are defined in `backend/src/config/indexes.js` and created idempotently on server startup via `ensureIndexes()`.

## Index Definitions

### Case Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `case_owner_created` | `{ownerId: 1, createdAt: -1}` | Compound | List cases by creation date |
| `case_owner_status` | `{ownerId: 1, status: 1}` | Compound | Filter cases by status |
| `case_client_owner` | `{clientId: 1, ownerId: 1}` | Compound | Find cases by client |
| `case_created_desc` | `{createdAt: -1}` | Simple | Global sort |

### Client Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `client_owner_created` | `{ownerId: 1, createdAt: -1}` | Compound | List clients |
| `client_owner_status` | `{ownerId: 1, status: 1}` | Compound | Filter by status |

### Document Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `doc_owner_folder` | `{ownerId: 1, folderId: 1}` | Compound | List docs in folder |
| `doc_owner_created` | `{ownerId: 1, createdAt: -1}` | Compound | Sort by date |
| `doc_folder` | `{folderId: 1}` | Simple | Folder contents |
| `doc_type_owner` | `{fileType: 1, ownerId: 1}` | Compound | Filter by type |

### Folder Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `folder_owner` | `{ownerId: 1}` | Simple | List user folders |
| `folder_owner_parent` | `{ownerId: 1, parentId: 1}` | Compound | Folder hierarchy |

### Invoice Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `invoice_owner_status` | `{ownerId: 1, status: 1}` | Compound | Filter invoices |
| `invoice_owner_created` | `{ownerId: 1, createdAt: -1}` | Compound | Sort by date |
| `invoice_client_owner` | `{clientId: 1, ownerId: 1}` | Compound | Client invoices |

### Hearing Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `hearing_owner_date` | `{ownerId: 1, date: 1}` | Compound | Calendar queries |
| `hearing_case` | `{caseId: 1}` | Simple | Case hearings |

### AuditLog Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `audit_user_created` | `{userId: 1, createdAt: -1}` | Compound | User audit trail |
| `audit_action_created` | `{action: 1, createdAt: -1}` | Compound | Action lookup |

### LegalActs Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `legal_acts_last_updated` | `{lastUpdated: -1}` | Simple | Recent updates |
| `legal_acts_act_section_unique` | `{actName: 1, section: 1}` | Unique, Sparse | Deduplication |

### CaseLaws Collection
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `case_laws_date_desc` | `{date: -1}` | Simple | Recent cases |
| `case_laws_last_updated` | `{lastUpdated: -1}` | Simple | Refresh tracking |
| `case_laws_title_court_unique` | `{caseTitle: 1, court: 1}` | Unique, Sparse | Deduplication |

## Index Strategy

- All indexes created with `background: true` to avoid blocking
- Error codes 85/86 (index already exists) are silently handled
- Index count logged on startup for verification
