# Document Management System

## Overview

Juriq provides cloud-based document management using Cloudinary as the storage backend with folder organization, file type filtering, and case-linked attachments.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Document` model | `backend/src/models/Document.js` | Document metadata |
| `Folder` model | `backend/src/models/Folder.js` | Folder hierarchy |
| `documents.js` route | `backend/src/routes/documents.js` | Upload/list/delete endpoints |
| `Documents.tsx` page | `frontend/src/pages/Documents.tsx` | Document management UI |
| `NoteAttachmentUploader.tsx` | `frontend/src/components/` | Inline note attachments |
| `NoteAttachmentViewer.tsx` | `frontend/src/components/` | Attachment preview |

## Upload Flow

```
Client → POST /documents/upload (multipart/form-data)
           │
           ▼
      Multer middleware (memory storage)
           │
           ▼
      Cloudinary upload (signed, secure)
           │
           ▼
      Save Document model (URL, metadata, ownerId)
           │
           ▼
      Return document object to client
```

## Storage Strategy

- **Provider**: Cloudinary (CDN-backed, automatic format optimization)
- **Upload Limit**: Rate limited to 100 uploads per hour per user
- **File Types**: All common document formats (PDF, DOCX, images, etc.)
- **Organization**: Folder hierarchy with owner-scoped access
- **Security**: All documents are owner-scoped (`ownerId` filter on every query)
