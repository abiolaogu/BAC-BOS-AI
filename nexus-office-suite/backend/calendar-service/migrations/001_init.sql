-- Create calendars table
CREATE TABLE IF NOT EXISTS calendars (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) NOT NULL,
    time_zone VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_calendars_user_id ON calendars(user_id);
CREATE INDEX idx_calendars_deleted_at ON calendars(deleted_at);

-- Create calendar_shares table
CREATE TABLE IF NOT EXISTS calendar_shares (
    id UUID PRIMARY KEY,
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL,
    permission VARCHAR(50) NOT NULL CHECK (permission IN ('read', 'write', 'admin')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_calendar_shares_calendar_id ON calendar_shares(calendar_id);
CREATE INDEX idx_calendar_shares_shared_with ON calendar_shares(shared_with);
CREATE INDEX idx_calendar_shares_deleted_at ON calendar_shares(deleted_at);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    time_zone VARCHAR(100) NOT NULL,
    recurrence_rule TEXT,
    recurrence_id UUID,
    status VARCHAR(50) NOT NULL CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
    busy_status VARCHAR(50) NOT NULL CHECK (busy_status IN ('busy', 'free', 'tentative', 'out-of-office')),
    category VARCHAR(100),
    color VARCHAR(50),
    meeting_url TEXT,
    visibility VARCHAR(50) NOT NULL CHECK (visibility IN ('public', 'private')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_events_calendar_id ON events(calendar_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_deleted_at ON events(deleted_at);
CREATE INDEX idx_events_recurrence_id ON events(recurrence_id);

-- Create event_attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    response_status VARCHAR(50) NOT NULL CHECK (response_status IN ('accepted', 'declined', 'tentative', 'needs-action')),
    is_organizer BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_email ON event_attendees(email);
CREATE INDEX idx_event_attendees_deleted_at ON event_attendees(deleted_at);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    minutes INTEGER NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('email', 'notification', 'popup')),
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_event_id ON reminders(event_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_sent ON reminders(sent);
