-- NEXUS Time & Attendance Database Schema
-- PostgreSQL 16+ with uuid-ossp, pgcrypto, and timescaledb extensions

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "timescaledb"; -- For time-series data

-- ==================== Attendance Policies ====================

CREATE TABLE attendance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL DEFAULT 'regular',

    -- Work schedule
    work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- Monday-Friday
    start_time TIME,
    end_time TIME,
    core_hours_start TIME,
    core_hours_end TIME,
    grace_minutes INTEGER DEFAULT 15,
    minimum_hours_per_day DECIMAL(4,2) DEFAULT 8.0,

    -- Overtime
    overtime_enabled BOOLEAN DEFAULT TRUE,
    overtime_after_hours DECIMAL(4,2) DEFAULT 8.0,
    overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
    overtime_requires_approval BOOLEAN DEFAULT TRUE,

    -- Breaks
    paid_break_duration INTEGER DEFAULT 15, -- minutes
    paid_break_count INTEGER DEFAULT 2,
    unpaid_break_duration INTEGER DEFAULT 60,
    unpaid_break_count INTEGER DEFAULT 1,

    -- Remote work
    remote_work_enabled BOOLEAN DEFAULT TRUE,
    track_productivity BOOLEAN DEFAULT TRUE,
    screenshot_interval INTEGER, -- minutes (null = disabled)
    min_active_percentage DECIMAL(5,2) DEFAULT 70.0,

    -- Settings
    auto_checkout_enabled BOOLEAN DEFAULT FALSE,
    auto_checkout_time TIME,
    require_checkout BOOLEAN DEFAULT TRUE,
    allow_manual_entry BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_policy_type CHECK (policy_type IN ('regular', 'flexible', 'shift'))
);

CREATE INDEX idx_attendance_policies_org ON attendance_policies(organization_id);
CREATE INDEX idx_attendance_policies_active ON attendance_policies(is_active) WHERE is_active = TRUE;

-- ==================== Shifts ====================

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID REFERENCES attendance_policies(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INTEGER[] NOT NULL,
    color VARCHAR(7), -- Hex color for UI
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_policy ON shifts(policy_id);
CREATE INDEX idx_shifts_org ON shifts(organization_id);

-- ==================== User Policy Assignments ====================

CREATE TABLE user_attendance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    policy_id UUID REFERENCES attendance_policies(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, policy_id, effective_from)
);

CREATE INDEX idx_user_policies_user ON user_attendance_policies(user_id);
CREATE INDEX idx_user_policies_policy ON user_attendance_policies(policy_id);
CREATE INDEX idx_user_policies_dates ON user_attendance_policies(effective_from, effective_until);

-- ==================== Biometric Devices ====================

CREATE TABLE biometric_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    device_id VARCHAR(255) NOT NULL UNIQUE, -- Manufacturer device ID
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255),
    location VARCHAR(255),

    -- Connection
    connection_type VARCHAR(50) NOT NULL,
    connection_details JSONB NOT NULL,

    -- Capabilities
    capabilities TEXT[] NOT NULL,
    max_users INTEGER DEFAULT 10000,
    max_fingerprints INTEGER DEFAULT 10000,
    max_faces INTEGER DEFAULT 5000,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'offline',
    last_ping TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    firmware_version VARCHAR(50),

    -- Stats
    enrolled_users INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,

    -- Settings
    verification_threshold DECIMAL(5,2) DEFAULT 90.0,
    anti_passback BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_device_status CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
    CONSTRAINT chk_connection_type CHECK (connection_type IN ('tcp', 'http', 'serial', 'usb', 'mqtt'))
);

CREATE INDEX idx_devices_org ON biometric_devices(organization_id);
CREATE INDEX idx_devices_status ON biometric_devices(status);
CREATE INDEX idx_devices_active ON biometric_devices(is_active) WHERE is_active = TRUE;

-- ==================== Biometric Enrollments ====================

CREATE TABLE biometric_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_id UUID REFERENCES biometric_devices(id) ON DELETE CASCADE,
    biometric_type VARCHAR(50) NOT NULL,
    template_data BYTEA NOT NULL, -- Encrypted biometric template
    quality_score DECIMAL(5,2),
    finger_index INTEGER, -- For fingerprint (0-9)
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_verified TIMESTAMP WITH TIME ZONE,
    verification_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT chk_biometric_type CHECK (biometric_type IN ('fingerprint', 'face', 'iris', 'palm', 'voice')),
    CONSTRAINT chk_finger_index CHECK (finger_index IS NULL OR (finger_index >= 0 AND finger_index <= 9))
);

CREATE INDEX idx_enrollments_user ON biometric_enrollments(user_id);
CREATE INDEX idx_enrollments_device ON biometric_enrollments(device_id);
CREATE INDEX idx_enrollments_type ON biometric_enrollments(biometric_type);
CREATE INDEX idx_enrollments_active ON biometric_enrollments(is_active) WHERE is_active = TRUE;

-- ==================== Attendance Records ====================

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    policy_id UUID REFERENCES attendance_policies(id),
    shift_id UUID REFERENCES shifts(id),

    -- Date and time
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,

    -- Location and method
    location_type VARCHAR(50) NOT NULL,
    check_in_device_id UUID REFERENCES biometric_devices(id),
    check_out_device_id UUID REFERENCES biometric_devices(id),
    check_in_method VARCHAR(50),
    check_out_method VARCHAR(50),

    -- Verification details
    check_in_verification JSONB,
    check_out_verification JSONB,

    -- Location data
    check_in_location JSONB,
    check_out_location JSONB,

    -- Work hours
    total_hours DECIMAL(5,2),
    productive_hours DECIMAL(5,2),
    idle_hours DECIMAL(5,2),
    break_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    is_late BOOLEAN DEFAULT FALSE,
    is_early_departure BOOLEAN DEFAULT FALSE,
    is_overtime BOOLEAN DEFAULT FALSE,

    -- Manual adjustments
    is_manual_entry BOOLEAN DEFAULT FALSE,
    manual_reason TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_location_type CHECK (location_type IN ('office', 'remote', 'field', 'client-site')),
    CONSTRAINT chk_attendance_status CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on-leave', 'pending')),
    CONSTRAINT chk_check_times CHECK (check_out_time IS NULL OR check_out_time > check_in_time),
    UNIQUE(user_id, attendance_date)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('attendance_records', 'attendance_date');

CREATE INDEX idx_attendance_user ON attendance_records(user_id, attendance_date DESC);
CREATE INDEX idx_attendance_org ON attendance_records(organization_id, attendance_date DESC);
CREATE INDEX idx_attendance_status ON attendance_records(status, attendance_date DESC);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date DESC);
CREATE INDEX idx_attendance_policy ON attendance_records(policy_id);

-- ==================== Activity Tracking (Remote Work) ====================

CREATE TABLE activity_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    attendance_id UUID REFERENCES attendance_records(id) ON DELETE CASCADE,

    -- Timestamp
    activity_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL,

    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    application_name VARCHAR(255),
    window_title VARCHAR(500),
    application_category VARCHAR(50),

    -- Productivity
    productivity_score DECIMAL(5,2),
    focus_level VARCHAR(20),
    is_active_time BOOLEAN DEFAULT TRUE,
    is_meeting BOOLEAN DEFAULT FALSE,

    -- Work attribution
    project_id UUID,
    task_id UUID,
    work_category VARCHAR(100),

    -- Screenshot (if enabled)
    screenshot_id UUID,
    screenshot_url TEXT,
    is_blurred BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_activity_type CHECK (activity_type IN ('application', 'document', 'meeting', 'break', 'idle')),
    CONSTRAINT chk_app_category CHECK (application_category IN ('productive', 'communication', 'neutral', 'unproductive', 'uncategorized')),
    CONSTRAINT chk_focus_level CHECK (focus_level IN ('high', 'medium', 'low'))
);

-- Convert to hypertable
SELECT create_hypertable('activity_records', 'activity_timestamp');

CREATE INDEX idx_activity_user ON activity_records(user_id, activity_timestamp DESC);
CREATE INDEX idx_activity_attendance ON activity_records(attendance_id);
CREATE INDEX idx_activity_category ON activity_records(application_category);
CREATE INDEX idx_activity_project ON activity_records(project_id);

-- ==================== Break Records ====================

CREATE TABLE break_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES attendance_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,

    break_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,

    is_paid BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_break_type CHECK (break_type IN ('lunch', 'tea', 'personal', 'prayer', 'other')),
    CONSTRAINT chk_break_times CHECK (end_time IS NULL OR end_time > start_time)
);

CREATE INDEX idx_breaks_attendance ON break_records(attendance_id);
CREATE INDEX idx_breaks_user ON break_records(user_id);

-- ==================== Leave Requests ====================

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    leave_type VARCHAR(50) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,

    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    requested_by UUID NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_leave_type CHECK (leave_type IN ('vacation', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'unpaid', 'comp-time')),
    CONSTRAINT chk_leave_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leaves_user ON leave_requests(user_id);
CREATE INDEX idx_leaves_org ON leave_requests(organization_id);
CREATE INDEX idx_leaves_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leaves_status ON leave_requests(status);

-- ==================== Leave Balances ====================

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,

    total_days DECIMAL(4,1) NOT NULL,
    used_days DECIMAL(4,1) DEFAULT 0,
    remaining_days DECIMAL(4,1) NOT NULL,

    carried_forward DECIMAL(4,1) DEFAULT 0,
    expires_on DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, leave_type, year)
);

CREATE INDEX idx_leave_balance_user ON leave_balances(user_id);
CREATE INDEX idx_leave_balance_year ON leave_balances(year);

-- ==================== Overtime Requests ====================

CREATE TABLE overtime_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    attendance_id UUID REFERENCES attendance_records(id),
    organization_id UUID NOT NULL,

    overtime_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    hours DECIMAL(4,2) NOT NULL,

    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    requested_by UUID NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_overtime_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_overtime_times CHECK (end_time > start_time)
);

CREATE INDEX idx_overtime_user ON overtime_requests(user_id);
CREATE INDEX idx_overtime_org ON overtime_requests(organization_id);
CREATE INDEX idx_overtime_date ON overtime_requests(overtime_date DESC);
CREATE INDEX idx_overtime_status ON overtime_requests(status);

-- ==================== Application Categories ====================

CREATE TABLE application_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    application_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    productivity_score DECIMAL(5,2) DEFAULT 50.0,

    -- Pattern matching
    window_title_pattern VARCHAR(500),
    url_pattern VARCHAR(500),

    is_custom BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_app_cat_category CHECK (category IN ('productive', 'communication', 'neutral', 'unproductive')),
    CONSTRAINT chk_productivity_score CHECK (productivity_score >= 0 AND productivity_score <= 100)
);

CREATE INDEX idx_app_cat_org ON application_categories(organization_id);
CREATE INDEX idx_app_cat_name ON application_categories(application_name);
CREATE INDEX idx_app_cat_active ON application_categories(is_active) WHERE is_active = TRUE;

-- ==================== Remote Work Agents ====================

CREATE TABLE remote_work_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),

    -- Device info
    os_type VARCHAR(50),
    os_version VARCHAR(100),
    agent_version VARCHAR(50),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'offline',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,

    -- Settings
    tracking_enabled BOOLEAN DEFAULT TRUE,
    screenshot_enabled BOOLEAN DEFAULT FALSE,
    screenshot_interval INTEGER,
    blur_screenshots BOOLEAN DEFAULT FALSE,

    -- Stats
    total_uptime_hours DECIMAL(10,2) DEFAULT 0,
    total_activities INTEGER DEFAULT 0,

    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_agent_status CHECK (status IN ('online', 'offline', 'paused', 'error')),
    CONSTRAINT chk_os_type CHECK (os_type IN ('windows', 'macos', 'linux', 'ios', 'android')),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_agents_user ON remote_work_agents(user_id);
CREATE INDEX idx_agents_status ON remote_work_agents(status);
CREATE INDEX idx_agents_heartbeat ON remote_work_agents(last_heartbeat DESC);

-- ==================== Audit Logs ====================

CREATE TABLE attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    organization_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,

    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON attendance_audit_logs(user_id);
CREATE INDEX idx_audit_org ON attendance_audit_logs(organization_id);
CREATE INDEX idx_audit_action ON attendance_audit_logs(action);
CREATE INDEX idx_audit_created ON attendance_audit_logs(created_at DESC);

-- ==================== Functions ====================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_attendance_policies_updated_at BEFORE UPDATE ON attendance_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON biometric_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_updated_at BEFORE UPDATE ON overtime_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== Views ====================

-- Daily attendance summary view
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT
    ar.organization_id,
    ar.attendance_date,
    ar.policy_id,
    COUNT(*) as total_employees,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN ar.is_late THEN 1 END) as late_count,
    COUNT(CASE WHEN ar.is_overtime THEN 1 END) as overtime_count,
    AVG(ar.total_hours) as avg_hours,
    SUM(ar.overtime_hours) as total_overtime_hours
FROM attendance_records ar
WHERE ar.check_in_time IS NOT NULL
GROUP BY ar.organization_id, ar.attendance_date, ar.policy_id;

-- User productivity view
CREATE OR REPLACE VIEW user_productivity_summary AS
SELECT
    ar.user_id,
    ar.attendance_date,
    ar.total_hours,
    ar.productive_hours,
    ar.idle_hours,
    ROUND((ar.productive_hours / NULLIF(ar.total_hours, 0) * 100), 2) as productivity_percentage,
    COUNT(act.id) as total_activities,
    COUNT(CASE WHEN act.application_category = 'productive' THEN 1 END) as productive_activities,
    AVG(act.productivity_score) as avg_productivity_score
FROM attendance_records ar
LEFT JOIN activity_records act ON ar.id = act.attendance_id
WHERE ar.location_type = 'remote'
GROUP BY ar.user_id, ar.attendance_date, ar.total_hours, ar.productive_hours, ar.idle_hours;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nexus;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nexus;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO nexus;
