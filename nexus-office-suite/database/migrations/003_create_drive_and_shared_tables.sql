-- Migration: 003_create_drive_and_shared_tables
-- Description: Creates tables for Drive service and shared tables
-- Created: 2025-11-14

-- ==============================================================================
-- FILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    folder_id UUID,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    md5_hash CHAR(32),
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    thumbnail_url TEXT,
    metadata JSONB
);

CREATE INDEX idx_files_tenant_id ON files(tenant_id) WHERE NOT is_deleted;
CREATE INDEX idx_files_folder_id ON files(folder_id) WHERE NOT is_deleted;
CREATE INDEX idx_files_created_by ON files(created_by) WHERE NOT is_deleted;
CREATE INDEX idx_files_mime_type ON files(mime_type) WHERE NOT is_deleted;
CREATE INDEX idx_files_md5_hash ON files(md5_hash);
CREATE INDEX idx_files_updated_at ON files(updated_at DESC);

-- ==============================================================================
-- FILE VERSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    md5_hash CHAR(32),
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(file_id, version)
);

CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX idx_file_versions_created_at ON file_versions(created_at DESC);

-- ==============================================================================
-- FILE SHARES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    folder_id UUID,
    shared_with_user_id UUID,
    shared_with_email VARCHAR(500),
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'comment', 'edit')),
    share_link VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CHECK (file_id IS NOT NULL OR folder_id IS NOT NULL),
    CHECK (shared_with_user_id IS NOT NULL OR shared_with_email IS NOT NULL OR share_link IS NOT NULL)
);

CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX idx_file_shares_folder_id ON file_shares(folder_id);
CREATE INDEX idx_file_shares_user_id ON file_shares(shared_with_user_id);
CREATE INDEX idx_file_shares_email ON file_shares(shared_with_email);
CREATE INDEX idx_file_shares_link ON file_shares(share_link) WHERE share_link IS NOT NULL;

-- ==============================================================================
-- FILE COMMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS file_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES file_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX idx_file_comments_user_id ON file_comments(user_id);
CREATE INDEX idx_file_comments_parent_id ON file_comments(parent_comment_id);

-- ==============================================================================
-- STORAGE QUOTA TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS storage_quota (
    tenant_id UUID PRIMARY KEY,
    total_bytes BIGINT NOT NULL,
    used_bytes BIGINT NOT NULL DEFAULT 0,
    files_bytes BIGINT NOT NULL DEFAULT 0,
    photos_bytes BIGINT NOT NULL DEFAULT 0,
    trash_bytes BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storage_quota_updated_at ON storage_quota(updated_at);

-- ==============================================================================
-- SHARED TABLES (used across all services)
-- ==============================================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(500) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id) WHERE status = 'active';
CREATE INDEX idx_users_email ON users(email) WHERE status = 'active';
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);

-- TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'cancelled')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain) WHERE status = 'active';
CREATE INDEX idx_tenants_status ON tenants(status);

-- TENANT MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS tenant_memberships (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'invited')),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX idx_tenant_memberships_user_id ON tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_role ON tenant_memberships(role);

-- ACTIVITY LOG TABLE (global)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Partition by month for activity_log
-- CREATE TABLE activity_log_2025_11 PARTITION OF activity_log
-- FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id) WHERE is_active = TRUE;

-- WEBHOOK DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at)
    WHERE delivered_at IS NULL AND attempts < max_attempts;

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update storage quota when file is created/updated/deleted
CREATE OR REPLACE FUNCTION update_storage_quota()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO storage_quota (tenant_id, total_bytes, used_bytes, files_bytes)
        VALUES (NEW.tenant_id, 107374182400, NEW.size_bytes, NEW.size_bytes)
        ON CONFLICT (tenant_id) DO UPDATE
        SET used_bytes = storage_quota.used_bytes + NEW.size_bytes,
            files_bytes = storage_quota.files_bytes + NEW.size_bytes,
            updated_at = NOW();
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
            UPDATE storage_quota
            SET used_bytes = used_bytes - OLD.size_bytes,
                files_bytes = files_bytes - OLD.size_bytes,
                trash_bytes = trash_bytes + OLD.size_bytes,
                updated_at = NOW()
            WHERE tenant_id = OLD.tenant_id;
        ELSIF (NEW.is_deleted = FALSE AND OLD.is_deleted = TRUE) THEN
            UPDATE storage_quota
            SET used_bytes = used_bytes + NEW.size_bytes,
                files_bytes = files_bytes + NEW.size_bytes,
                trash_bytes = trash_bytes - OLD.size_bytes,
                updated_at = NOW()
            WHERE tenant_id = NEW.tenant_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE storage_quota
        SET trash_bytes = trash_bytes - OLD.size_bytes,
            updated_at = NOW()
        WHERE tenant_id = OLD.tenant_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quota_on_file_change AFTER INSERT OR UPDATE OR DELETE ON files
    FOR EACH ROW EXECUTE FUNCTION update_storage_quota();

-- ==============================================================================
-- FUNCTIONS
-- ==============================================================================

-- Function to search files
CREATE OR REPLACE FUNCTION search_files(
    p_tenant_id UUID,
    p_user_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    mime_type VARCHAR,
    size_bytes BIGINT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.mime_type, f.size_bytes, f.created_at
    FROM files f
    WHERE f.tenant_id = p_tenant_id
        AND f.is_deleted = FALSE
        AND (
            f.created_by = p_user_id
            OR EXISTS (
                SELECT 1 FROM file_shares fs
                WHERE fs.file_id = f.id
                    AND (fs.shared_with_user_id = p_user_id OR fs.share_link IS NOT NULL)
            )
        )
        AND f.name ILIKE '%' || p_search_query || '%'
    ORDER BY f.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get folder size (recursive)
CREATE OR REPLACE FUNCTION get_folder_size(p_folder_id UUID)
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT := 0;
BEGIN
    -- Sum of files in this folder
    SELECT COALESCE(SUM(size_bytes), 0) INTO total_size
    FROM files
    WHERE folder_id = p_folder_id AND is_deleted = FALSE;

    -- Add sizes from subfolders (recursive)
    SELECT total_size + COALESCE(SUM(get_folder_size(id)), 0) INTO total_size
    FROM folders
    WHERE parent_folder_id = p_folder_id AND is_deleted = FALSE;

    RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- VIEWS
-- ==============================================================================

-- View for shared files
CREATE OR REPLACE VIEW shared_files AS
SELECT
    f.id,
    f.name,
    f.mime_type,
    f.size_bytes,
    f.created_by,
    fs.shared_with_user_id,
    fs.permission,
    fs.created_at as shared_at
FROM files f
INNER JOIN file_shares fs ON f.id = fs.file_id
WHERE f.is_deleted = FALSE;

-- View for storage usage by tenant
CREATE OR REPLACE VIEW tenant_storage_usage AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    COALESCE(sq.total_bytes, 0) as total_bytes,
    COALESCE(sq.used_bytes, 0) as used_bytes,
    COALESCE(sq.total_bytes - sq.used_bytes, 0) as available_bytes,
    ROUND((COALESCE(sq.used_bytes, 0)::NUMERIC / NULLIF(sq.total_bytes, 0)) * 100, 2) as usage_percentage
FROM tenants t
LEFT JOIN storage_quota sq ON t.id = sq.tenant_id;

-- ==============================================================================
-- ROLLBACK
-- ==============================================================================

-- To rollback:
-- DROP VIEW IF EXISTS tenant_storage_usage;
-- DROP VIEW IF EXISTS shared_files;
-- DROP FUNCTION IF EXISTS get_folder_size(UUID);
-- DROP FUNCTION IF EXISTS search_files(UUID, UUID, TEXT, INTEGER);
-- DROP TRIGGER IF EXISTS update_quota_on_file_change ON files;
-- DROP FUNCTION IF EXISTS update_storage_quota();
-- DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- DROP TRIGGER IF EXISTS update_files_updated_at ON files;
-- DROP TABLE IF EXISTS webhook_deliveries CASCADE;
-- DROP TABLE IF EXISTS webhooks CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS activity_log CASCADE;
-- DROP TABLE IF EXISTS tenant_memberships CASCADE;
-- DROP TABLE IF EXISTS tenants CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS storage_quota CASCADE;
-- DROP TABLE IF EXISTS file_comments CASCADE;
-- DROP TABLE IF EXISTS file_shares CASCADE;
-- DROP TABLE IF EXISTS file_versions CASCADE;
-- DROP TABLE IF EXISTS files CASCADE;
