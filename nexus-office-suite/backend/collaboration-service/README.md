# NEXUS Collaboration Service

Real-time collaboration service for the NEXUS Office Suite platform with presence tracking, live cursors, and operational transformation for collaborative editing.

## Features

- **User Presence**: Track online/offline/away status
- **Live Cursors**: Real-time cursor positions and selections
- **Document Locking**: Prevent editing conflicts
- **Operational Transformation**: Conflict-free collaborative editing
- **Typing Indicators**: Show when users are typing
- **Activity Tracking**: Monitor user activity in documents
- **WebSocket Communication**: Real-time bidirectional communication

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure:
- Redis connection
- WebSocket CORS origins
- Session and presence timeouts

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t nexus-collaboration-service .
docker run -p 3008:3008 --env-file .env nexus-collaboration-service
```

## API Endpoints

### REST API

- `GET /presence/users/:userId` - Get user presence
- `GET /presence/documents/:documentId` - Get document presence

## WebSocket Events

### Client to Server

**Authentication:**
- `authenticate` - Authenticate with token and username
  ```javascript
  socket.emit('authenticate', { token, userName });
  ```

**Document Management:**
- `join_document` - Join a document room
  ```javascript
  socket.emit('join_document', documentId);
  ```
- `leave_document` - Leave current document

**Cursor Updates:**
- `cursor_update` - Update cursor position
  ```javascript
  socket.emit('cursor_update', {
    position: { line: 10, column: 5 },
    selection: {
      start: { line: 10, column: 0 },
      end: { line: 10, column: 10 }
    },
    color: '#FF6B6B'
  });
  ```

**Operations:**
- `operation` - Apply text operation
  ```javascript
  socket.emit('operation', {
    version: 5,
    operations: [
      { type: 'insert', position: 100, text: 'Hello' },
      { type: 'delete', position: 50, length: 5 }
    ]
  });
  ```

**Typing Indicators:**
- `typing_start` - User started typing
- `typing_stop` - User stopped typing

**Presence:**
- `heartbeat` - Keep presence alive
- `status_update` - Update status (online/away/offline)

### Server to Client

**Authentication:**
- `authenticated` - Authentication successful
- `error` - Authentication or operation error

**Document State:**
- `document_state` - Initial document state on join
  ```javascript
  {
    version: 10,
    content: 'document content...',
    presence: [...],
    cursors: [...]
  }
  ```

**User Events:**
- `user_joined` - User joined document
- `user_left` - User left document
- `user_status_changed` - User status changed

**Cursor Events:**
- `cursor_update` - Other user's cursor moved

**Operations:**
- `operation` - Operation applied by other user
- `operation_ack` - Operation acknowledgment
- `operation_error` - Operation failed

**Typing:**
- `user_typing` - User started typing
- `user_stopped_typing` - User stopped typing

## Usage Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3008');

// Authenticate
socket.emit('authenticate', {
  token: 'your-jwt-token',
  userName: 'John Doe'
});

socket.on('authenticated', ({ userId }) => {
  console.log('Authenticated:', userId);

  // Join document
  socket.emit('join_document', 'doc-123');
});

// Receive document state
socket.on('document_state', (state) => {
  console.log('Document version:', state.version);
  console.log('Content:', state.content);
  console.log('Active users:', state.presence);
  console.log('Cursors:', state.cursors);
});

// Listen for cursor updates
socket.on('cursor_update', (cursor) => {
  console.log(`${cursor.userName} moved cursor to`, cursor.position);
});

// Update your cursor
socket.emit('cursor_update', {
  position: { line: 5, column: 10 },
  color: '#FF6B6B'
});

// Apply operation
socket.emit('operation', {
  version: 10,
  operations: [
    { type: 'insert', position: 50, text: 'Hello World' }
  ]
});

// Listen for operations from others
socket.on('operation', (op) => {
  console.log('Remote operation:', op);
  // Apply to local document
});

// Typing indicators
socket.emit('typing_start');
setTimeout(() => socket.emit('typing_stop'), 3000);

// Heartbeat every 30 seconds
setInterval(() => {
  socket.emit('heartbeat');
}, 30000);
```

## Operational Transformation

The service implements a simplified OT algorithm for collaborative editing:

1. **Client sends operation** with current version
2. **Server locks document** to prevent race conditions
3. **If version mismatch**, transform operation against newer versions
4. **Apply operation** to document content
5. **Increment version** and save
6. **Broadcast to other clients** in the document
7. **Release lock**

### Operation Types

- `insert` - Insert text at position
  ```javascript
  { type: 'insert', position: 10, text: 'Hello' }
  ```

- `delete` - Delete text from position
  ```javascript
  { type: 'delete', position: 10, length: 5 }
  ```

- `retain` - Keep text unchanged (for formatting)
  ```javascript
  { type: 'retain', length: 10 }
  ```

## Presence Tracking

Users are automatically tracked when they:
- Connect and authenticate
- Join a document
- Send heartbeat

Users are marked offline when:
- They disconnect
- No heartbeat for 60 seconds

## Cursor Colors

Each user is assigned a consistent color based on their userId hash. Available colors:
- #FF6B6B (Red)
- #4ECDC4 (Teal)
- #45B7D1 (Blue)
- #FFA07A (Orange)
- #98D8C8 (Mint)
- And more...

## Redis Data Structure

### Presence
- Key: `presence:{userId}`
- Value: JSON with user presence data
- TTL: 70 seconds (refreshed by heartbeat)

### Document Presence
- Key: `presence:doc:{documentId}`
- Value: Set of userIds
- TTL: 70 seconds

### Cursors
- Key: `cursor:{documentId}:{userId}`
- Value: JSON with cursor position
- TTL: 30 seconds

### Document Versions
- Key: `doc:version:{documentId}`
- Value: JSON with version and content

### Operations History
- Key: `doc:ops:{documentId}`
- Value: List of operations (last 1000)

## Integration

This service integrates with:

- **API Gateway**: Routes `/api/collaboration/*`
- **All Document Services**: Writer, Sheets, Slides
- **Frontend**: WebSocket client
- **Redis**: State storage

## Performance Considerations

- Presence timeout: 60 seconds
- Cursor timeout: 30 seconds
- Lock timeout: 5 seconds
- Max stored operations: 1000 per document
- Heartbeat recommended: 30 seconds

## License

MIT
