import { useEffect, useRef, useCallback } from 'react';
import type { WebSocketMessage } from '@/types/document';
import { useAuthStore } from '@/store';

interface UseWebSocketOptions {
  documentId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onContentUpdate?: (data: any) => void;
  onCursorMove?: (userId: string, position: number) => void;
  onSelectionChange?: (userId: string, selection: { start: number; end: number }) => void;
  onCommentAdded?: (commentId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { documentId, onMessage, onUserJoined, onUserLeft, onContentUpdate, onCursorMove, onSelectionChange, onCommentAdded } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const user = useAuthStore((state) => state.user);

  const connect = useCallback(() => {
    if (!documentId || !user) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8091';
    const ws = new WebSocket(`${wsUrl}/ws/documents/${documentId}?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket connected');

      // Send join message
      ws.send(JSON.stringify({
        type: 'user_joined',
        userId: user.id,
        documentId,
        timestamp: new Date().toISOString(),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Call generic message handler
        onMessage?.(message);

        // Call specific handlers
        switch (message.type) {
          case 'user_joined':
            onUserJoined?.(message.userId);
            break;
          case 'user_left':
            onUserLeft?.(message.userId);
            break;
          case 'content_update':
            onContentUpdate?.(message.data);
            break;
          case 'cursor_move':
            onCursorMove?.(message.userId, message.data.position);
            break;
          case 'selection_change':
            onSelectionChange?.(message.userId, message.data.selection);
            break;
          case 'comment_added':
            onCommentAdded?.(message.data.commentId);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [documentId, user, onMessage, onUserJoined, onUserLeft, onContentUpdate, onCursorMove, onSelectionChange, onCommentAdded]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        // Send leave message before closing
        if (wsRef.current.readyState === WebSocket.OPEN && user) {
          wsRef.current.send(JSON.stringify({
            type: 'user_left',
            userId: user.id,
            documentId,
            timestamp: new Date().toISOString(),
          }));
        }

        wsRef.current.close();
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, documentId, user]);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'userId' | 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        ...message,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }));
    }
  }, [user]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
