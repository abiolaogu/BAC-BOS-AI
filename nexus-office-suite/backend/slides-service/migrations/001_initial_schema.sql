-- NEXUS Slides Service Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Presentations table
CREATE TABLE presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    theme_id UUID,
    slide_count INTEGER DEFAULT 0,
    width INTEGER DEFAULT 1920,
    height INTEGER DEFAULT 1080,
    is_public BOOLEAN DEFAULT FALSE,
    thumbnail_url VARCHAR(511),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Slides table
CREATE TABLE slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    title VARCHAR(255),
    notes TEXT,
    background JSONB,
    elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    transition JSONB,
    thumbnail_url VARCHAR(511),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(presentation_id, "order")
);

-- Themes table
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    colors JSONB NOT NULL,
    fonts JSONB NOT NULL,
    layouts JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_presentations_tenant ON presentations(tenant_id, owner_id);
CREATE INDEX idx_presentations_updated ON presentations(updated_at DESC);
CREATE INDEX idx_presentations_title ON presentations(title);

CREATE INDEX idx_slides_presentation ON slides(presentation_id, "order");

CREATE INDEX idx_themes_public ON themes(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_themes_default ON themes(is_default) WHERE is_default = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_presentations_updated_at BEFORE UPDATE ON presentations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slides_updated_at BEFORE UPDATE ON slides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default theme
INSERT INTO themes (id, name, description, is_default, is_public, colors, fonts, layouts)
VALUES (
    uuid_generate_v4(),
    'Default',
    'Default presentation theme',
    TRUE,
    TRUE,
    '{"primary": "#3B82F6", "secondary": "#64748B", "accent": "#F59E0B", "background": "#FFFFFF", "text": "#1F2937"}'::jsonb,
    '{"heading": "Inter", "body": "Inter", "code": "JetBrains Mono"}'::jsonb,
    '[
        {
            "id": "title",
            "name": "Title Slide",
            "elements": [
                {
                    "id": "title",
                    "type": "text",
                    "position": {"x": 100, "y": 400},
                    "size": {"width": 1720, "height": 200},
                    "z_index": 1,
                    "rotation": 0,
                    "locked": false,
                    "content": {
                        "text": "Presentation Title",
                        "font_family": "Inter",
                        "font_size": 72,
                        "font_weight": "bold",
                        "color": "#1F2937",
                        "text_align": "center"
                    }
                }
            ]
        },
        {
            "id": "content",
            "name": "Content Slide",
            "elements": [
                {
                    "id": "title",
                    "type": "text",
                    "position": {"x": 100, "y": 80},
                    "size": {"width": 1720, "height": 100},
                    "z_index": 1,
                    "rotation": 0,
                    "locked": false,
                    "content": {
                        "text": "Slide Title",
                        "font_family": "Inter",
                        "font_size": 48,
                        "font_weight": "bold",
                        "color": "#1F2937"
                    }
                },
                {
                    "id": "content",
                    "type": "text",
                    "position": {"x": 100, "y": 220},
                    "size": {"width": 1720, "height": 700},
                    "z_index": 1,
                    "rotation": 0,
                    "locked": false,
                    "content": {
                        "text": "Content goes here",
                        "font_family": "Inter",
                        "font_size": 32,
                        "color": "#4B5563"
                    }
                }
            ]
        }
    ]'::jsonb
);
