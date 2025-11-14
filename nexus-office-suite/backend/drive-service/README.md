# NEXUS Drive Service

Cloud file storage and management service with versioning, sharing, and permissions.

## Features

- **File Management**: Upload, download, organize files and folders
- **Cloud Storage**: MinIO/S3-compatible object storage backend
- **File Versioning**: Automatic version tracking with restore capability
- **Sharing & Permissions**: Granular access control (owner, editor, viewer)
- **Public Share Links**: Generate password-protected, expiring share links
- **Search**: Full-text search across files and folders
- **Trash**: Soft delete with restore capability
- **Multi-tenant**: Complete isolation between tenants
- **File Types**: Automatic detection and categorization
- **Metadata**: Tags, descriptions, custom metadata support

## Tech Stack

- **Language**: Go 1.21+
- **Database**: PostgreSQL 15
- **Storage**: MinIO (S3-compatible)
- **Authentication**: JWT
- **HTTP Framework**: Gorilla Mux
- **ORM**: sqlx

## Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 15
- MinIO server
- Make (optional)

### Installation

1. Clone the repository
2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run database migrations:
```bash
psql -U nexus -d nexus_drive -f migrations/001_initial_schema.sql
```

5. Install dependencies:
```bash
go mod download
```

### Development

Run the service:
```bash
go run cmd/main.go
# or with make
make run
```

The service will start on `http://localhost:8093`

### Production Build

```bash
make build
./bin/drive-service
```

### Docker

Build Docker image:
```bash
make docker-build
```

Run with Docker:
```bash
make docker-run
```

## API Endpoints

### Files

- `POST /api/v1/files` - Upload file
- `GET /api/v1/files` - List files
- `GET /api/v1/files/{id}` - Get file metadata
- `GET /api/v1/files/{id}/download` - Download file
- `PUT /api/v1/files/{id}` - Update file metadata
- `DELETE /api/v1/files/{id}` - Move file to trash
- `POST /api/v1/files/{id}/move` - Move file to folder
- `POST /api/v1/files/{id}/copy` - Copy file
- `GET /api/v1/files/search?q={query}` - Search files
- `GET /api/v1/files/starred` - Get starred files
- `GET /api/v1/files/recent` - Get recently accessed files

### Folders

- `POST /api/v1/folders` - Create folder
- `GET /api/v1/folders` - List folders
- `GET /api/v1/folders/{id}` - Get folder
- `PUT /api/v1/folders/{id}` - Update folder
- `DELETE /api/v1/folders/{id}` - Move folder to trash

### Trash

- `GET /api/v1/trash` - List trashed items
- `POST /api/v1/trash/restore` - Restore from trash
- `POST /api/v1/trash/empty` - Empty trash (permanent delete)

### Permissions

- `POST /api/v1/permissions` - Grant permission
- `DELETE /api/v1/permissions/{id}` - Revoke permission
- `GET /api/v1/permissions/{resource_type}/{resource_id}` - List permissions

### Share Links

- `POST /api/v1/share-links` - Create share link
- `GET /api/v1/share/{token}` - Get shared resource by token
- `DELETE /api/v1/share-links/{id}` - Delete share link

### Versions

- `GET /api/v1/files/{file_id}/versions` - List file versions
- `POST /api/v1/files/{file_id}/versions/restore` - Restore version

## File Upload Example

```bash
curl -X POST http://localhost:8093/api/v1/files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf" \
  -F "folder_id=optional-folder-uuid"
```

## File Download Example

```bash
curl -X GET http://localhost:8093/api/v1/files/{file_id}/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded_file.pdf
```

## Project Structure

```
.
├── cmd/
│   └── main.go              # Application entry point
├── config/
│   └── config.go            # Configuration management
├── internal/
│   ├── handler/
│   │   └── drive_handler.go # HTTP handlers
│   ├── middleware/
│   │   └── middleware.go    # Authentication, logging, CORS
│   ├── model/
│   │   ├── file.go          # File and folder models
│   │   └── permission.go    # Permission models
│   ├── repository/
│   │   ├── file_repository.go
│   │   ├── folder_repository.go
│   │   ├── permission_repository.go
│   │   └── version_repository.go
│   ├── service/
│   │   └── drive_service.go # Business logic
│   └── storage/
│       └── minio.go         # MinIO storage interface
├── migrations/
│   └── 001_initial_schema.sql
├── Dockerfile
├── Makefile
└── README.md
```

## Storage Architecture

Files are stored in MinIO with the following path structure:
```
{tenant_id}/{year}/{month}/{file_id}/{filename}
```

This provides:
- Tenant isolation
- Time-based organization
- Easy backup/archival
- Scalable storage

## Versioning

When a file is updated:
1. Current version is saved to `file_versions` table
2. New version number is assigned
3. Old file remains in storage
4. Users can restore any previous version

## Permissions Model

Three permission levels:
- **Owner**: Full control (edit, delete, share)
- **Editor**: Can edit and upload new versions
- **Viewer**: Read-only access

Permissions can be:
- User-based (by user_id)
- Email-based (for sharing with external users)
- Time-limited (with expiry)

## Share Links

Public share links support:
- Password protection (bcrypt hashed)
- Expiration dates
- Download limits
- Read-only or edit access

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | HTTP server port | 8093 |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | nexus_drive |
| MINIO_ENDPOINT | MinIO endpoint | localhost:9000 |
| MINIO_BUCKET | Storage bucket | nexus-drive |
| JWT_SECRET | JWT signing secret | (required) |
| MAX_UPLOAD_SIZE | Max file size (bytes) | 104857600 (100MB) |

## Security Considerations

- JWT authentication required for all endpoints
- File paths are UUIDs (no path traversal risk)
- Multi-tenant isolation at database and storage level
- Password-protected share links use bcrypt
- SQL injection protection via parameterized queries
- CORS configuration for web clients

## Performance Optimization

- Database indexes on frequently queried fields
- MinIO multipart uploads for large files
- Sparse file storage (folder hierarchy cached)
- Connection pooling for database
- Efficient trash management (soft delete)

## Testing

Run tests:
```bash
make test
```

## Contributing

1. Follow Go best practices
2. Add tests for new features
3. Update API documentation
4. Run linting before commit

## License

Copyright (c) 2024 NEXUS Business Operating System
