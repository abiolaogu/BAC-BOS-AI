# NEXUS Notification Service

Real-time notification service for the NEXUS Office Suite platform with WebSocket, email, and web push support.

## Features

- **Real-time Notifications**: WebSocket-based push notifications
- **Email Notifications**: SMTP-based email delivery
- **Web Push**: Browser push notifications support
- **Notification Types**: Mentions, shares, comments, invites, meetings, system
- **User Preferences**: Granular control over notification channels
- **Read/Unread Tracking**: Track notification status
- **Notification History**: Store and retrieve notification history
- **Auto-cleanup**: Automatic deletion of old notifications

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
- Database connection (PostgreSQL)
- SMTP settings for email
- VAPID keys for web push
- WebSocket CORS origins

## Database Setup

Run the migration:

```sql
psql -U postgres -d nexus_notifications -f src/migrations/001_initial_schema.sql
```

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
docker build -t nexus-notification-service .
docker run -p 3007:3007 --env-file .env nexus-notification-service
```

## API Endpoints

### REST API

- `GET /notifications` - Get user notifications
- `GET /notifications/unread` - Get unread notifications
- `GET /notifications/unread/count` - Get unread count
- `POST /notifications` - Create notification (internal)
- `PATCH /notifications/:id/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification
- `GET /notifications/preferences` - Get user preferences
- `PUT /notifications/preferences` - Update preferences
- `GET /push/public-key` - Get VAPID public key
- `POST /push/subscribe` - Subscribe to push notifications

### WebSocket Events

**Client to Server:**
- `authenticate` - Authenticate with JWT token
- `get_notifications` - Request notifications
- `mark_read` - Mark notification as read
- `mark_all_read` - Mark all as read
- `delete_notification` - Delete notification

**Server to Client:**
- `notification` - New notification
- `unread_count` - Updated unread count
- `notifications` - List of notifications
- `error` - Error message

## WebSocket Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3007', {
  withCredentials: true,
});

// Authenticate
socket.emit('authenticate', accessToken);

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Listen for unread count
socket.on('unread_count', (count) => {
  console.log('Unread count:', count);
});

// Get notifications
socket.emit('get_notifications', { limit: 20, offset: 0 });

// Mark as read
socket.emit('mark_read', notificationId);

// Mark all as read
socket.emit('mark_all_read');
```

## Web Push Setup

Generate VAPID keys:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Add keys to `.env` file.

Client-side subscription:

```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Get public key
  const response = await fetch('/api/notifications/push/public-key');
  const { publicKey } = await response.json();

  // Subscribe
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey,
  });

  // Send subscription to server
  await fetch('/api/notifications/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(subscription),
  });
}
```

## Notification Types

- `mention` - User mentioned in document/comment
- `share` - Document shared with user
- `comment` - New comment on document
- `invite` - Invitation to collaborate
- `system` - System notifications
- `meeting` - Meeting invitations/updates
- `file_update` - File changes in shared folders

## Creating Notifications (Internal API)

Other services can create notifications by calling:

```bash
POST /notifications
X-Internal-Key: your-internal-api-key
Content-Type: application/json

{
  "userId": "user-id",
  "type": "mention",
  "title": "You were mentioned",
  "message": "John mentioned you in 'Project Plan'",
  "data": {
    "documentId": "doc-123",
    "authorId": "user-456"
  },
  "link": "/documents/doc-123"
}
```

## Notification Preferences

Users can control notifications per type and channel:

```json
{
  "email_enabled": true,
  "push_enabled": true,
  "mention_email": true,
  "mention_push": true,
  "share_email": true,
  "share_push": false,
  "comment_email": false,
  "comment_push": true,
  "invite_email": true,
  "invite_push": true,
  "meeting_email": true,
  "meeting_push": true
}
```

## Database Schema

### Notifications

- `id` (UUID)
- `user_id` (UUID)
- `type` (enum)
- `title`, `message`
- `data` (JSONB)
- `link` (URL)
- `is_read`, `read_at`
- `created_at`

### Notification Preferences

- `id` (UUID)
- `user_id` (UUID, unique)
- Channel preferences (booleans)
- `created_at`, `updated_at`

### Push Subscriptions

- `id` (UUID)
- `user_id` (UUID)
- `endpoint`, `p256dh`, `auth`
- `created_at`

## Integration

This service integrates with:

- **API Gateway**: Routes `/api/notifications/*`
- **All Services**: Send notifications via internal API
- **Frontend**: WebSocket and REST API
- **Email Service**: SMTP delivery
- **Push Service**: Web Push API

## Auto-cleanup

Notifications older than 90 days are automatically deleted daily.

## License

MIT
