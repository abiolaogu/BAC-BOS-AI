-- Migration: 002_create_sheets_tables
-- Description: Creates tables for Sheets service (spreadsheet management)
-- Created: 2025-11-14

-- ==============================================================================
-- SPREADSHEETS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS spreadsheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    folder_id UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_spreadsheets_tenant_id ON spreadsheets(tenant_id) WHERE NOT is_deleted;
CREATE INDEX idx_spreadsheets_created_by ON spreadsheets(created_by) WHERE NOT is_deleted;
CREATE INDEX idx_spreadsheets_folder_id ON spreadsheets(folder_id) WHERE NOT is_deleted;
CREATE INDEX idx_spreadsheets_updated_at ON spreadsheets(updated_at DESC);

-- ==============================================================================
-- SHEETS TABLE (tabs within a spreadsheet)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 1000,
    column_count INTEGER NOT NULL DEFAULT 26,
    frozen_rows INTEGER DEFAULT 0,
    frozen_columns INTEGER DEFAULT 0,
    hidden_rows INTEGER[],
    hidden_columns INTEGER[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(spreadsheet_id, position)
);

CREATE INDEX idx_sheets_spreadsheet_id ON sheets(spreadsheet_id);
CREATE INDEX idx_sheets_position ON sheets(spreadsheet_id, position);

-- ==============================================================================
-- CELLS TABLE (sparse storage - only non-empty cells)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    value TEXT,
    formula TEXT,
    data_type VARCHAR(20) NOT NULL DEFAULT 'string'
        CHECK (data_type IN ('string', 'number', 'boolean', 'date', 'formula', 'error')),
    formatted_value TEXT,
    style JSONB,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by UUID,

    UNIQUE(sheet_id, row_index, column_index)
);

-- Composite index for efficient range queries
CREATE INDEX idx_cells_sheet_position ON cells(sheet_id, row_index, column_index);
CREATE INDEX idx_cells_formula ON cells(sheet_id) WHERE formula IS NOT NULL;
CREATE INDEX idx_cells_updated_at ON cells(updated_at DESC);

-- ==============================================================================
-- NAMED RANGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS named_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    range_notation VARCHAR(100) NOT NULL,
    sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
    start_row INTEGER,
    start_column INTEGER,
    end_row INTEGER,
    end_column INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(spreadsheet_id, name)
);

CREATE INDEX idx_named_ranges_spreadsheet ON named_ranges(spreadsheet_id);

-- ==============================================================================
-- CHARTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('line', 'bar', 'pie', 'scatter', 'area', 'column')),
    title VARCHAR(200),
    data_range VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    position JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charts_sheet_id ON charts(sheet_id);

-- ==============================================================================
-- CONDITIONAL FORMATTING TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS conditional_formatting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    range_notation VARCHAR(100) NOT NULL,
    rules JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conditional_formatting_sheet ON conditional_formatting(sheet_id);

-- ==============================================================================
-- DATA VALIDATION TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS data_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    range_notation VARCHAR(100) NOT NULL,
    rule JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_validation_sheet ON data_validation(sheet_id);

-- ==============================================================================
-- PIVOT TABLES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pivot_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    source_sheet_id UUID NOT NULL REFERENCES sheets(id),
    target_sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    source_range VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pivot_tables_spreadsheet ON pivot_tables(spreadsheet_id);
CREATE INDEX idx_pivot_tables_source_sheet ON pivot_tables(source_sheet_id);

-- ==============================================================================
-- SPREADSHEET ACTIVITY LOG
-- ==============================================================================
CREATE TABLE IF NOT EXISTS spreadsheet_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spreadsheet_activity_spreadsheet ON spreadsheet_activity(spreadsheet_id);
CREATE INDEX idx_spreadsheet_activity_sheet ON spreadsheet_activity(sheet_id);
CREATE INDEX idx_spreadsheet_activity_created_at ON spreadsheet_activity(created_at DESC);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Update timestamp trigger
CREATE TRIGGER update_spreadsheets_updated_at BEFORE UPDATE ON spreadsheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sheets_updated_at BEFORE UPDATE ON sheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON cells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- FUNCTIONS
-- ==============================================================================

-- Function to get cell by A1 notation
CREATE OR REPLACE FUNCTION get_cell_by_notation(
    p_sheet_id UUID,
    p_notation VARCHAR
)
RETURNS TABLE (
    id UUID,
    value TEXT,
    formula TEXT,
    data_type VARCHAR
) AS $$
DECLARE
    v_col_index INTEGER;
    v_row_index INTEGER;
BEGIN
    -- Parse A1 notation (e.g., "A1" -> col=0, row=0)
    -- This is a simplified version; production would need full A1 parser
    v_col_index := ASCII(SUBSTRING(p_notation FROM '^[A-Z]+')) - ASCII('A');
    v_row_index := CAST(SUBSTRING(p_notation FROM '[0-9]+$') AS INTEGER) - 1;

    RETURN QUERY
    SELECT c.id, c.value, c.formula, c.data_type
    FROM cells c
    WHERE c.sheet_id = p_sheet_id
        AND c.row_index = v_row_index
        AND c.column_index = v_col_index;
END;
$$ LANGUAGE plpgsql;

-- Function to get cell range
CREATE OR REPLACE FUNCTION get_cell_range(
    p_sheet_id UUID,
    p_start_row INTEGER,
    p_start_col INTEGER,
    p_end_row INTEGER,
    p_end_col INTEGER
)
RETURNS TABLE (
    row_index INTEGER,
    column_index INTEGER,
    value TEXT,
    formula TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.row_index, c.column_index, c.value, c.formula
    FROM cells c
    WHERE c.sheet_id = p_sheet_id
        AND c.row_index BETWEEN p_start_row AND p_end_row
        AND c.column_index BETWEEN p_start_col AND p_end_col
    ORDER BY c.row_index, c.column_index;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate formula dependencies
CREATE OR REPLACE FUNCTION get_formula_dependencies(
    p_sheet_id UUID,
    p_row INTEGER,
    p_col INTEGER
)
RETURNS TABLE (
    dependent_row INTEGER,
    dependent_col INTEGER
) AS $$
BEGIN
    -- This is a placeholder; actual implementation would parse formulas
    -- and extract cell references
    RETURN QUERY
    SELECT row_index, column_index
    FROM cells
    WHERE sheet_id = p_sheet_id
        AND formula LIKE '%' || p_row::TEXT || '%'
        AND formula IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- VIEWS
-- ==============================================================================

-- View for getting sheet statistics
CREATE OR REPLACE VIEW sheet_stats AS
SELECT
    s.id as sheet_id,
    s.spreadsheet_id,
    s.name as sheet_name,
    COUNT(c.id) as cell_count,
    COUNT(CASE WHEN c.formula IS NOT NULL THEN 1 END) as formula_count,
    SUM(LENGTH(c.value)) as total_data_size
FROM sheets s
LEFT JOIN cells c ON s.id = c.sheet_id
GROUP BY s.id, s.spreadsheet_id, s.name;

-- ==============================================================================
-- ROLLBACK
-- ==============================================================================

-- To rollback:
-- DROP VIEW IF EXISTS sheet_stats;
-- DROP FUNCTION IF EXISTS get_formula_dependencies(UUID, INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS get_cell_range(UUID, INTEGER, INTEGER, INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS get_cell_by_notation(UUID, VARCHAR);
-- DROP TRIGGER IF EXISTS update_cells_updated_at ON cells;
-- DROP TRIGGER IF EXISTS update_sheets_updated_at ON sheets;
-- DROP TRIGGER IF EXISTS update_spreadsheets_updated_at ON spreadsheets;
-- DROP TABLE IF EXISTS spreadsheet_activity CASCADE;
-- DROP TABLE IF EXISTS pivot_tables CASCADE;
-- DROP TABLE IF EXISTS data_validation CASCADE;
-- DROP TABLE IF EXISTS conditional_formatting CASCADE;
-- DROP TABLE IF EXISTS charts CASCADE;
-- DROP TABLE IF EXISTS named_ranges CASCADE;
-- DROP TABLE IF EXISTS cells CASCADE;
-- DROP TABLE IF EXISTS sheets CASCADE;
-- DROP TABLE IF EXISTS spreadsheets CASCADE;
