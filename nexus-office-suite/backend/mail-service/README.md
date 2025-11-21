# NEXUS Mail Service

A comprehensive email platform with full SMTP/IMAP server implementation, equivalent to Outlook/Gmail/Zoho Mail.

## Features

### Email Server
- **SMTP Server** - Full SMTP protocol support for sending/receiving emails
- **IMAP Server** - Complete IMAP implementation for email client access
- **POP3 Server** - Optional POP3 support
- **Email Threading** - Conversation view with In-Reply-To and References headers
- **Attachment Support** - File attachments stored in MinIO/S3 (up to 25MB)
- **Rich Text Email** - HTML email support with inline images
- **Scheduled Sending** - Schedule emails to be sent later
- **Draft Auto-save** - Save drafts automatically

### Organization
- **Folders** - Inbox, Sent, Drafts, Trash, Spam, Starred, Custom folders
- **Labels/Tags** - Flexible labeling system for email organization
- **Email Filters** - Rule-based email filtering and auto-filing
- **Search** - Full-text search with PostgreSQL and Elasticsearch
- **Bulk Actions** - Mark as read, star, delete, move multiple emails

### Security & Anti-Spam
- **Spam Filtering** - SpamAssassin integration + heuristic spam detection
- **Virus Scanning** - ClamAV integration for attachment scanning
- **Spam Score** - Automatic spam scoring for incoming emails
- **Priority Flags** - Low, Normal, High priority levels

### Advanced Features
- **Email Signatures** - Custom email signatures
- **Auto-responders** - Out-of-office automatic replies
- **Email Aliases** - Multiple email addresses per user
- **Read Receipts** - Track when emails are opened
- **Contact Management** - Built-in contact book
- **Quota Management** - Per-user storage quotas

## Architecture

```
nexus-mail-service/
├── cmd/
│   └── main.go                 # Application entry point
├── config/
│   └── config.go              # Configuration management
├── internal/
│   ├── model/
│   │   └── email.go           # Data models
│   ├── repository/
│   │   ├── email_repository.go    # Email CRUD
│   │   └── folder_repository.go   # Folder/Label CRUD
│   ├── service/
│   │   ├── smtp_server.go     # SMTP server implementation
│   │   ├── imap_server.go     # IMAP server implementation
│   │   ├── email_service.go   # Business logic
│   │   └── spam_filter.go     # Spam detection
│   └── handler/
│       └── email_handler.go   # HTTP API handlers
├── migrations/
│   └── 001_initial_schema.sql # Database schema
├── Dockerfile
├── .env.example
└── README.md
```

## Database Schema

### Tables
- **emails** - Email messages with full metadata
- **folders** - User folders (system and custom)
- **labels** - Email labels/tags
- **email_labels** - Many-to-many email-label relationship
- **attachments** - File attachments metadata
- **contacts** - Email contacts
- **filters** - Email filtering rules
- **signatures** - Email signatures
- **auto_responders** - Auto-reply configurations
- **aliases** - Email aliases

## API Endpoints

### Emails
- `POST /api/v1/emails/send` - Send an email
- `POST /api/v1/emails/draft` - Save draft
- `GET /api/v1/emails` - List emails (with pagination)
- `GET /api/v1/emails/:id` - Get email details
- `POST /api/v1/emails/search` - Search emails
- `PUT /api/v1/emails/:id/read` - Mark as read/unread
- `PUT /api/v1/emails/:id/star` - Star/unstar email
- `PUT /api/v1/emails/:id/move` - Move to folder
- `DELETE /api/v1/emails/:id` - Delete email (move to trash)
- `GET /api/v1/emails/:id/thread` - Get email thread
- `POST /api/v1/emails/bulk` - Bulk actions

### Folders
- `GET /api/v1/folders` - List folders
- `POST /api/v1/folders` - Create folder
- `GET /api/v1/folders/:id` - Get folder
- `PUT /api/v1/folders/:id` - Update folder
- `DELETE /api/v1/folders/:id` - Delete folder

### Labels
- `GET /api/v1/labels` - List labels
- `POST /api/v1/labels` - Create label
- `GET /api/v1/labels/:id` - Get label
- `PUT /api/v1/labels/:id` - Update label
- `DELETE /api/v1/labels/:id` - Delete label

### Attachments
- `GET /api/v1/attachments/:id/download` - Download attachment

## Setup

### Prerequisites
- Go 1.21+
- PostgreSQL 14+
- MinIO or S3 (for attachments)
- (Optional) Elasticsearch for advanced search
- (Optional) SpamAssassin for spam filtering
- (Optional) ClamAV for virus scanning

### Installation

1. **Clone the repository**
```bash
cd nexus-office-suite/backend/mail-service
```

2. **Copy environment file**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Install dependencies**
```bash
go mod download
```

4. **Setup database**
```bash
# Create database
createdb nexus_mail

# Run migrations
psql -d nexus_mail -f migrations/001_initial_schema.sql
```

5. **Run the service**
```bash
go run cmd/main.go
```

The service will start:
- HTTP API: http://localhost:8085
- SMTP Server: localhost:1025
- IMAP Server: localhost:1143

### Docker Deployment

```bash
# Build image
docker build -t nexus-mail-service .

# Run container
docker run -p 8085:8085 -p 1025:1025 -p 1143:1143 \
  --env-file .env \
  nexus-mail-service
```

### Docker Compose

```yaml
version: '3.8'

services:
  mail-service:
    build: .
    ports:
      - "8085:8085"
      - "1025:1025"
      - "1143:1143"
    environment:
      - DB_HOST=postgres
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - postgres
      - minio

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: nexus_mail
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

## Configuration

### SMTP Server
The SMTP server listens on port 1025 (configurable) and accepts incoming emails. It supports:
- PLAIN authentication
- Multiple recipients
- Attachments
- Email threading
- Spam filtering

### IMAP Server
The IMAP server listens on port 1143 (configurable) and provides email client access. It supports:
- Mailbox listing
- Email fetching
- Folder operations
- Email search
- Flag management

### Spam Filtering
Two modes of spam filtering:
1. **SpamAssassin** (when available) - Uses external SpamAssassin daemon
2. **Heuristic** (fallback) - Built-in spam detection based on keywords, patterns, etc.

Spam score threshold: 5.0 (emails above this are marked as spam)

## Email Client Configuration

### IMAP Settings
- Server: localhost (or your domain)
- Port: 1143 (or 143 for standard)
- Security: None (or TLS if configured)
- Username: your-username
- Password: your-password

### SMTP Settings
- Server: localhost (or your domain)
- Port: 1025 (or 25/587 for standard)
- Security: None (or TLS if configured)
- Username: your-username
- Password: your-password

## Development

### Running Tests
```bash
go test ./...
```

### Building
```bash
go build -o nexus-mail-service cmd/main.go
```

### Code Structure
- **Models** - Data structures and DTOs
- **Repositories** - Database access layer
- **Services** - Business logic and email servers
- **Handlers** - HTTP API handlers
- **Config** - Configuration management

## Security Considerations

1. **Authentication** - Implement proper JWT authentication (currently uses placeholder)
2. **TLS/SSL** - Enable TLS for SMTP/IMAP in production
3. **Rate Limiting** - Add rate limiting to prevent abuse
4. **Input Validation** - Validate all user inputs
5. **SQL Injection** - Uses parameterized queries
6. **XSS Protection** - Sanitize HTML emails
7. **CSRF Protection** - Implement CSRF tokens for web UI

## Performance

### Optimization Tips
1. **Database Indexes** - Indexes on frequently queried fields
2. **Connection Pooling** - Database connection pool configured
3. **Caching** - Use Redis for session/email caching
4. **Elasticsearch** - Enable for fast full-text search
5. **Attachment Storage** - MinIO/S3 for scalable storage
6. **Message Queues** - Use queue for background email sending

## Monitoring

### Health Check
```bash
curl http://localhost:8085/health
```

### Metrics
The service logs structured JSON logs using zerolog. Integration with Prometheus/Grafana is recommended.

## Troubleshooting

### SMTP not receiving emails
- Check SMTP server is running on port 1025
- Verify firewall rules
- Check logs for errors

### IMAP connection issues
- Ensure IMAP server is enabled in config
- Verify credentials
- Check client compatibility

### Database errors
- Verify PostgreSQL connection
- Check migrations are applied
- Review database logs

## License

Part of the NEXUS Office Suite platform.

## Support

For issues and questions, please refer to the main NEXUS platform documentation.
