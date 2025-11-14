-- Migration: 001_create_writer_tables
-- Description: Creates tables for Writer service (document management)
-- Created: 2025-11-14

-- ==============================================================================
-- DOCUMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    folder_id UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,

    CONSTRAINT documents_tenant_id_idx CHECK (tenant_id IS NOT NULL)
);

-- Indexes for documents table
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id) WHERE NOT is_deleted;
CREATE INDEX idx_documents_created_by ON documents(created_by) WHERE NOT is_deleted;
CREATE INDEX idx_documents_folder_id ON documents(folder_id) WHERE NOT is_deleted;
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX idx_documents_status ON documents(status) WHERE NOT is_deleted;
CREATE INDEX idx_documents_content_gin ON documents USING gin(content);

-- Full-text search index
CREATE INDEX idx_documents_title_fts ON documents USING gin(to_tsvector('english', title)) WHERE NOT is_deleted;

-- ==============================================================================
-- DOCUMENT VERSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    change_summary TEXT,
    size_bytes INTEGER,

    UNIQUE(document_id, version)
);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);

-- ==============================================================================
-- DOCUMENT COLLABORATORS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS document_collaborators (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'comment', 'edit', 'admin')),
    added_by UUID NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY (document_id, user_id)
);

CREATE INDEX idx_document_collaborators_user_id ON document_collaborators(user_id);
CREATE INDEX idx_document_collaborators_permission ON document_collaborators(permission);

-- ==============================================================================
-- DOCUMENT COMMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    position JSONB,
    parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID
);

CREATE INDEX idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX idx_document_comments_parent_id ON document_comments(parent_comment_id);
CREATE INDEX idx_document_comments_is_resolved ON document_comments(is_resolved);

-- ==============================================================================
-- DOCUMENT ACTIVITY LOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS document_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_activity_document_id ON document_activity(document_id);
CREATE INDEX idx_document_activity_user_id ON document_activity(user_id);
CREATE INDEX idx_document_activity_created_at ON document_activity(created_at DESC);

-- Partition by month for activity logs (example for future optimization)
-- CREATE TABLE document_activity_2025_11 PARTITION OF document_activity
-- FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- ==============================================================================
-- FOLDERS TABLE (shared across Writer and Drive)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_folders_tenant_id ON folders(tenant_id) WHERE NOT is_deleted;
CREATE INDEX idx_folders_parent_id ON folders(parent_folder_id) WHERE NOT is_deleted;
CREATE INDEX idx_folders_path ON folders USING btree(path text_pattern_ops);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log document activity
CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO document_activity(document_id, user_id, action, metadata)
        VALUES (NEW.id, NEW.created_by, 'document.created', '{}'::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
            INSERT INTO document_activity(document_id, user_id, action, metadata)
            VALUES (NEW.id, NEW.created_by, 'document.deleted', '{}'::jsonb);
        ELSE
            INSERT INTO document_activity(document_id, user_id, action, metadata)
            VALUES (NEW.id, NEW.created_by, 'document.updated',
                    jsonb_build_object('version', NEW.version, 'old_version', OLD.version));
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_document_changes AFTER INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION log_document_activity();

-- ==============================================================================
-- FUNCTIONS
-- ==============================================================================

-- Function to search documents by content
CREATE OR REPLACE FUNCTION search_documents(
    p_tenant_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    content JSONB,
    created_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.created_at,
        ts_rank(to_tsvector('english', d.title || ' ' || d.content::text),
                plainto_tsquery('english', p_search_query)) as rank
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
        AND d.is_deleted = FALSE
        AND (
            to_tsvector('english', d.title) @@ plainto_tsquery('english', p_search_query)
            OR to_tsvector('english', d.content::text) @@ plainto_tsquery('english', p_search_query)
        )
    ORDER BY rank DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- SAMPLE DATA (for development only)
-- ==============================================================================

-- Uncomment to insert sample data
-- INSERT INTO documents (tenant_id, title, content, created_by, status) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'Welcome Document',
--  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to NEXUS Writer!"}]}]}',
--  '00000000-0000-0000-0000-000000000001', 'published');

-- ==============================================================================
-- ROLLBACK
-- ==============================================================================

-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS log_document_changes ON documents;
-- DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
-- DROP FUNCTION IF EXISTS log_document_activity();
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP FUNCTION IF EXISTS search_documents(UUID, TEXT, INTEGER, INTEGER);
-- DROP TABLE IF EXISTS document_activity CASCADE;
-- DROP TABLE IF EXISTS document_comments CASCADE;
-- DROP TABLE IF EXISTS document_collaborators CASCADE;
-- DROP TABLE IF EXISTS document_versions CASCADE;
-- DROP TABLE IF EXISTS folders CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
