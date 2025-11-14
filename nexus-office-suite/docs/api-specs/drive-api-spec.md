# NEXUS Drive API Specification

## Overview

Cloud file storage and sharing service similar to Google Drive, OneDrive, and Dropbox.

## Base URL
```
http://localhost:8096/api/v1
```

## Data Models

```typescript
interface File {
  id: string;
  tenantId: string;
  name: string;
  folderId?: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;           // MinIO object key
  version: number;
  md5Hash: string;               // For deduplication
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

interface Folder {
  id: string;
  tenantId: string;
  name: string;
  parentFolderId?: string;
  path: string;                  // Full path e.g., "/Documents/Work"
  createdBy: string;
  createdAt: string;
  isDeleted: boolean;
}

interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  sizeBytes: number;
  storagePath: string;
  createdBy: string;
  createdAt: string;
}

interface Share {
  id: string;
  fileId?: string;
  folderId?: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  permission: 'view' | 'comment' | 'edit';
  shareLink?: string;            // Public share link
  expiresAt?: string;
  password?: string;             // Encrypted
  createdBy: string;
  createdAt: string;
}
```

## Key Endpoints

### File Operations

**POST** `/files/upload`
```
Content-Type: multipart/form-data

file: <binary>
folderId: optional
metadata: {"tags": ["important"]}
```

**GET** `/files/:id/download`
**GET** `/files/:id/preview` - Generate preview image
**PUT** `/files/:id` - Update file (creates new version)
**DELETE** `/files/:id` - Soft delete (move to trash)
**POST** `/files/:id/copy` - Copy file
**POST** `/files/:id/move` - Move to different folder

### Folder Operations

**POST** `/folders`
```json
{
  "name": "My Folder",
  "parentFolderId": "optional-parent-id"
}
```

**GET** `/folders/:id` - Get folder contents
**PUT** `/folders/:id` - Rename folder
**DELETE** `/folders/:id` - Delete folder and contents
**POST** `/folders/:id/copy`
**POST** `/folders/:id/move`

### Versioning

**GET** `/files/:id/versions` - List all versions
**POST** `/files/:id/versions/:versionId/restore` - Restore to version
**DELETE** `/files/:id/versions/:versionId` - Delete specific version

### Sharing

**POST** `/files/:id/share`
```json
{
  "users": [
    {"userId": "user-123", "permission": "edit"},
    {"email": "user@example.com", "permission": "view"}
  ],
  "generateLink": true,
  "linkPassword": "optional-password",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**GET** `/files/:id/shares` - List all shares
**DELETE** `/shares/:shareId` - Revoke share
**GET** `/shared-with-me` - Files shared with current user

### Search

**GET** `/search?q=query&type=file&mimeType=image/*&minSize=1048576&maxSize=10485760`

**Query Parameters:**
- `q` - Search query
- `type` - file | folder
- `mimeType` - Filter by MIME type
- `minSize`, `maxSize` - Size filters in bytes
- `createdAfter`, `createdBefore` - Date filters
- `owner` - Filter by owner user ID
- `shared` - true | false
- `starred` - true | false

### Trash

**GET** `/trash` - List deleted files
**POST** `/trash/:id/restore` - Restore from trash
**DELETE** `/trash/:id` - Permanently delete
**POST** `/trash/empty` - Empty trash

### Storage Quota

**GET** `/storage/quota`
```json
{
  "totalBytes": 107374182400,    // 100 GB
  "usedBytes": 53687091200,      // 50 GB
  "availableBytes": 53687091200,
  "breakdown": {
    "files": 45000000000,
    "photos": 8000000000,
    "trash": 687091200
  }
}
```

## Advanced Features

### Batch Operations

**POST** `/batch`
```json
{
  "operations": [
    {"type": "copy", "fileId": "file-1", "destinationFolderId": "folder-2"},
    {"type": "delete", "fileId": "file-2"},
    {"type": "share", "fileId": "file-3", "userId": "user-123", "permission": "view"}
  ]
}
```

### File Comments

**POST** `/files/:id/comments`
**GET** `/files/:id/comments`
**PUT** `/comments/:commentId`
**DELETE** `/comments/:commentId`

### Activity Log

**GET** `/files/:id/activity` - View file access history

### Offline Sync

**POST** `/sync/register` - Register device for offline sync
**GET** `/sync/changes?cursor=token` - Get changes since cursor
**POST** `/sync/upload` - Upload offline changes

## Extensibility

1. **Advanced Search**: Full-text search within documents using Elasticsearch
2. **OCR**: Extract text from images and PDFs
3. **File Preview**: Support more formats (CAD, video, etc.)
4. **Backup & Restore**: Point-in-time recovery
5. **External Storage**: Connect to S3, Google Drive, Dropbox
6. **Encryption**: End-to-end encryption for sensitive files
7. **Compliance**: Data retention policies, legal holds
8. **AI Features**: Auto-tagging, smart folders, duplicate detection

---

**Version:** 1.0
**Last Updated:** 2025-11-14
