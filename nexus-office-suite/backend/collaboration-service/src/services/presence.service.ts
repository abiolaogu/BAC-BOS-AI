import { createClient, RedisClientType } from 'redis';
import { logger } from '../middleware/logger';

export interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  documentId?: string;
  color?: string;
}

const PRESENCE_TIMEOUT = parseInt(process.env.PRESENCE_TIMEOUT_MS || '60000', 10);

export class PresenceService {
  private redisClient: RedisClientType | null = null;
  private presenceCheckInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.redisClient.on('error', (err) => logger.error('Redis Client Error', err));
      await this.redisClient.connect();

      logger.info('Redis connected for presence tracking');

      // Start presence check interval
      this.startPresenceCheck();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async setUserPresence(userId: string, userName: string, documentId?: string): Promise<void> {
    if (!this.redisClient) return;

    const presence: UserPresence = {
      userId,
      userName,
      status: 'online',
      lastSeen: Date.now(),
      documentId,
      color: this.generateUserColor(userId),
    };

    const key = `presence:${userId}`;
    await this.redisClient.set(key, JSON.stringify(presence), {
      EX: Math.floor(PRESENCE_TIMEOUT / 1000) + 10, // Add buffer
    });

    // Add to document presence set if documentId provided
    if (documentId) {
      await this.redisClient.sAdd(`presence:doc:${documentId}`, userId);
      await this.redisClient.expire(`presence:doc:${documentId}`, Math.floor(PRESENCE_TIMEOUT / 1000) + 10);
    }

    logger.debug('User presence updated', { userId, documentId });
  }

  async removeUserPresence(userId: string, documentId?: string): Promise<void> {
    if (!this.redisClient) return;

    const key = `presence:${userId}`;
    await this.redisClient.del(key);

    if (documentId) {
      await this.redisClient.sRem(`presence:doc:${documentId}`, userId);
    }

    logger.debug('User presence removed', { userId, documentId });
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    if (!this.redisClient) return null;

    const key = `presence:${userId}`;
    const data = await this.redisClient.get(key);

    if (!data) return null;

    return JSON.parse(data);
  }

  async getDocumentPresence(documentId: string): Promise<UserPresence[]> {
    if (!this.redisClient) return [];

    const userIds = await this.redisClient.sMembers(`presence:doc:${documentId}`);
    const presences: UserPresence[] = [];

    for (const userId of userIds) {
      const presence = await this.getUserPresence(userId);
      if (presence && Date.now() - presence.lastSeen < PRESENCE_TIMEOUT) {
        presences.push(presence);
      }
    }

    return presences;
  }

  async updateUserStatus(userId: string, status: 'online' | 'away' | 'offline'): Promise<void> {
    if (!this.redisClient) return;

    const presence = await this.getUserPresence(userId);
    if (!presence) return;

    presence.status = status;
    presence.lastSeen = Date.now();

    const key = `presence:${userId}`;
    await this.redisClient.set(key, JSON.stringify(presence), {
      EX: Math.floor(PRESENCE_TIMEOUT / 1000) + 10,
    });
  }

  async heartbeat(userId: string): Promise<void> {
    if (!this.redisClient) return;

    const presence = await this.getUserPresence(userId);
    if (!presence) return;

    presence.lastSeen = Date.now();

    const key = `presence:${userId}`;
    await this.redisClient.set(key, JSON.stringify(presence), {
      EX: Math.floor(PRESENCE_TIMEOUT / 1000) + 10,
    });
  }

  private startPresenceCheck(): void {
    // Check every 30 seconds for stale presence
    this.presenceCheckInterval = setInterval(async () => {
      if (!this.redisClient) return;

      try {
        const keys = await this.redisClient.keys('presence:*');
        const now = Date.now();

        for (const key of keys) {
          if (key.startsWith('presence:doc:')) continue;

          const data = await this.redisClient.get(key);
          if (!data) continue;

          const presence: UserPresence = JSON.parse(data);

          if (now - presence.lastSeen > PRESENCE_TIMEOUT) {
            await this.redisClient.del(key);
            logger.debug('Removed stale presence', { userId: presence.userId });
          }
        }
      } catch (error) {
        logger.error('Error checking presence', { error });
      }
    }, 30000);
  }

  private generateUserColor(userId: string): string {
    // Generate consistent color for user based on their ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  async disconnect(): Promise<void> {
    if (this.presenceCheckInterval) {
      clearInterval(this.presenceCheckInterval);
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
