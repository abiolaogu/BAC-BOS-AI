# WebSocket Events

**Version**: 1.0
**Protocol**: Socket.IO

---

## Connection

```javascript
// Client connection
import io from 'socket.io-client';

const socket = io('https://nexus.yourdomain.com', {
  auth: { token: 'jwt-token' }
});
```

---

## Events

### Presence Events

**User joined**:
```javascript
socket.on('user:joined', (data) => {
  // { userId: '123', documentId: 'doc-456', name: 'John', cursor: {...} }
});
```

**User left**:
```javascript
socket.on('user:left', (data) => {
  // { userId: '123', documentId: 'doc-456' }
});
```

### Document Events

**Document changed**:
```javascript
socket.emit('document:change', {
  documentId: 'doc-456',
  operations: [...],  // Operational transform ops
  userId: '123'
});

socket.on('document:change', (data) => {
  // Apply changes to local document
});
```

### Meeting Events

**Participant joined**:
```javascript
socket.on('meeting:participant-joined', (data) => {
  // { meetingId: 'meet-789', userId: '123', stream: {...} }
});
```

**Offer/Answer (WebRTC)**:
```javascript
socket.emit('webrtc:offer', {
  meetingId: 'meet-789',
  target: 'user-456',
  offer: {...}
});
```

---

**Previous**: [Database Schema](03-database-schema.md) | **Next**: [Security →](05-security.md)
