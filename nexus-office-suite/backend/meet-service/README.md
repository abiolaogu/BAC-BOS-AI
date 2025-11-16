# NEXUS Meet Service

A comprehensive WebRTC video conferencing service built with Node.js, TypeScript, Socket.IO, and mediasoup. Part of the NEXUS Office Suite.

## Features

- **Real-time Video Conferencing**: High-quality video and audio using WebRTC
- **SFU Architecture**: Scalable Selective Forwarding Unit using mediasoup
- **Screen Sharing**: Share your screen with meeting participants
- **Text Chat**: Real-time messaging during meetings
- **Meeting Management**: Create, schedule, and manage meetings
- **Participant Controls**: Mute/unmute, video on/off, raise hand
- **Recording Support**: Record meetings for later viewing (optional)
- **Password Protection**: Secure meetings with passwords
- **Lobby Mode**: Control who can join your meeting
- **Multi-tenant Support**: Isolated tenants with separate data

## Technology Stack

- **Node.js** - Runtime environment
- **TypeScript** - Type-safe development
- **Express** - HTTP server framework
- **Socket.IO** - Real-time bidirectional communication
- **mediasoup** - WebRTC SFU for media routing
- **PostgreSQL** - Primary database
- **Redis** - Caching and pub/sub
- **JWT** - Authentication

## Architecture

### Components

1. **HTTP API** - REST endpoints for meeting CRUD operations
2. **WebSocket Server** - Real-time signaling and communication
3. **mediasoup Workers** - WebRTC media processing
4. **Database Layer** - PostgreSQL for persistent data
5. **Cache Layer** - Redis for session management

### Database Schema

- `meetings` - Meeting metadata and settings
- `participants` - Participant information and status
- `chat_messages` - Chat message history
- `recordings` - Recording metadata
- `meeting_stats` - Analytics and statistics

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- Redis >= 6
- Docker (optional)

## Installation

### 1. Clone and Install

```bash
cd nexus-office-suite/backend/meet-service
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
NODE_ENV=development
PORT=8095
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexus_meet
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Mediasoup
RTC_MIN_PORT=10000
RTC_MAX_PORT=10100
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=your-public-ip
```

### 3. Database Setup

Create the database and run migrations:

```bash
# Create database
createdb nexus_meet

# Run migration
psql -d nexus_meet -f migrations/001_initial_schema.sql
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:8095`

## Production Deployment

### Using Docker

```bash
# Build image
docker build -t nexus-meet-service .

# Run container
docker run -d \
  --name nexus-meet \
  -p 8095:8095 \
  -p 10000-10100:10000-10100/udp \
  -p 10000-10100:10000-10100/tcp \
  --env-file .env \
  nexus-meet-service
```

### Using Docker Compose

```yaml
version: '3.8'
services:
  meet-service:
    build: .
    ports:
      - "8095:8095"
      - "10000-10100:10000-10100/udp"
      - "10000-10100:10000-10100/tcp"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
      MEDIASOUP_ANNOUNCED_IP: ${PUBLIC_IP}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
```

### Manual Deployment

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Documentation

### Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### REST Endpoints

#### Meetings

- `GET /api/meetings` - Get all meetings for tenant
- `GET /api/meetings/:id` - Get meeting by ID
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `POST /api/meetings/:id/start` - Start scheduled meeting
- `POST /api/meetings/:id/end` - End active meeting
- `GET /api/meetings/:id/participants` - Get meeting participants
- `GET /api/meetings/:id/stats` - Get meeting statistics

#### Example: Create Meeting

```bash
curl -X POST http://localhost:8095/api/meetings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Standup",
    "description": "Daily team standup meeting",
    "scheduled_start": "2024-01-15T10:00:00Z",
    "max_participants": 50,
    "is_public": false,
    "lobby_enabled": true
  }'
```

### WebSocket Events

#### Client to Server

- `join-meeting` - Join a meeting
- `leave-meeting` - Leave meeting
- `create-transport` - Create WebRTC transport
- `connect-transport` - Connect WebRTC transport
- `produce` - Start producing media (audio/video)
- `consume` - Consume media from another participant
- `resume-consumer` - Resume paused consumer
- `pause-producer` - Pause producer (mute)
- `resume-producer` - Resume producer (unmute)
- `close-producer` - Close producer (stop sharing)
- `toggle-mute` - Toggle audio mute
- `toggle-video` - Toggle video on/off
- `toggle-hand` - Toggle hand raised
- `send-message` - Send chat message
- `get-messages` - Get chat history
- `start-screen-share` - Start screen sharing
- `stop-screen-share` - Stop screen sharing

#### Server to Client

- `participant-joined` - New participant joined
- `participant-left` - Participant left
- `participant-updated` - Participant status updated
- `new-producer` - New media producer available
- `producer-paused` - Producer paused
- `producer-resumed` - Producer resumed
- `producer-closed` - Producer closed
- `new-message` - New chat message

#### Example: Join Meeting (Client)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8095', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.emit('join-meeting', {
  meetingId: 'meeting-id',
  password: 'optional-password'
}, (response) => {
  if (response.success) {
    console.log('Joined meeting:', response.data);
    // Setup WebRTC using rtpCapabilities
  } else {
    console.error('Failed to join:', response.error);
  }
});
```

## WebRTC Flow

1. **Join Meeting**: Client connects via WebSocket and joins meeting
2. **Get RTP Capabilities**: Server sends router capabilities
3. **Create Transports**: Client creates send and receive transports
4. **Connect Transports**: Client connects transports with DTLS parameters
5. **Produce Media**: Client produces audio/video streams
6. **Consume Media**: Client consumes other participants' streams
7. **Leave Meeting**: Client disconnects and cleans up resources

## Configuration

### Mediasoup Settings

The service uses mediasoup for WebRTC SFU functionality. Key settings:

- **Workers**: One worker per CPU core
- **RTC Ports**: 10000-10100 (configurable)
- **Codecs**: VP8, VP9, H264 for video; Opus for audio
- **Listen IP**: Internal IP for binding
- **Announced IP**: Public IP for clients (required in production)

### Performance Tuning

- **Max Participants**: Configurable per meeting (default: 100)
- **Bitrate**: Adjustable based on network conditions
- **Worker Distribution**: Load balanced across CPU cores

## Monitoring

### Health Check

```bash
curl http://localhost:8095/health
```

### Logs

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

In development, logs are also output to console.

### Metrics

Monitor these metrics for production:
- Active meetings count
- Participant count per meeting
- WebRTC connection quality
- CPU and memory usage
- Network bandwidth

## Security

- **JWT Authentication**: All requests require valid JWT
- **Password Protection**: Optional password for meetings
- **Tenant Isolation**: Multi-tenant data separation
- **CORS**: Configurable allowed origins
- **Rate Limiting**: Implement at reverse proxy level
- **HTTPS**: Required in production

## Troubleshooting

### Common Issues

1. **Can't connect to meeting**
   - Check JWT token validity
   - Verify CORS origins in `.env`
   - Ensure WebSocket transport is enabled

2. **No video/audio**
   - Check MEDIASOUP_ANNOUNCED_IP is set correctly
   - Verify RTC ports (10000-10100) are open
   - Check firewall rules for UDP/TCP

3. **High CPU usage**
   - Reduce max participants per meeting
   - Scale horizontally with multiple instances
   - Optimize video bitrate settings

4. **Database connection errors**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database exists and migrations are run

## Development

### Project Structure

```
src/
├── config/          # Configuration
├── database/        # Database clients
├── middleware/      # Express middleware
├── repositories/    # Data access layer
├── routes/          # HTTP routes
├── services/        # Business logic
├── socket/          # WebSocket handlers
├── types/           # TypeScript types
├── utils/           # Utilities
└── index.ts         # Entry point
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

### Adding Features

1. Add types in `src/types/index.ts`
2. Create database migrations in `migrations/`
3. Add repository methods in `src/repositories/`
4. Implement business logic in `src/services/`
5. Add routes/socket handlers
6. Update documentation

## License

AGPL-3.0

## Support

For issues and questions:
- GitHub Issues: [nexus-office-suite/issues](https://github.com/yourusername/nexus-office-suite/issues)
- Documentation: [docs.nexusmeet.com](https://docs.nexusmeet.com)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

Built with ❤️ by the NEXUS Team
