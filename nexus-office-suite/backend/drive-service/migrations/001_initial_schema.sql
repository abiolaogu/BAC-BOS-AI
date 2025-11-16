-- NEXUS Drive Service Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Folders table
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7),
    is_starred BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMP,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, parent_id, name) -- Prevent duplicate folder names in same parent
);

-- Files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    file_type VARCHAR(31) NOT NULL,
    size BIGINT NOT NULL,
    storage_path VARCHAR(511) NOT NULL UNIQUE,
    version INTEGER DEFAULT 1,
    is_starred BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMP,
    description TEXT,
    tags JSONB,
    metadata JSONB,
    thumbnail_path VARCHAR(511),
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- File versions table
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_num INTEGER NOT NULL,
    size BIGINT NOT NULL,
    storage_path VARCHAR(511) NOT NULL UNIQUE,
    created_by UUID NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, version_num)
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    resource_id UUID NOT NULL,
    resource_type VARCHAR(31) NOT NULL CHECK (resource_type IN ('file', 'folder')),
    user_id UUID,
    email VARCHAR(255),
    role VARCHAR(31) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    granted_by UUID NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Share links table
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    resource_id UUID NOT NULL,
    resource_type VARCHAR(31) NOT NULL CHECK (resource_type IN ('file', 'folder')),
    token VARCHAR(127) NOT NULL UNIQUE,
    role VARCHAR(31) NOT NULL CHECK (role IN ('editor', 'viewer')),
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    max_downloads INTEGER,
    download_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_folders_tenant_owner ON folders(tenant_id, owner_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_starred ON folders(tenant_id, owner_id, is_starred) WHERE is_starred = TRUE;
CREATE INDEX idx_folders_trashed ON folders(tenant_id, owner_id, is_trashed) WHERE is_trashed = TRUE;

CREATE INDEX idx_files_tenant_owner ON files(tenant_id, owner_id);
CREATE INDEX idx_files_folder ON files(folder_id);
CREATE INDEX idx_files_starred ON files(tenant_id, owner_id, is_starred) WHERE is_starred = TRUE;
CREATE INDEX idx_files_trashed ON files(tenant_id, owner_id, is_trashed) WHERE is_trashed = TRUE;
CREATE INDEX idx_files_name ON files(tenant_id, name);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_tags ON files USING GIN(tags);
CREATE INDEX idx_files_last_accessed ON files(tenant_id, owner_id, last_accessed_at DESC);

CREATE INDEX idx_file_versions_file ON file_versions(file_id, version_num DESC);

CREATE INDEX idx_permissions_resource ON permissions(resource_id, resource_type);
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_email ON permissions(email);

CREATE INDEX idx_share_links_resource ON share_links(resource_id, resource_type);
CREATE INDEX idx_share_links_token ON share_links(token);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_share_links_updated_at BEFORE UPDATE ON share_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
