-- Initialize databases for all services

-- Create databases
CREATE DATABASE IF NOT EXISTS nexus_auth;
CREATE DATABASE IF NOT EXISTS nexus_writer;
CREATE DATABASE IF NOT EXISTS nexus_sheets;
CREATE DATABASE IF NOT EXISTS nexus_slides;
CREATE DATABASE IF NOT EXISTS nexus_drive;
CREATE DATABASE IF NOT EXISTS nexus_meet;
CREATE DATABASE IF NOT EXISTS nexus_notifications;

-- Note: Run individual service migrations after databases are created
-- For auth service: psql -U postgres -d nexus_auth -f backend/auth-service/src/migrations/001_initial_schema.sql
-- For notification service: psql -U postgres -d nexus_notifications -f backend/notification-service/src/migrations/001_initial_schema.sql
-- And so on for other services...

COMMENT ON DATABASE nexus_auth IS 'Authentication and user management';
COMMENT ON DATABASE nexus_writer IS 'NEXUS Writer documents';
COMMENT ON DATABASE nexus_sheets IS 'NEXUS Sheets spreadsheets';
COMMENT ON DATABASE nexus_slides IS 'NEXUS Slides presentations';
COMMENT ON DATABASE nexus_drive IS 'NEXUS Drive file metadata';
COMMENT ON DATABASE nexus_meet IS 'NEXUS Meet video conferencing';
COMMENT ON DATABASE nexus_notifications IS 'NEXUS Notifications';
