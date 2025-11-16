-- NEXUS Meet Database Schema
-- Initial migration for video conferencing service

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    host_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
    recording_enabled BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    max_participants INTEGER DEFAULT 100,
    password VARCHAR(255),
    lobby_enabled BOOLEAN DEFAULT FALSE,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_avatar VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant')),
    is_muted BOOLEAN DEFAULT FALSE,
    is_video_on BOOLEAN DEFAULT TRUE,
    is_screen_sharing BOOLEAN DEFAULT FALSE,
    is_hand_raised BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'file', 'system')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    size BIGINT NOT NULL DEFAULT 0,
    format VARCHAR(20) NOT NULL DEFAULT 'webm',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create meeting_stats table for analytics
CREATE TABLE IF NOT EXISTS meeting_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    participant_count INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0,
    avg_bitrate INTEGER DEFAULT 0,
    packet_loss DECIMAL(5,2) DEFAULT 0,
    jitter DECIMAL(10,2) DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance

-- Meetings indexes
CREATE INDEX idx_meetings_tenant_id ON meetings(tenant_id);
CREATE INDEX idx_meetings_host_id ON meetings(host_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX idx_meetings_tenant_status ON meetings(tenant_id, status);

-- Participants indexes
CREATE INDEX idx_participants_meeting_id ON participants(meeting_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_meeting_user ON participants(meeting_id, user_id);
CREATE INDEX idx_participants_joined_at ON participants(joined_at);
CREATE INDEX idx_participants_active ON participants(meeting_id) WHERE left_at IS NULL;

-- Chat messages indexes
CREATE INDEX idx_chat_messages_meeting_id ON chat_messages(meeting_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);

-- Recordings indexes
CREATE INDEX idx_recordings_meeting_id ON recordings(meeting_id);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- Meeting stats indexes
CREATE INDEX idx_meeting_stats_meeting_id ON meeting_stats(meeting_id);
CREATE INDEX idx_meeting_stats_timestamp ON meeting_stats(timestamp DESC);

-- Trigger to update updated_at timestamp on meetings table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update meeting status when all participants leave
CREATE OR REPLACE FUNCTION check_meeting_participants()
RETURNS TRIGGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Count active participants in the meeting
    SELECT COUNT(*) INTO active_count
    FROM participants
    WHERE meeting_id = NEW.meeting_id AND left_at IS NULL;

    -- If no active participants and meeting is active, consider ending it
    -- This is just a helper, actual logic should be in application layer
    IF active_count = 0 THEN
        -- Log or handle as needed
        NULL;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER participant_left_trigger
    AFTER UPDATE ON participants
    FOR EACH ROW
    WHEN (NEW.left_at IS NOT NULL AND OLD.left_at IS NULL)
    EXECUTE FUNCTION check_meeting_participants();

-- Function to get active meetings count for a tenant
CREATE OR REPLACE FUNCTION get_active_meetings_count(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    meeting_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO meeting_count
    FROM meetings
    WHERE tenant_id = p_tenant_id AND status = 'active';

    RETURN meeting_count;
END;
$$ language 'plpgsql';

-- Function to get participant count for a meeting
CREATE OR REPLACE FUNCTION get_participant_count(p_meeting_id UUID)
RETURNS INTEGER AS $$
DECLARE
    participant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO participant_count
    FROM participants
    WHERE meeting_id = p_meeting_id AND left_at IS NULL;

    RETURN participant_count;
END;
$$ language 'plpgsql';

-- Function to cleanup old ended meetings (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_meetings(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM meetings
        WHERE status = 'ended'
        AND updated_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Insert default data or constraints as needed
-- You can add any seed data here

-- Comments for documentation
COMMENT ON TABLE meetings IS 'Stores video conference meeting information';
COMMENT ON TABLE participants IS 'Stores participant information for meetings';
COMMENT ON TABLE chat_messages IS 'Stores chat messages sent during meetings';
COMMENT ON TABLE recordings IS 'Stores recording metadata for meetings';
COMMENT ON TABLE meeting_stats IS 'Stores analytics and statistics for meetings';

COMMENT ON COLUMN meetings.lobby_enabled IS 'Whether participants need approval to join';
COMMENT ON COLUMN meetings.password IS 'Optional password protection (should be hashed)';
COMMENT ON COLUMN participants.role IS 'User role in the meeting (host, co-host, participant)';
COMMENT ON COLUMN chat_messages.type IS 'Message type (text, file, system)';
