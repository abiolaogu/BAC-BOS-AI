import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '@/types/meeting';

export class SocketClient {
  private socket: Socket | null = null;
  private url: string;
  private isConnected = false;

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8095';
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const options = {
          transports: ['websocket', 'polling'],
          auth: token ? { token } : undefined,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        };

        this.socket = io(this.url, options);

        this.socket.on('connect', () => {
          console.log('Socket connected');
          this.isConnected = true;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          this.isConnected = false;
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });
      } catch (error) {
        console.error('Failed to create socket:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket manually disconnected');
    }
  }

  emit<K extends keyof SocketEvents>(
    event: K,
    data?: Parameters<SocketEvents[K]>[0]
  ): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit(event as string, data);
  }

  on<K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.on(event as string, callback as any);
  }

  off<K extends keyof SocketEvents>(
    event: K,
    callback?: SocketEvents[K]
  ): void {
    if (!this.socket) {
      return;
    }
    if (callback) {
      this.socket.off(event as string, callback as any);
    } else {
      this.socket.off(event as string);
    }
  }

  once<K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.once(event as string, callback as any);
  }

  // Convenience methods for common events
  joinMeeting(meetingId: string, name: string, email: string): void {
    this.emit('join-meeting', { meetingId, name, email });
  }

  leaveMeeting(meetingId: string): void {
    this.emit('leave-meeting', { meetingId });
  }

  toggleAudio(enabled: boolean): void {
    this.emit('toggle-audio', { enabled });
  }

  toggleVideo(enabled: boolean): void {
    this.emit('toggle-video', { enabled });
  }

  startScreenShare(): void {
    this.emit('start-screen-share');
  }

  stopScreenShare(): void {
    this.emit('stop-screen-share');
  }

  raiseHand(raised: boolean): void {
    this.emit('raise-hand', { raised });
  }

  sendMessage(message: any): void {
    this.emit('send-message', message);
  }

  // WebRTC signaling methods
  requestTransport(direction: 'send' | 'recv'): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('request-transport', { direction }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('connect-transport', { transportId, dtlsParameters }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  produce(transportId: string, kind: 'audio' | 'video', rtpParameters: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('produce', { transportId, kind, rtpParameters }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.producerId);
        }
      });
    });
  }

  consume(transportId: string, producerId: string, rtpCapabilities: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('consume', { transportId, producerId, rtpCapabilities }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let socketClientInstance: SocketClient | null = null;

export const getSocketClient = (url?: string): SocketClient => {
  if (!socketClientInstance) {
    socketClientInstance = new SocketClient(url);
  }
  return socketClientInstance;
};

export const resetSocketClient = (): void => {
  if (socketClientInstance) {
    socketClientInstance.disconnect();
    socketClientInstance = null;
  }
};
