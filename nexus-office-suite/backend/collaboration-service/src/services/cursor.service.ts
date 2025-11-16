import { createClient, RedisClientType } from 'redis';
import { logger } from '../middleware/logger';

export interface CursorPosition {
  userId: string;
  userName: string;
  documentId: string;
  position: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  color: string;
  timestamp: number;
}

const CURSOR_TIMEOUT = 30; // 30 seconds

export class CursorService {
  private redisClient: RedisClientType | null = null;

  async initialize(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.redisClient.on('error', (err) => logger.error('Redis Client Error', err));
      await this.redisClient.connect();

      logger.info('Redis connected for cursor tracking');
    } catch (error) {
      logger.error('Failed to connect to Redis for cursors', { error });
      throw error;
    }
  }

  async updateCursor(cursor: CursorPosition): Promise<void> {
    if (!this.redisClient) return;

    const key = `cursor:${cursor.documentId}:${cursor.userId}`;
    cursor.timestamp = Date.now();

    await this.redisClient.set(key, JSON.stringify(cursor), {
      EX: CURSOR_TIMEOUT,
    });

    logger.debug('Cursor updated', {
      userId: cursor.userId,
      documentId: cursor.documentId,
      position: cursor.position,
    });
  }

  async removeCursor(documentId: string, userId: string): Promise<void> {
    if (!this.redisClient) return;

    const key = `cursor:${documentId}:${userId}`;
    await this.redisClient.del(key);

    logger.debug('Cursor removed', { userId, documentId });
  }

  async getDocumentCursors(documentId: string): Promise<CursorPosition[]> {
    if (!this.redisClient) return [];

    const pattern = `cursor:${documentId}:*`;
    const keys = await this.redisClient.keys(pattern);
    const cursors: CursorPosition[] = [];

    for (const key of keys) {
      const data = await this.redisClient.get(key);
      if (data) {
        cursors.push(JSON.parse(data));
      }
    }

    return cursors;
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
