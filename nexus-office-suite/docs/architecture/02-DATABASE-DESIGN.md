# NEXUS Office Suite - Database Design

## Database Strategy

### Multi-Tenancy Approach
We use **schema-based multi-tenancy** in PostgreSQL:
- Each tenant gets its own schema
- Shared tables for system-wide data (tenants, billing, etc.)
- Row-Level Security (RLS) for additional isolation

```sql
-- Example tenant schemas
CREATE SCHEMA tenant_company_a;
CREATE SCHEMA tenant_company_b;
CREATE SCHEMA shared;
```

### Connection Pooling
- **PgBouncer** for connection pooling
- Pool mode: Transaction pooling
- Max connections: 100 per service
- Min connections: 10 per service

## Core Database Schemas

### Shared Schema (System-Wide)

```sql
-- Tenants
CREATE TABLE shared.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL, -- free, pro, enterprise
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    settings JSONB DEFAULT '{}'
);

-- Users (cross-tenant)
CREATE TABLE shared.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(500) UNIQUE NOT NULL,
    password_hash VARCHAR(500) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Tenant memberships
CREATE TABLE shared.tenant_memberships (
    tenant_id UUID NOT NULL REFERENCES shared.tenants(id),
    user_id UUID NOT NULL REFERENCES shared.users(id),
    role VARCHAR(50) NOT NULL, -- owner, admin, member
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

-- OAuth tokens
CREATE TABLE shared.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES shared.users(id),
    provider VARCHAR(50) NOT NULL, -- google, microsoft, zoho
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Tenant Schema Template

Each tenant gets these tables in their dedicated schema:

```sql
-- Set search path for tenant
SET search_path TO tenant_<tenant_id>, public;

-- Documents (Writer)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    folder_id UUID REFERENCES folders(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX idx_documents_content_gin ON documents USING gin(content);

-- Spreadsheets (Sheets)
CREATE TABLE spreadsheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    folder_id UUID REFERENCES folders(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Sheets (tabs within spreadsheet)
CREATE TABLE sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    row_count INTEGER DEFAULT 1000,
    column_count INTEGER DEFAULT 26
);

-- Cells (sparse storage)
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    value TEXT,
    formula TEXT,
    data_type VARCHAR(20),
    style JSONB,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(sheet_id, row_index, column_index)
);

CREATE INDEX idx_cells_sheet_id ON cells(sheet_id);
CREATE INDEX idx_cells_position ON cells(sheet_id, row_index, column_index);

-- Presentations (Slides)
CREATE TABLE presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    theme_id UUID,
    folder_id UUID REFERENCES folders(id),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    layout VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    notes TEXT
);

-- Emails (Mail)
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(500) UNIQUE,
    thread_id UUID,
    from_address VARCHAR(500) NOT NULL,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    received_at TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    labels TEXT[]
);

CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_labels ON emails USING gin(labels);

-- Calendar events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_calendar_id ON events(calendar_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_created_by ON events(created_by);

-- Files (Drive)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_created_by ON files(created_by);

-- Folders (shared across all apps)
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    parent_folder_id UUID REFERENCES folders(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_folders_parent_id ON folders(parent_folder_id);

-- Activity log (audit trail)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
```

## Database Migrations

### Migration Strategy
- Use **golang-migrate** for version control
- Migrations stored in `/database/migrations/`
- Naming: `YYYYMMDDHHMMSS_description.up.sql` and `.down.sql`

### Example Migration

```sql
-- 20251114100000_create_documents_table.up.sql
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 20251114100000_create_documents_table.down.sql
DROP TABLE IF EXISTS documents;
```

## Query Optimization

### Indexing Strategy
1. **Primary Keys**: All tables have UUID primary keys
2. **Foreign Keys**: Indexed for JOIN performance
3. **Frequently Queried Columns**: created_at, updated_at, user_id
4. **Full-Text Search**: GIN indexes on JSONB and text columns
5. **Composite Indexes**: For common multi-column queries

### Example Optimized Query

```sql
-- Before: Full table scan
SELECT * FROM documents WHERE created_by = 'user-uuid' ORDER BY updated_at DESC;

-- After: Uses idx_documents_created_by and idx_documents_updated_at
EXPLAIN ANALYZE
SELECT id, title, created_at, updated_at
FROM documents
WHERE created_by = 'user-uuid'
ORDER BY updated_at DESC
LIMIT 20;
```

## Backup & Recovery

### Backup Strategy
- **Continuous Archiving**: WAL archiving to S3
- **Daily Snapshots**: Full database backups
- **Point-in-Time Recovery**: Up to 30 days
- **Geo-Replication**: Multi-region replicas

### Disaster Recovery
- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 5 minutes
- **Automated Failover**: Standby replicas

## Scaling Strategy

### Vertical Scaling
- Start: 4 vCPU, 16GB RAM
- Scale up to: 32 vCPU, 128GB RAM

### Horizontal Scaling
- **Read Replicas**: For read-heavy workloads
- **Sharding**: By tenant_id for very large deployments
- **Connection Pooling**: PgBouncer

### Partitioning
```sql
-- Partition activity_log by month
CREATE TABLE activity_log_2025_11 PARTITION OF activity_log
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

## Data Retention

### Retention Policies
- **Active Documents**: Indefinite
- **Deleted Documents**: 30 days (soft delete)
- **Activity Logs**: 1 year
- **Email**: Configurable per tenant
- **File Versions**: Keep last 10 versions

### Archive Strategy
```sql
-- Move old activity logs to archive table
INSERT INTO activity_log_archive
SELECT * FROM activity_log
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM activity_log
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Ready for Implementation
