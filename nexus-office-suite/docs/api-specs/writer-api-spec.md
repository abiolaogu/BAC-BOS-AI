# NEXUS Writer API Specification

## Overview

The Writer API provides document creation, editing, collaboration, and export capabilities similar to Google Docs, Microsoft Word, and Zoho Writer.

## Base URL
```
http://localhost:8091/api/v1
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Data Models

### Document
```typescript
interface Document {
  id: string;                    // UUID
  tenantId: string;              // Tenant identifier
  title: string;                 // Document title (max 500 chars)
  content: DocumentContent;      // Rich content (JSON)
  createdBy: string;             // User ID
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  version: number;               // Version number (starts at 1)
  status: 'draft' | 'published' | 'archived';
  folderId?: string;             // Optional folder reference
  isDeleted: boolean;
  permissions: DocumentPermission[];
}

interface DocumentContent {
  type: 'doc';
  content: ContentNode[];        // Array of content nodes
}

interface ContentNode {
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'table' | 'codeBlock';
  attrs?: Record<string, any>;   // Node attributes
  content?: ContentNode[];       // Nested content
  text?: string;                 // Text content
  marks?: TextMark[];            // Text formatting
}

interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link';
  attrs?: Record<string, any>;   // Mark attributes
}

interface DocumentPermission {
  userId: string;
  permission: 'view' | 'comment' | 'edit' | 'admin';
  grantedAt: string;
}

interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: DocumentContent;
  createdBy: string;
  createdAt: string;
  changeSummary?: string;
}

interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  position?: {
    start: number;
    end: number;
  };
  createdAt: string;
  isResolved: boolean;
  replies?: DocumentComment[];
}
```

## API Endpoints

### 1. Create Document

**POST** `/documents`

Creates a new document.

**Request Body:**
```json
{
  "title": "My New Document",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Initial content"
          }
        ]
      }
    ]
  },
  "folderId": "optional-folder-id"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-123",
  "title": "My New Document",
  "content": { ... },
  "createdBy": "user-123",
  "createdAt": "2025-11-14T10:00:00Z",
  "updatedAt": "2025-11-14T10:00:00Z",
  "version": 1,
  "status": "draft",
  "folderId": null,
  "isDeleted": false,
  "permissions": []
}
```

---

### 2. Get Document

**GET** `/documents/:id`

Retrieves a document by ID.

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Document",
  "content": { ... },
  "createdBy": "user-123",
  "createdAt": "2025-11-14T10:00:00Z",
  "updatedAt": "2025-11-14T12:30:00Z",
  "version": 3,
  "status": "draft",
  "permissions": [
    {
      "userId": "user-456",
      "permission": "edit",
      "grantedAt": "2025-11-14T11:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - Document doesn't exist
- `403 Forbidden` - User doesn't have access

---

### 3. Update Document

**PUT** `/documents/:id`

Updates document content or metadata.

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": {
    "type": "doc",
    "content": [ ... ]
  },
  "status": "published"
}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Title",
  "version": 4,
  "updatedAt": "2025-11-14T13:00:00Z",
  ...
}
```

---

### 4. Delete Document

**DELETE** `/documents/:id`

Soft deletes a document (moves to trash).

**Query Parameters:**
- `permanent` (optional): If true, permanently deletes the document

**Response:** `204 No Content`

---

### 5. List Documents

**GET** `/documents`

Lists documents with filtering and pagination.

**Query Parameters:**
- `folderId` (optional): Filter by folder
- `status` (optional): Filter by status (draft, published, archived)
- `search` (optional): Search in title and content
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page
- `sortBy` (default: updatedAt): Sort field
- `sortOrder` (default: desc): asc or desc

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Document 1",
      "createdAt": "2025-11-14T10:00:00Z",
      "updatedAt": "2025-11-14T12:00:00Z",
      "version": 2,
      "status": "draft"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 6. Create Version

**POST** `/documents/:id/versions`

Creates a new version snapshot of the document.

**Request Body:**
```json
{
  "changeSummary": "Added introduction section"
}
```

**Response:** `201 Created`
```json
{
  "id": "version-id",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "version": 5,
  "createdBy": "user-123",
  "createdAt": "2025-11-14T14:00:00Z",
  "changeSummary": "Added introduction section"
}
```

---

### 7. List Versions

**GET** `/documents/:id/versions`

Lists all versions of a document.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "version-5",
      "version": 5,
      "createdBy": "user-123",
      "createdAt": "2025-11-14T14:00:00Z",
      "changeSummary": "Added introduction"
    },
    {
      "id": "version-4",
      "version": 4,
      "createdBy": "user-123",
      "createdAt": "2025-11-14T13:00:00Z",
      "changeSummary": "Fixed typos"
    }
  ]
}
```

---

### 8. Restore Version

**POST** `/documents/:id/versions/:versionId/restore`

Restores a document to a specific version.

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": 6,
  "content": { ... },
  "updatedAt": "2025-11-14T15:00:00Z"
}
```

---

### 9. Export Document

**GET** `/documents/:id/export/:format`

Exports document to various formats.

**Path Parameters:**
- `format`: pdf | docx | html | txt | markdown

**Query Parameters:**
- `download` (optional): If true, sets Content-Disposition header

**Response:** `200 OK`
- Content-Type: application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document | text/html | text/plain | text/markdown
- Binary file stream

**Example:**
```
GET /documents/550e8400-e29b-41d4-a716-446655440000/export/pdf?download=true
```

---

### 10. Import Document

**POST** `/documents/import`

Imports a document from external format.

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

file: <binary file>
format: docx | html | markdown
title: "Imported Document Title"
folderId: "optional-folder-id"
```

**Response:** `201 Created`
```json
{
  "id": "new-document-id",
  "title": "Imported Document Title",
  "version": 1,
  "createdAt": "2025-11-14T16:00:00Z"
}
```

---

### 11. Share Document

**POST** `/documents/:id/share`

Shares document with other users.

**Request Body:**
```json
{
  "users": [
    {
      "userId": "user-456",
      "permission": "edit"
    },
    {
      "email": "user@example.com",
      "permission": "view"
    }
  ],
  "message": "Optional invitation message"
}
```

**Response:** `200 OK`
```json
{
  "shared": [
    {
      "userId": "user-456",
      "permission": "edit",
      "grantedAt": "2025-11-14T17:00:00Z"
    }
  ],
  "invited": [
    {
      "email": "user@example.com",
      "invitationSent": true
    }
  ]
}
```

---

### 12. Get Comments

**GET** `/documents/:id/comments`

Retrieves all comments on a document.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "comment-1",
      "userId": "user-456",
      "userName": "John Doe",
      "content": "Great introduction!",
      "position": {
        "start": 0,
        "end": 150
      },
      "createdAt": "2025-11-14T12:00:00Z",
      "isResolved": false,
      "replies": []
    }
  ]
}
```

---

### 13. Add Comment

**POST** `/documents/:id/comments`

Adds a comment to a document.

**Request Body:**
```json
{
  "content": "This needs clarification",
  "position": {
    "start": 200,
    "end": 250
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "comment-2",
  "userId": "user-123",
  "content": "This needs clarification",
  "position": { ... },
  "createdAt": "2025-11-14T18:00:00Z",
  "isResolved": false
}
```

---

### 14. Resolve Comment

**PATCH** `/documents/:id/comments/:commentId/resolve`

Marks a comment as resolved.

**Response:** `200 OK`
```json
{
  "id": "comment-2",
  "isResolved": true,
  "resolvedAt": "2025-11-14T18:30:00Z",
  "resolvedBy": "user-123"
}
```

---

### 15. Get Document Activity

**GET** `/documents/:id/activity`

Retrieves activity log for a document.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "activity-1",
      "type": "document.updated",
      "userId": "user-123",
      "userName": "Jane Smith",
      "timestamp": "2025-11-14T12:00:00Z",
      "metadata": {
        "changes": ["title", "content"]
      }
    },
    {
      "id": "activity-2",
      "type": "document.shared",
      "userId": "user-123",
      "timestamp": "2025-11-14T11:00:00Z",
      "metadata": {
        "sharedWith": "user-456",
        "permission": "edit"
      }
    }
  ]
}
```

---

## WebSocket Events

For real-time collaboration, Writer service supports WebSocket connections.

**Connection URL:** `ws://localhost:8091/ws/documents/:documentId`

**Authentication:** Send JWT token in first message after connection.

### Events

#### Client → Server

**1. Join Document**
```json
{
  "type": "join",
  "token": "jwt-token"
}
```

**2. Content Update**
```json
{
  "type": "update",
  "changes": [
    {
      "type": "insert",
      "position": 100,
      "content": "new text"
    }
  ]
}
```

**3. Cursor Position**
```json
{
  "type": "cursor",
  "position": {
    "start": 150,
    "end": 150
  }
}
```

#### Server → Client

**1. User Joined**
```json
{
  "type": "user:joined",
  "userId": "user-456",
  "userName": "John Doe"
}
```

**2. Content Updated**
```json
{
  "type": "content:updated",
  "userId": "user-456",
  "changes": [ ... ]
}
```

**3. Cursor Updated**
```json
{
  "type": "cursor:updated",
  "userId": "user-456",
  "position": { ... }
}
```

---

## Error Responses

All endpoints follow standard HTTP error responses:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

**Common Error Codes:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Version conflict
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Rate Limiting

- **Rate Limit:** 1000 requests per hour per user
- **Headers:**
  - `X-RateLimit-Limit: 1000`
  - `X-RateLimit-Remaining: 950`
  - `X-RateLimit-Reset: 1699920000`

---

## Extensibility Notes

### Future Enhancements

1. **Templates System**
   - Add `/templates` endpoints for document templates
   - Template categories and marketplace

2. **Advanced Collaboration**
   - Suggestions and track changes (like Google Docs)
   - @mentions in comments
   - Task assignments

3. **AI Features**
   - `/documents/:id/ai/improve` - AI writing suggestions
   - `/documents/:id/ai/summarize` - Document summarization
   - `/documents/:id/ai/translate` - Language translation

4. **External Integrations**
   - Import from Google Docs, Notion, Confluence
   - Export to more formats (ePub, LaTeX)

5. **Advanced Permissions**
   - Link sharing with expiration
   - Department/team-based permissions
   - Watermarking for confidential documents

---

**Version:** 1.0
**Last Updated:** 2025-11-14
