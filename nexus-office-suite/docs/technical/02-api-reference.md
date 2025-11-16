# API Reference

**Version**: 1.0
**Base URL**: `https://nexus.yourdomain.com/api`

---

## Authentication

All API requests require authentication via JWT token.

```bash
# Get token
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "123", "email": "user@example.com" }
}

# Use token
GET /documents
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Documents API (Writer)

### Create Document
```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Document",
  "content": { "ops": [...] },
  "folder_id": "folder-123"
}

Response 201:
{
  "id": "doc-123",
  "title": "My Document",
  "created_at": "2025-11-16T10:00:00Z"
}
```

### Get Document
```http
GET /api/documents/:id
Authorization: Bearer <token>

Response 200:
{
  "id": "doc-123",
  "title": "My Document",
  "content": { "ops": [...] },
  "owner": { "id": "user-123", "name": "John Doe" },
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T11:00:00Z"
}
```

### Update Document
```http
PATCH /api/documents/:id
Authorization: Bearer <token>

{
  "content": { "ops": [...] }
}

Response 200:
{
  "id": "doc-123",
  "updated_at": "2025-11-16T11:30:00Z"
}
```

### Delete Document
```http
DELETE /api/documents/:id
Authorization: Bearer <token>

Response 204: No Content
```

### List Documents
```http
GET /api/documents?folder_id=folder-123&limit=20&offset=0
Authorization: Bearer <token>

Response 200:
{
  "documents": [
    { "id": "doc-1", "title": "Doc 1", ... },
    { "id": "doc-2", "title": "Doc 2", ... }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

## Files API (Drive)

### Upload File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary data>
folder_id: "folder-123"

Response 201:
{
  "id": "file-456",
  "name": "document.pdf",
  "size": 1048576,
  "mime_type": "application/pdf",
  "url": "https://storage.../file-456"
}
```

### Download File
```http
GET /api/files/:id/download
Authorization: Bearer <token>

Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"
<binary data>
```

### Share File
```http
POST /api/files/:id/share
Authorization: Bearer <token>

{
  "users": ["user-2@example.com"],
  "permission": "view"  // view, comment, edit
}

Response 200:
{
  "share_link": "https://nexus.../share/abc123"
}
```

---

## Meetings API (Meet)

### Create Meeting
```http
POST /api/meetings
Authorization: Bearer <token>

{
  "title": "Team Standup",
  "start_time": "2025-11-17T09:00:00Z",
  "duration": 30,
  "attendees": ["user2@example.com"]
}

Response 201:
{
  "id": "meeting-789",
  "join_url": "https://meet.../join/abc-defg-hij",
  "meeting_code": "abc-defg-hij"
}
```

### Join Meeting
```http
GET /api/meetings/:id/join
Authorization: Bearer <token>

Response 200:
{
  "room_id": "room-123",
  "websocket_url": "wss://meet.../ws",
  "ice_servers": [...]
}
```

---

## Rate Limiting

```
Rate Limits:
- Authenticated: 1000 requests/hour
- Anonymous: 100 requests/hour

Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 856
X-RateLimit-Reset: 1731754800
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

Error Response:
```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document with ID 'doc-123' not found",
    "details": {}
  }
}
```

---

**Previous**: [Architecture](01-architecture.md) | **Next**: [Database Schema →](03-database-schema.md)
