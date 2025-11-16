import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Integration Tests for NEXUS Meet
 * Tests real-time communication features
 */

const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'http://localhost:5000';

describe('Meet WebSocket', () => {
  let socket1: Socket;
  let socket2: Socket;

  beforeEach((done) => {
    socket1 = io(WEBSOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: 'test-token-1',
      },
    });

    socket2 = io(WEBSOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: 'test-token-2',
      },
    });

    let connected = 0;
    const checkConnected = () => {
      connected++;
      if (connected === 2) done();
    };

    socket1.on('connect', checkConnected);
    socket2.on('connect', checkConnected);
  });

  afterEach(() => {
    socket1.disconnect();
    socket2.disconnect();
  });

  describe('Room Management', () => {
    it('should join room', (done) => {
      socket1.emit('join-room', { roomId: 'test-room-123' });

      socket1.on('room-joined', (data) => {
        expect(data).toHaveProperty('roomId', 'test-room-123');
        expect(data).toHaveProperty('participants');
        done();
      });
    });

    it('should notify other users when joining', (done) => {
      socket1.emit('join-room', { roomId: 'test-room-123' });

      socket1.on('room-joined', () => {
        socket2.emit('join-room', { roomId: 'test-room-123' });
      });

      socket1.on('user-joined', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });

    it('should leave room', (done) => {
      socket1.emit('join-room', { roomId: 'test-room-123' });

      socket1.on('room-joined', () => {
        socket1.emit('leave-room', { roomId: 'test-room-123' });
      });

      socket1.on('room-left', (data) => {
        expect(data).toHaveProperty('roomId', 'test-room-123');
        done();
      });
    });

    it('should notify other users when leaving', (done) => {
      socket1.emit('join-room', { roomId: 'test-room-123' });
      socket2.emit('join-room', { roomId: 'test-room-123' });

      socket2.on('room-joined', () => {
        socket1.emit('leave-room', { roomId: 'test-room-123' });
      });

      socket2.on('user-left', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });
  });

  describe('Signaling', () => {
    beforeEach((done) => {
      socket1.emit('join-room', { roomId: 'signal-room' });
      socket2.emit('join-room', { roomId: 'signal-room' });

      let joined = 0;
      const checkJoined = () => {
        joined++;
        if (joined === 2) done();
      };

      socket1.on('room-joined', checkJoined);
      socket2.on('room-joined', checkJoined);
    });

    it('should exchange WebRTC offers', (done) => {
      const offer = { type: 'offer', sdp: 'mock-sdp' };

      socket1.emit('webrtc-offer', {
        targetUserId: 'user-2',
        offer,
      });

      socket2.on('webrtc-offer', (data) => {
        expect(data).toHaveProperty('offer');
        expect(data.offer).toEqual(offer);
        done();
      });
    });

    it('should exchange WebRTC answers', (done) => {
      const answer = { type: 'answer', sdp: 'mock-sdp' };

      socket1.emit('webrtc-answer', {
        targetUserId: 'user-2',
        answer,
      });

      socket2.on('webrtc-answer', (data) => {
        expect(data).toHaveProperty('answer');
        expect(data.answer).toEqual(answer);
        done();
      });
    });

    it('should exchange ICE candidates', (done) => {
      const candidate = {
        candidate: 'mock-candidate',
        sdpMLineIndex: 0,
      };

      socket1.emit('ice-candidate', {
        targetUserId: 'user-2',
        candidate,
      });

      socket2.on('ice-candidate', (data) => {
        expect(data).toHaveProperty('candidate');
        expect(data.candidate).toEqual(candidate);
        done();
      });
    });
  });

  describe('Chat', () => {
    beforeEach((done) => {
      socket1.emit('join-room', { roomId: 'chat-room' });
      socket2.emit('join-room', { roomId: 'chat-room' });

      let joined = 0;
      const checkJoined = () => {
        joined++;
        if (joined === 2) done();
      };

      socket1.on('room-joined', checkJoined);
      socket2.on('room-joined', checkJoined);
    });

    it('should send chat message', (done) => {
      const message = {
        text: 'Hello from socket1',
        timestamp: Date.now(),
      };

      socket1.emit('chat-message', {
        roomId: 'chat-room',
        message,
      });

      socket2.on('chat-message', (data) => {
        expect(data).toHaveProperty('message');
        expect(data.message.text).toBe('Hello from socket1');
        done();
      });
    });

    it('should broadcast typing indicator', (done) => {
      socket1.emit('typing-start', { roomId: 'chat-room' });

      socket2.on('user-typing', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });

    it('should broadcast typing stopped', (done) => {
      socket1.emit('typing-stop', { roomId: 'chat-room' });

      socket2.on('user-typing-stopped', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });
  });

  describe('Media Controls', () => {
    beforeEach((done) => {
      socket1.emit('join-room', { roomId: 'media-room' });
      socket2.emit('join-room', { roomId: 'media-room' });

      let joined = 0;
      const checkJoined = () => {
        joined++;
        if (joined === 2) done();
      };

      socket1.on('room-joined', checkJoined);
      socket2.on('room-joined', checkJoined);
    });

    it('should notify mic mute', (done) => {
      socket1.emit('mic-muted', { roomId: 'media-room', muted: true });

      socket2.on('user-mic-muted', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data.muted).toBe(true);
        done();
      });
    });

    it('should notify camera toggle', (done) => {
      socket1.emit('camera-toggled', { roomId: 'media-room', enabled: false });

      socket2.on('user-camera-toggled', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data.enabled).toBe(false);
        done();
      });
    });

    it('should notify screen share start', (done) => {
      socket1.emit('screen-share-start', { roomId: 'media-room' });

      socket2.on('user-screen-share-start', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });

    it('should notify screen share stop', (done) => {
      socket1.emit('screen-share-stop', { roomId: 'media-room' });

      socket2.on('user-screen-share-stop', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });
  });

  describe('Participant Management', () => {
    beforeEach((done) => {
      socket1.emit('join-room', { roomId: 'participant-room' });
      socket2.emit('join-room', { roomId: 'participant-room' });

      let joined = 0;
      const checkJoined = () => {
        joined++;
        if (joined === 2) done();
      };

      socket1.on('room-joined', checkJoined);
      socket2.on('room-joined', checkJoined);
    });

    it('should get participant list', (done) => {
      socket1.emit('get-participants', { roomId: 'participant-room' });

      socket1.on('participants-list', (data) => {
        expect(data).toHaveProperty('participants');
        expect(Array.isArray(data.participants)).toBe(true);
        expect(data.participants.length).toBeGreaterThanOrEqual(2);
        done();
      });
    });

    it('should mute participant (host only)', (done) => {
      socket1.emit('mute-participant', {
        roomId: 'participant-room',
        targetUserId: 'user-2',
      });

      socket2.on('force-muted', (data) => {
        expect(data).toHaveProperty('mutedBy');
        done();
      });
    });

    it('should remove participant (host only)', (done) => {
      socket1.emit('remove-participant', {
        roomId: 'participant-room',
        targetUserId: 'user-2',
      });

      socket2.on('removed-from-room', (data) => {
        expect(data).toHaveProperty('roomId', 'participant-room');
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid room ID', (done) => {
      socket1.emit('join-room', { roomId: '' });

      socket1.on('error', (data) => {
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('invalid');
        done();
      });
    });

    it('should handle disconnection', (done) => {
      socket1.emit('join-room', { roomId: 'disconnect-room' });
      socket2.emit('join-room', { roomId: 'disconnect-room' });

      socket2.on('room-joined', () => {
        socket1.disconnect();
      });

      socket2.on('user-disconnected', (data) => {
        expect(data).toHaveProperty('userId');
        done();
      });
    });

    it('should handle reconnection', (done) => {
      socket1.emit('join-room', { roomId: 'reconnect-room' });

      socket1.on('room-joined', () => {
        socket1.disconnect();
        socket1.connect();
      });

      socket1.on('reconnected', () => {
        done();
      });
    });
  });
});
