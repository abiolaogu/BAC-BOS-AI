# NEXUS Chat Service

Real-time messaging service built with Node.js, TypeScript, Express, Socket.IO, and PostgreSQL.

## Features

### Core Messaging
- **Real-time Communication**: WebSocket-based instant messaging using Socket.IO
- **Direct Messages**: Private 1-on-1 conversations
- **Group Channels**: Public and private group messaging
- **Message Threading**: Reply to messages in threads
- **Message History**: Persistent message storage with pagination
- **Message Search**: Full-text search across messages

### Rich Messaging Features
- **File Sharing**: Upload and share files with messages
- **Emoji Reactions**: React to messages with emojis
- **@Mentions**: Mention users in messages with notifications
- **Message Editing**: Edit sent messages
- **Message Deletion**: Delete messages (soft delete)
- **Typing Indicators**: See when others are typing
- **Read Receipts**: Track message read status

### Channel Management
- **Channel Types**: Direct, Group, Public, and Private channels
- **Channel Roles**: Owner, Admin, Moderator, Member, Guest
- **Channel Settings**: Customizable channel permissions
- **Member Management**: Add/remove members, update roles
- **Channel Moderation**: Admin controls for channel management

### User Presence
- **Online/Offline Status**: Track user availability
- **Custom Status**: Away, Busy, etc.
- **Last Seen**: Track when users were last active
- **Multi-device Support**: Handle multiple connections per user

### Performance & Scalability
- **Redis Caching**: Fast data access and session management
- **Connection Pooling**: Efficient database connections
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **Horizontal Scaling**: Support for multiple server instances

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis
- **Authentication**: JWT
- **File Storage**: AWS S3 (configurable)

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher
- npm or yarn

## Installation

1. **Clone the repository**
```bash
cd /home/user/BAC-BOS-AI/nexus-office-suite/backend/chat-service
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
# Create database
createdb nexus_chat

# Run migrations
npm run migrate
```

5. **Start Redis**
```bash
redis-server
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
# Build
npm run build

# Start
npm start
```

### Docker
```bash
# Build image
docker build -t nexus-chat-service .

# Run container
docker run -p 3003:3003 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  nexus-chat-service
```

## API Endpoints

### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/channels` | Get user's channels |
| POST | `/api/v1/channels` | Create a new channel |
| POST | `/api/v1/channels/direct` | Create direct message |
| GET | `/api/v1/channels/:id` | Get channel details |
| PATCH | `/api/v1/channels/:id` | Update channel |
| DELETE | `/api/v1/channels/:id` | Delete channel |
| POST | `/api/v1/channels/:id/members` | Add member |
| DELETE | `/api/v1/channels/:id/members/:userId` | Remove member |
| GET | `/api/v1/channels/search/query` | Search channels |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/messages/channels/:id` | Get channel messages |
| GET | `/api/v1/messages/:id/replies` | Get thread replies |
| POST | `/api/v1/messages` | Create message |
| PATCH | `/api/v1/messages/:id` | Update message |
| DELETE | `/api/v1/messages/:id` | Delete message |
| POST | `/api/v1/messages/:id/reactions` | Add reaction |
| DELETE | `/api/v1/messages/:id/reactions/:emoji` | Remove reaction |
| POST | `/api/v1/messages/:id/read` | Mark as read |
| GET | `/api/v1/messages/channels/:id/unread` | Get unread count |
| GET | `/api/v1/messages/search/query` | Search messages |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `{ token }` | Authenticate connection |
| `channel:join` | `{ channelId }` | Join a channel |
| `channel:leave` | `{ channelId }` | Leave a channel |
| `message:send` | `{ channelId, content, ... }` | Send a message |
| `message:update` | `{ messageId, content }` | Update a message |
| `message:delete` | `{ messageId }` | Delete a message |
| `reaction:add` | `{ messageId, emoji }` | Add reaction |
| `reaction:remove` | `{ messageId, emoji }` | Remove reaction |
| `typing:start` | `{ channelId }` | Start typing |
| `typing:stop` | `{ channelId }` | Stop typing |
| `message:read` | `{ channelId, messageId }` | Mark as read |
| `status:update` | `{ status }` | Update user status |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticated` | `{ success, userId }` | Authentication result |
| `channel:joined` | `{ channelId }` | Channel joined |
| `message:created` | `{ message }` | New message |
| `message:updated` | `{ message }` | Message updated |
| `message:deleted` | `{ messageId }` | Message deleted |
| `reaction:added` | `{ messageId, emoji, userId }` | Reaction added |
| `reaction:removed` | `{ messageId, emoji, userId }` | Reaction removed |
| `user:typing` | `{ channelId, userId, username }` | User typing |
| `messages:read` | `{ channelId, messageId, userId }` | Messages read |
| `status:updated` | `{ userId, status }` | Status updated |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL configuration
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `JWT_SECRET`: Secret for JWT token verification

### Optional Variables
- `PORT`: Server port (default: 3003)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed origins for CORS
- `AWS_*`: AWS S3 configuration for file uploads

## Architecture

```
src/
├── config/          # Configuration files
│   ├── database.ts  # Database connection
│   └── redis.ts     # Redis connection
├── models/          # Database models
│   ├── User.ts
│   ├── Channel.ts
│   ├── Message.ts
│   ├── ChannelMember.ts
│   └── ReadReceipt.ts
├── services/        # Business logic
│   ├── ChatService.ts
│   ├── ChannelService.ts
│   └── WebSocketService.ts
├── socket/          # WebSocket handlers
│   └── handlers/
│       └── index.ts
├── routes/          # REST API routes
│   ├── channels.ts
│   ├── messages.ts
│   └── index.ts
├── middleware/      # Express middleware
│   └── auth.ts
├── types/           # TypeScript types
│   ├── index.ts
│   └── socket.ts
├── migrations/      # Database migrations
│   └── run.ts
└── server.ts        # Application entry point
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint
```

## Deployment

### Docker Compose Example

```yaml
version: '3.8'

services:
  chat-service:
    build: .
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=nexus_chat
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Performance Considerations

- **Database Indexing**: Critical fields are indexed for fast queries
- **Redis Caching**: Frequently accessed data is cached
- **Connection Pooling**: Database connections are pooled
- **Message Pagination**: Large message lists are paginated
- **Typing Throttling**: Typing indicators have 5-second TTL

## Security

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: All inputs are validated
- **SQL Injection Prevention**: Sequelize ORM prevents SQL injection
- **XSS Protection**: Helmet.js middleware enabled
- **CORS**: Configurable CORS policy

## Monitoring

The service exposes a health check endpoint:

```bash
GET /api/v1/health
```

Response:
```json
{
  "status": "ok",
  "service": "chat-service"
}
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
