-- NEXUS Mail Service Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- inbox, sent, drafts, trash, spam, starred, custom
    parent_id VARCHAR(36) REFERENCES folders(id) ON DELETE CASCADE,
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(20) DEFAULT '#757575',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_type ON folders(type);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    in_reply_to VARCHAR(255),
    references JSONB DEFAULT '[]',
    from_address VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_addresses JSONB NOT NULL DEFAULT '[]',
    cc_addresses JSONB DEFAULT '[]',
    bcc_addresses JSONB DEFAULT '[]',
    subject TEXT NOT NULL,
    body TEXT,
    body_html TEXT,
    folder_id VARCHAR(36) NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high
    spam_score DECIMAL(5,2) DEFAULT 0.0,
    size BIGINT DEFAULT 0,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    scheduled_at TIMESTAMP,
    read_at TIMESTAMP,
    headers JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_folder_id ON emails(folder_id);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_message_id ON emails(message_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_is_read ON emails(is_read);
CREATE INDEX idx_emails_is_starred ON emails(is_starred);
CREATE INDEX idx_emails_is_deleted ON emails(is_deleted);
CREATE INDEX idx_emails_from_address ON emails(from_address);

-- Full-text search index for emails
CREATE INDEX idx_emails_subject_text ON emails USING gin(to_tsvector('english', subject));
CREATE INDEX idx_emails_body_text ON emails USING gin(to_tsvector('english', body));

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) DEFAULT '#1976d2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_labels_user_id ON labels(user_id);

-- Email-Label junction table (many-to-many)
CREATE TABLE IF NOT EXISTS email_labels (
    email_id VARCHAR(36) NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    label_id VARCHAR(36) NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email_id, label_id)
);

CREATE INDEX idx_email_labels_email_id ON email_labels(email_id);
CREATE INDEX idx_email_labels_label_id ON email_labels(label_id);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    email_id VARCHAR(36) NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    content_id VARCHAR(255), -- For inline images (cid:)
    is_inline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attachments_email_id ON attachments(email_id);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    last_emailed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);

-- Filters table (email rules/filters)
CREATE TABLE IF NOT EXISTS filters (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_filters_user_id ON filters(user_id);
CREATE INDEX idx_filters_enabled ON filters(enabled);

-- Signatures table
CREATE TABLE IF NOT EXISTS signatures (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signatures_user_id ON signatures(user_id);

-- Auto-responders table
CREATE TABLE IF NOT EXISTS auto_responders (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auto_responders_user_id ON auto_responders(user_id);
CREATE INDEX idx_auto_responders_enabled ON auto_responders(enabled);

-- Email aliases table
CREATE TABLE IF NOT EXISTS aliases (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR,
    user_id VARCHAR(36) NOT NULL,
    alias VARCHAR(255) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aliases_user_id ON aliases(user_id);
CREATE INDEX idx_aliases_alias ON aliases(alias);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON labels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filters_updated_at BEFORE UPDATE ON filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signatures_updated_at BEFORE UPDATE ON signatures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_responders_updated_at BEFORE UPDATE ON auto_responders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aliases_updated_at BEFORE UPDATE ON aliases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default folders for demo user
INSERT INTO folders (id, user_id, name, type, icon, color, sort_order) VALUES
    ('inbox-default', 'default-user', 'Inbox', 'inbox', 'inbox', '#1976d2', 1),
    ('sent-default', 'default-user', 'Sent', 'sent', 'send', '#388e3c', 2),
    ('drafts-default', 'default-user', 'Drafts', 'drafts', 'draft', '#f57c00', 3),
    ('trash-default', 'default-user', 'Trash', 'trash', 'delete', '#d32f2f', 4),
    ('spam-default', 'default-user', 'Spam', 'spam', 'report', '#c62828', 5),
    ('starred-default', 'default-user', 'Starred', 'starred', 'star', '#fbc02d', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert sample emails for demo
INSERT INTO emails (
    id, user_id, message_id, thread_id, from_address, from_name, to_addresses,
    subject, body, folder_id, is_read, received_at
) VALUES
    (
        'email-1',
        'default-user',
        '<email-1@nexusmail>',
        'email-1',
        'welcome@nexusmail.local',
        'NEXUS Mail Team',
        '["default-user@nexusmail.local"]',
        'Welcome to NEXUS Mail!',
        'Thank you for using NEXUS Mail. This is your comprehensive email platform with SMTP/IMAP support, spam filtering, and more!',
        'inbox-default',
        false,
        CURRENT_TIMESTAMP
    ),
    (
        'email-2',
        'default-user',
        '<email-2@nexusmail>',
        'email-2',
        'team@nexusmail.local',
        'NEXUS Team',
        '["default-user@nexusmail.local"]',
        'Getting Started Guide',
        'Here are some tips to get started with NEXUS Mail: 1. Compose emails with our rich text editor. 2. Organize emails with folders and labels. 3. Use search to find emails quickly. 4. Enable spam filtering for protection.',
        'inbox-default',
        false,
        CURRENT_TIMESTAMP - INTERVAL '1 hour'
    )
ON CONFLICT (id) DO NOTHING;
