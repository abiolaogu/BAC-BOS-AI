# Database Schema -- BAC-BOS-AI Platform

## 1. Database Strategy

| Database | Purpose | Dev Environment | Production Target |
|----------|---------|----------------|-------------------|
| PostgreSQL 15 | Primary OLTP | Active (port 5432) | YugabyteDB 2.20+ |
| Redis 7 | Caching, sessions | Active (port 6379) | DragonflyDB 1.0+ |
| Redpanda | Event streaming | Active (port 9092) | Kafka 3.5+ KRaft |
| MinIO | Object storage | Active (ports 9000/9001) | Multi-site MinIO |
| ClickHouse | OLAP analytics | Planned | ClickHouse 23.10+ |
| Qdrant/pgvector | Vector search | Planned | RAG pipeline |
| Elasticsearch | Full-text search | Planned | Content indexing |

---

## 2. Core Platform Schema (bac-platform/database/migrations/001_core_schema.sql)

### 2.1 Tenants Table
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMP,
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    usage JSONB DEFAULT '{}',
    enabled_modules TEXT[] DEFAULT ARRAY['crm', 'erp'],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);
```

### 2.2 Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    preferences JSONB DEFAULT '{}',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login TIMESTAMP,
    UNIQUE(tenant_id, email)
);
```

### 2.3 Roles and User Roles
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_system_role BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, name)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);
```

### 2.4 API Keys
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'private',
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    rate_limit INTEGER DEFAULT 1000,
    usage_stats JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE
);
```

### 2.5 Subscriptions and Invoices
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_interval VARCHAR(50) NOT NULL,
    items JSONB DEFAULT '[]'
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal_cents BIGINT NOT NULL,
    tax_cents BIGINT NOT NULL DEFAULT 0,
    total_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    lines JSONB DEFAULT '[]'
);
```

### 2.6 Audit Logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address VARCHAR(50),
    user_agent TEXT,
    changes JSONB DEFAULT '{}',
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. CRM Schema (services/crm/main.go inline schema)

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(200),
    title VARCHAR(100),
    source VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    tags TEXT[],
    custom_fields JSONB,
    UNIQUE(tenant_id, email)
);

CREATE TABLE leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    value DECIMAL(15,2),
    currency VARCHAR(3),
    source VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new',
    stage VARCHAR(50),
    owner_id UUID,
    priority VARCHAR(20) DEFAULT 'medium',
    tags TEXT[]
);

CREATE TABLE opportunities (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3),
    stage VARCHAR(50) DEFAULT 'prospect',
    probability INT DEFAULT 0,
    close_date DATE,
    products_services TEXT[],
    notes TEXT
);
```

---

## 4. Office Suite Schemas

### 4.1 Writer Tables (nexus-office-suite/database/migrations/001_create_writer_tables.sql)
Documents, document_versions, document_comments, document_collaborators.

### 4.2 Sheets Tables (002_create_sheets_tables.sql)
Spreadsheets, worksheets, cells, formulas, named_ranges.

### 4.3 Drive Tables (003_create_drive_and_shared_tables.sql)
Files, folders, file_versions, permissions, shares, activities.

### 4.4 Mail Schema (nexus-office-suite/backend/mail-service/migrations/001_initial_schema.sql)
Emails, folders, attachments, email_labels, mailboxes.

### 4.5 Calendar Schema (backend/calendar-service/migrations/001_init.sql)
Calendars, events, reminders, attendees, recurring_rules.

### 4.6 Meet Schema (backend/meet-service/migrations/001_initial_schema.sql)
Rooms, participants, recordings, chat_messages.

### 4.7 Slides Schema (backend/slides-service/migrations/001_initial_schema.sql)
Presentations, slides, themes, elements, animations.

---

## 5. Identity Schema (services/idaas/src/database/schema.sql)
Users, credentials, sessions, mfa_devices, oauth_clients, oauth_tokens, organizations.

## 6. Time and Attendance Schema (services/time-attendance/database/schema.sql)
Employees, attendance_records, leave_requests, overtime_records, biometric_devices, remote_work_sessions.

## 7. Database Instances Table
```sql
CREATE TABLE database_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    engine VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    instance_type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'provisioning',
    connection_string TEXT,
    metrics JSONB DEFAULT '{}'
);
```

## 8. Indexing Strategy
All tables include indexes on tenant_id, status, and timestamp columns. CRM tables add indexes on email, owner_id, and stage columns. Audit logs use composite indexes on (tenant_id, timestamp DESC) and (resource_type, resource_id).

## 9. Update Triggers
Auto-update updated_at columns via PostgreSQL triggers using `update_updated_at_column()` function applied to all core tables.

---

*Document version: 1.0 | Last updated: 2026-02-17*
