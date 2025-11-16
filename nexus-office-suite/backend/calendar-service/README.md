# NEXUS Calendar Service

A production-ready calendar service built with Go and Fiber, providing comprehensive calendar management with CalDAV support for syncing with external clients.

## Features

### Calendar Management
- **Multiple calendars per user** - Create and manage multiple calendars with custom names and colors
- **Calendar sharing** - Share calendars with other users with granular permissions (read, write, admin)
- **Calendar visibility** - Control which calendars are displayed
- **Time zone support** - Each calendar can have its own time zone

### Event Management
- **Create, edit, and delete events** - Full CRUD operations for events
- **All-day events** - Support for all-day events
- **Recurring events** - Support for daily, weekly, monthly, and yearly recurrence patterns (RRULE format)
- **Event categories** - Categorize events with custom categories and colors
- **Busy/free status** - Set availability status (busy, free, tentative, out-of-office)
- **Event visibility** - Public or private events
- **Event search** - Search events by title, description, or location

### Invitations & Attendees
- **Event invitations** - Invite internal and external attendees to events
- **RSVP functionality** - Attendees can respond with accepted, declined, or tentative
- **Organizer tracking** - Track event organizers and optional attendees
- **Notification management** - Track notification status for attendees

### Reminders
- **Multiple reminders per event** - Set multiple reminders for each event
- **Reminder methods** - Support for email, notification, and popup reminders
- **Automatic reminder tracking** - Track sent reminders to avoid duplicates

### CalDAV Integration
- **iCalendar export** - Export calendars to iCal format (.ics)
- **iCalendar import** - Import events from iCal files
- **CalDAV URL generation** - Generate CalDAV URLs for external client sync
- **RFC 5545 compliant** - Full compliance with iCalendar specification

### NEXUS Meet Integration
- **Meeting URL support** - Add NEXUS Meet links directly to events
- **Seamless integration** - Create calendar events with video conferencing

## Architecture

### Tech Stack
- **Go 1.21** - Modern, efficient backend language
- **Fiber v2** - Fast HTTP framework
- **PostgreSQL** - Reliable relational database
- **JWT** - Secure authentication
- **CalDAV/iCal** - Standard calendar protocols

### Project Structure
```
calendar-service/
├── config/                 # Configuration management
│   ├── config.go          # Config loader
│   └── config.yaml        # Configuration file
├── models/                # Data models
│   ├── calendar.go        # Calendar models
│   ├── event.go          # Event models
│   └── reminder.go       # Reminder models
├── repositories/          # Data access layer
│   ├── calendar_repository.go
│   ├── event_repository.go
│   └── reminder_repository.go
├── services/             # Business logic
│   ├── calendar_service.go
│   ├── event_service.go
│   └── caldav_service.go
├── handlers/             # HTTP handlers
│   ├── calendar_handler.go
│   ├── event_handler.go
│   ├── caldav_handler.go
│   └── middleware.go
├── migrations/           # Database migrations
│   └── 001_init.sql
├── main.go              # Application entry point
├── Dockerfile           # Container definition
└── docker-compose.yml   # Development setup
```

## API Endpoints

### Calendar Endpoints
- `POST /api/v1/calendars` - Create a new calendar
- `GET /api/v1/calendars` - Get all user calendars (owned + shared)
- `GET /api/v1/calendars/:id` - Get calendar by ID
- `PUT /api/v1/calendars/:id` - Update calendar
- `DELETE /api/v1/calendars/:id` - Delete calendar
- `POST /api/v1/calendars/:id/share` - Share calendar with another user

### Event Endpoints
- `POST /api/v1/events` - Create a new event
- `GET /api/v1/events` - Get all user events with date range
- `GET /api/v1/events/:id` - Get event by ID
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event
- `POST /api/v1/events/:id/rsvp` - Respond to event invitation
- `GET /api/v1/events/search?q=query` - Search events
- `GET /api/v1/calendars/:calendarId/events` - Get events for specific calendar

### CalDAV Endpoints
- `GET /api/v1/caldav/calendars/:calendarId/export` - Export calendar to iCal
- `POST /api/v1/caldav/calendars/:calendarId/import` - Import iCal file
- `GET /api/v1/caldav/calendars/:calendarId/url` - Get CalDAV URL

## Getting Started

### Prerequisites
- Go 1.21 or higher
- PostgreSQL 15 or higher
- Docker and Docker Compose (optional)

### Installation

#### Using Docker Compose (Recommended)
```bash
# Clone the repository
cd nexus-office-suite/backend/calendar-service

# Start the services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Manual Setup
```bash
# Install dependencies
go mod download

# Set up PostgreSQL database
createdb nexus_calendar

# Run migrations
psql -U nexus -d nexus_calendar -f migrations/001_init.sql

# Copy and configure config file
cp config/config.yaml config/config.local.yaml
# Edit config.local.yaml with your settings

# Run the service
go run main.go
```

### Configuration

Edit `config/config.yaml` or set environment variables:

```yaml
server:
  port: 8083
  host: "0.0.0.0"

database:
  host: "localhost"
  port: 5432
  user: "nexus"
  password: "nexus_password"
  dbname: "nexus_calendar"
  sslmode: "disable"

jwt:
  secret: "your-secret-key-change-in-production"
  expiration: 168  # 7 days in hours

caldav:
  enabled: true
  path: "/caldav"

cors:
  allow_origins: "*"
  allow_methods: "GET,POST,PUT,DELETE,OPTIONS"
  allow_headers: "Origin,Content-Type,Accept,Authorization"
```

Environment variables override config file:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`

## Usage Examples

### Create a Calendar
```bash
curl -X POST http://localhost:8083/api/v1/calendars \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work",
    "description": "Work-related events",
    "color": "#FF5733",
    "time_zone": "America/New_York",
    "is_default": true
  }'
```

### Create an Event
```bash
curl -X POST http://localhost:8083/api/v1/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "calendar_id": "calendar-uuid",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "location": "Conference Room A",
    "start_time": "2025-11-20T10:00:00Z",
    "end_time": "2025-11-20T11:00:00Z",
    "time_zone": "America/New_York",
    "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO",
    "attendees": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      }
    ],
    "reminders": [
      {
        "minutes": 15,
        "method": "notification"
      }
    ]
  }'
```

### Export Calendar to iCal
```bash
curl -X GET "http://localhost:8083/api/v1/caldav/calendars/calendar-uuid/export" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o calendar.ics
```

### Import iCal File
```bash
curl -X POST http://localhost:8083/api/v1/caldav/calendars/calendar-uuid/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: text/calendar" \
  --data-binary @calendar.ics
```

## Database Schema

### Tables
- **calendars** - User calendars with settings
- **calendar_shares** - Calendar sharing permissions
- **events** - Calendar events
- **event_attendees** - Event attendees and RSVPs
- **reminders** - Event reminders

### Relationships
- Each calendar belongs to a user
- Calendars can be shared with multiple users
- Events belong to calendars
- Events can have multiple attendees and reminders
- Recurring events reference a parent event

## Security

- **JWT Authentication** - All endpoints require valid JWT tokens
- **Permission-based access** - Granular permissions for shared calendars
- **User isolation** - Users can only access their own or shared calendars
- **Input validation** - All inputs are validated
- **SQL injection protection** - Parameterized queries

## CalDAV Protocol Support

The service supports CalDAV protocol for synchronization with external calendar clients:

### Supported Clients
- Apple Calendar
- Mozilla Thunderbird
- Google Calendar (import/export)
- Outlook (import/export)
- Any CalDAV-compatible client

### CalDAV URL Format
```
http://localhost:8083/caldav/calendars/{calendar-id}
```

## Performance

- **Database indexing** - Optimized queries with proper indexes
- **Connection pooling** - Efficient database connection management
- **Stateless architecture** - Horizontal scalability
- **Efficient queries** - Date range filtering for large datasets

## Development

### Run Tests
```bash
go test ./...
```

### Build
```bash
go build -o calendar-service
```

### Run with Hot Reload
```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

## Monitoring

### Health Check
```bash
curl http://localhost:8083/health
```

Response:
```json
{
  "status": "ok",
  "service": "nexus-calendar-service"
}
```

## Future Enhancements

- [ ] Email notifications for event invitations
- [ ] WebSocket support for real-time updates
- [ ] Event attachments
- [ ] Calendar templates
- [ ] Event analytics and insights
- [ ] Calendar subscriptions (read-only)
- [ ] Time zone conversion utilities
- [ ] Conflict detection
- [ ] Meeting room booking
- [ ] Integration with external calendar services

## Contributing

1. Follow Go best practices
2. Write tests for new features
3. Update documentation
4. Use conventional commits

## License

Part of the NEXUS Office Suite platform.
