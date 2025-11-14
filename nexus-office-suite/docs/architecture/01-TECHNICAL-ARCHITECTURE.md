# NEXUS Office Suite - Technical Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS                            │
├──────────────────┬──────────────────┬──────────────────┬────────────────┤
│   Web Apps       │   Mobile Apps    │  Desktop Apps    │   3rd Party    │
│  (Next.js)       │   (Flutter)      │   (Electron)     │   (API)        │
│                  │                  │                  │                │
│ • Writer         │ • Mobile Suite   │ • Desktop Suite  │ • Integrations │
│ • Sheets         │ • Mail Mobile    │   (Writer,       │ • Webhooks     │
│ • Slides         │ • Calendar       │    Sheets,       │ • OAuth Apps   │
│ • Mail           │ • Drive          │    Slides)       │                │
│ • Calendar       │ • Meet           │                  │                │
│ • Drive          │ • Tasks          │                  │                │
│ • Forms          │                  │                  │                │
│ • Meet           │                  │                  │                │
│ • Tasks          │                  │                  │                │
│ • Notes          │                  │                  │                │
└──────────────────┴──────────────────┴──────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (Kong/Go)                           │
│  • Authentication        • Rate Limiting        • Load Balancing         │
│  • Request Routing       • API Versioning       • Request Logging        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND MICROSERVICES (Go)                          │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────────┤
│   Writer    │   Sheets    │   Slides    │    Mail     │   Calendar     │
│   Service   │   Service   │   Service   │   Service   │   Service      │
│  :8091      │  :8092      │  :8093      │  :8094      │   :8095        │
├─────────────┼─────────────┼─────────────┼─────────────┼────────────────┤
│   Drive     │   Forms     │    Meet     │   Tasks     │   Notes        │
│   Service   │   Service   │   Service   │   Service   │   Service      │
│  :8096      │  :8097      │  :8098      │  :8099      │   :8100        │
└─────────────┴─────────────┴─────────────┴─────────────┴────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   PostgreSQL 15      │  │   Redis 7        │  │   MinIO (S3)         │
│   (Primary DB)       │  │   (Cache)        │  │   (File Storage)     │
│                      │  │                  │  │                      │
│ • Documents          │  │ • Sessions       │  │ • Documents          │
│ • Spreadsheets       │  │ • Real-time      │  │ • Images             │
│ • Presentations      │  │ • Pub/Sub        │  │ • Attachments        │
│ • Emails             │  │ • Rate Limits    │  │ • Videos             │
│ • Calendar Events    │  └──────────────────┘  └──────────────────────┘
│ • Files Metadata     │
│ • Users & Auth       │
└──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        EVENT STREAMING (Kafka)                        │
│  • Document Updates      • User Events         • Audit Logs          │
│  • Email Notifications   • Collaboration       • Analytics           │
└──────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    SUPPORTING SERVICES                                │
├────────────────┬─────────────────┬─────────────────┬─────────────────┤
│  Search        │  AI/ML          │  Notification   │  Analytics      │
│  (Elasticsearch)│  (LLM Router)   │  Service        │  (ClickHouse)   │
│                │                 │                 │                 │
│ • Full-text    │ • Writing       │ • Email         │ • Usage Stats   │
│ • Semantic     │ • Assistant     │ • Push          │ • Reports       │
│ • Indexing     │ • Data Insights │ • WebSocket     │ • Dashboards    │
└────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## Service Specifications

### 1. Writer Service (Port 8091)

**Responsibilities**:
- Document creation, editing, deletion
- Rich text formatting (bold, italic, headings, lists, etc.)
- Document versioning and history
- Templates management
- Export to PDF, DOCX, HTML
- Import from DOCX, HTML

**Database Schema**:
```sql
-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    folder_id UUID REFERENCES folders(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Document versions table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    change_summary TEXT
);

-- Document collaborators
CREATE TABLE document_collaborators (
    document_id UUID NOT NULL REFERENCES documents(id),
    user_id UUID NOT NULL,
    permission VARCHAR(20) NOT NULL, -- view, comment, edit, admin
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, user_id)
);

-- Document comments
CREATE TABLE document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    position JSONB, -- { "start": 100, "end": 150 }
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);
```

**API Endpoints**:
```
POST   /api/v1/documents                 - Create document
GET    /api/v1/documents/:id             - Get document
PUT    /api/v1/documents/:id             - Update document
DELETE /api/v1/documents/:id             - Delete document
GET    /api/v1/documents                 - List documents
POST   /api/v1/documents/:id/versions    - Create version
GET    /api/v1/documents/:id/versions    - List versions
GET    /api/v1/documents/:id/export/:format - Export (pdf/docx/html)
POST   /api/v1/documents/import          - Import document
POST   /api/v1/documents/:id/share       - Share document
GET    /api/v1/documents/:id/comments    - Get comments
POST   /api/v1/documents/:id/comments    - Add comment
```

---

### 2. Sheets Service (Port 8092)

**Responsibilities**:
- Spreadsheet creation and management
- Cell data storage (values, formulas, formatting)
- Formula calculation engine
- Charts and graphs
- Export to XLSX, CSV
- Import from XLSX, CSV

**Database Schema**:
```sql
-- Spreadsheets table
CREATE TABLE spreadsheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    folder_id UUID REFERENCES folders(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Sheets (tabs within a spreadsheet)
CREATE TABLE sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id),
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    row_count INTEGER DEFAULT 1000,
    column_count INTEGER DEFAULT 26,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cells (sparse storage - only store non-empty cells)
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id),
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    value TEXT,
    formula TEXT,
    data_type VARCHAR(20), -- string, number, boolean, date, formula
    style JSONB, -- { "bold": true, "fontSize": 12, "color": "#000" }
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(sheet_id, row_index, column_index)
);

-- Charts
CREATE TABLE charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id),
    type VARCHAR(50) NOT NULL, -- line, bar, pie, scatter
    config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**API Endpoints**:
```
POST   /api/v1/spreadsheets               - Create spreadsheet
GET    /api/v1/spreadsheets/:id           - Get spreadsheet
PUT    /api/v1/spreadsheets/:id           - Update spreadsheet
DELETE /api/v1/spreadsheets/:id           - Delete spreadsheet
POST   /api/v1/spreadsheets/:id/sheets    - Add sheet/tab
PUT    /api/v1/spreadsheets/:id/sheets/:sheetId/cells - Update cells
GET    /api/v1/spreadsheets/:id/sheets/:sheetId/cells - Get cells
POST   /api/v1/spreadsheets/:id/charts    - Create chart
GET    /api/v1/spreadsheets/:id/export/:format - Export
POST   /api/v1/spreadsheets/import        - Import
```

---

### 3. Slides Service (Port 8093)

**Responsibilities**:
- Presentation creation and management
- Slide management (add, delete, reorder)
- Slide elements (text, images, shapes, charts)
- Themes and templates
- Export to PPTX, PDF
- Presenter mode support

**Database Schema**:
```sql
-- Presentations table
CREATE TABLE presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    theme_id UUID,
    folder_id UUID REFERENCES folders(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Slides table
CREATE TABLE slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID NOT NULL REFERENCES presentations(id),
    position INTEGER NOT NULL,
    layout VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Slide elements
CREATE TABLE slide_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slide_id UUID NOT NULL REFERENCES slides(id),
    element_type VARCHAR(50) NOT NULL, -- text, image, shape, chart
    position JSONB NOT NULL, -- { "x": 100, "y": 200, "width": 300, "height": 100 }
    properties JSONB NOT NULL,
    z_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Themes
CREATE TABLE presentation_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    colors JSONB NOT NULL,
    fonts JSONB NOT NULL,
    is_system BOOLEAN DEFAULT FALSE
);
```

**API Endpoints**:
```
POST   /api/v1/presentations              - Create presentation
GET    /api/v1/presentations/:id          - Get presentation
PUT    /api/v1/presentations/:id          - Update presentation
DELETE /api/v1/presentations/:id          - Delete presentation
POST   /api/v1/presentations/:id/slides   - Add slide
PUT    /api/v1/presentations/:id/slides/:slideId - Update slide
DELETE /api/v1/presentations/:id/slides/:slideId - Delete slide
GET    /api/v1/presentations/:id/export/:format - Export
GET    /api/v1/themes                     - List themes
```

---

### 4. Mail Service (Port 8094)

**Responsibilities**:
- Email sending and receiving (SMTP/IMAP integration)
- Mailbox management (inbox, sent, drafts, trash)
- Email threads and conversations
- Attachments handling
- Spam filtering
- Email search

**Database Schema**:
```sql
-- Mailboxes
CREATE TABLE mailboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- inbox, sent, drafts, trash, custom
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Emails
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    mailbox_id UUID NOT NULL REFERENCES mailboxes(id),
    message_id VARCHAR(500) UNIQUE, -- RFC822 Message-ID
    thread_id UUID,
    from_address VARCHAR(500) NOT NULL,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    labels TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Attachments
CREATE TABLE email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES emails(id),
    filename VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**API Endpoints**:
```
GET    /api/v1/mail/mailboxes             - List mailboxes
GET    /api/v1/mail/emails                - List emails
GET    /api/v1/mail/emails/:id            - Get email
POST   /api/v1/mail/emails                - Send email
PUT    /api/v1/mail/emails/:id            - Update email (mark read, star, etc.)
DELETE /api/v1/mail/emails/:id            - Delete email
GET    /api/v1/mail/search                - Search emails
POST   /api/v1/mail/attachments           - Upload attachment
```

---

### 5. Calendar Service (Port 8095)

**Responsibilities**:
- Event creation and management
- Calendar sharing
- Event reminders and notifications
- Recurring events
- Meeting scheduling
- Availability checking

**Database Schema**:
```sql
-- Calendars
CREATE TABLE calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    color VARCHAR(7) DEFAULT '#0078D4',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- iCalendar RRULE format
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Event attendees
CREATE TABLE event_attendees (
    event_id UUID NOT NULL REFERENCES events(id),
    user_email VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, tentative
    is_organizer BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (event_id, user_email)
);

-- Event reminders
CREATE TABLE event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    minutes_before INTEGER NOT NULL,
    reminder_type VARCHAR(20) NOT NULL -- email, notification, sms
);
```

**API Endpoints**:
```
GET    /api/v1/calendars                  - List calendars
POST   /api/v1/calendars                  - Create calendar
GET    /api/v1/events                     - List events
POST   /api/v1/events                     - Create event
GET    /api/v1/events/:id                 - Get event
PUT    /api/v1/events/:id                 - Update event
DELETE /api/v1/events/:id                 - Delete event
POST   /api/v1/events/:id/attendees       - Add attendee
PUT    /api/v1/events/:id/attendees/:email - Update attendance status
```

---

### 6. Drive Service (Port 8096)

**Responsibilities**:
- File and folder management
- File upload, download, delete
- File sharing and permissions
- File versioning
- Trash and restore
- Search

**Database Schema**:
```sql
-- Folders
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    parent_folder_id UUID REFERENCES folders(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Files
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    folder_id UUID REFERENCES folders(id),
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- File versions
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id),
    version INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- File shares
CREATE TABLE file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id),
    folder_id UUID REFERENCES folders(id),
    shared_with_user_id UUID,
    shared_with_email VARCHAR(500),
    permission VARCHAR(20) NOT NULL, -- view, comment, edit
    share_link VARCHAR(500),
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**API Endpoints**:
```
GET    /api/v1/drive/folders              - List folders
POST   /api/v1/drive/folders              - Create folder
GET    /api/v1/drive/files                - List files
POST   /api/v1/drive/files                - Upload file
GET    /api/v1/drive/files/:id            - Download file
PUT    /api/v1/drive/files/:id            - Update file
DELETE /api/v1/drive/files/:id            - Delete file
POST   /api/v1/drive/files/:id/share      - Share file
GET    /api/v1/drive/search               - Search files
```

---

### 7-10. Additional Services

Similar detailed specifications exist for:
- **Forms Service** (Port 8097): Form builder, submissions, analytics
- **Meet Service** (Port 8098): Video conferencing, WebRTC signaling
- **Tasks Service** (Port 8099): Task lists, projects, assignments
- **Notes Service** (Port 8100): Rich notes, notebooks, tagging

## Cross-Cutting Concerns

### Authentication Flow
```
1. User logs in → Auth Service validates credentials
2. Auth Service generates JWT (access token + refresh token)
3. Client stores tokens (httpOnly cookie or secure storage)
4. Every API request includes access token in Authorization header
5. API Gateway validates token before routing to services
6. Services verify token signature and extract user/tenant context
```

### Real-Time Collaboration
```
1. User opens document → WebSocket connection established
2. Client subscribes to document channel
3. User makes edit → Client sends change to WebSocket server
4. Server broadcasts change to all connected clients
5. Clients apply operational transformation or CRDT merge
6. Server persists changes to database asynchronously
```

### File Storage
```
1. Client uploads file → Multipart request to API
2. Service saves metadata to PostgreSQL
3. Service stores binary data in MinIO (S3)
4. MinIO returns object key/path
5. Service updates metadata with storage path
6. For downloads: Service retrieves from MinIO and streams to client
```

## Performance Optimizations

### Caching Strategy
- **Redis Cache Layers**:
  - L1: User sessions (TTL: 1 hour)
  - L2: Frequently accessed documents (TTL: 15 minutes)
  - L3: API responses (TTL: 5 minutes)

### Database Optimization
- **Indexing**: All foreign keys, frequently queried columns
- **Partitioning**: Large tables partitioned by tenant_id
- **Connection Pooling**: Max 100 connections per service
- **Read Replicas**: For analytics and reporting queries

### CDN for Static Assets
- Frontend bundles
- Document thumbnails
- User avatars
- Theme assets

## Monitoring & Observability

### Metrics (Prometheus)
- Request rate, latency, error rate (RED metrics)
- Database query performance
- Cache hit/miss rates
- WebSocket connection count

### Logging (Structured JSON)
```json
{
  "timestamp": "2025-11-14T12:00:00Z",
  "level": "info",
  "service": "writer-service",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "request_id": "uuid",
  "message": "Document created",
  "document_id": "uuid"
}
```

### Tracing (Distributed)
- Request flows across services
- Identify bottlenecks
- Debug cross-service issues

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Ready for Implementation
