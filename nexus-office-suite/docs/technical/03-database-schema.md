# Database Schema

**Version**: 1.0
**Database**: PostgreSQL 15

---

## Core Tables

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  tenant_id UUID REFERENCES tenants(id),
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content JSONB,
  owner_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  folder_id UUID REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
```

### files
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  storage_path TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  folder_id UUID REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

---

## Relationships

### Entity Relationship Diagram

```
tenants (1) ──< (M) users
users (1) ──< (M) documents
users (1) ──< (M) files
folders (1) ──< (M) documents
folders (1) ──< (M) files
```

---

**Previous**: [API Reference](02-api-reference.md) | **Next**: [WebSocket Events →](04-websocket-events.md)
