/**
 * NEXUS IDaaS - Redis Cache Client
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from './logger';

class CacheClient {
  private client: RedisClientType;
  private static instance: CacheClient;
  private connected: boolean = false;

  private constructor() {
    const redisConfig = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    };

    this.client = createClient(redisConfig) as RedisClientType;

    // Event handlers
    this.client.on('error', (err) => {
      logger.error('Redis error', { error: err });
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('✅ Redis connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis disconnected');
      this.connected = false;
    });

    this.connect();
  }

  public static getInstance(): CacheClient {
    if (!CacheClient.instance) {
      CacheClient.instance = new CacheClient();
    }
    return CacheClient.instance;
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${config.redis.keyPrefix}${key}`;
  }

  /**
   * Set a value in cache
   */
  public async set(
    key: string,
    value: any,
    ttl?: number
  ): Promise<void> {
    if (!this.connected) {
      logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const cacheKey = this.buildKey(key);

      if (ttl) {
        await this.client.setEx(cacheKey, ttl, serialized);
      } else {
        await this.client.set(cacheKey, serialized);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Get a value from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    if (!this.connected) {
      logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const cacheKey = this.buildKey(key);
      const value = await this.client.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  public async delete(key: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key);
      await this.client.del(cacheKey);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Delete keys by pattern
   */
  public async deletePattern(pattern: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cachePattern = this.buildKey(pattern);
      const keys = await this.client.keys(cachePattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
    }
  }

  /**
   * Check if a key exists
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Increment a value
   */
  public async increment(key: string, by: number = 1): Promise<number> {
    if (!this.connected) {
      return 0;
    }

    try {
      const cacheKey = this.buildKey(key);
      return await this.client.incrBy(cacheKey, by);
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      return 0;
    }
  }

  /**
   * Set expiry on a key
   */
  public async expire(key: string, ttl: number): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key);
      await this.client.expire(cacheKey, ttl);
    } catch (error) {
      logger.error('Cache expire error', { key, error });
    }
  }

  /**
   * Get remaining TTL
   */
  public async ttl(key: string): Promise<number> {
    if (!this.connected) {
      return -1;
    }

    try {
      const cacheKey = this.buildKey(key);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      logger.error('Cache TTL error', { key, error });
      return -1;
    }
  }

  /**
   * Flush all cache
   */
  public async flush(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.flushDb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', { error });
    }
  }

  /**
   * Store in hash
   */
  public async hset(key: string, field: string, value: any): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key);
      const serialized = JSON.stringify(value);
      await this.client.hSet(cacheKey, field, serialized);
    } catch (error) {
      logger.error('Cache hset error', { key, field, error });
    }
  }

  /**
   * Get from hash
   */
  public async hget<T = any>(key: string, field: string): Promise<T | null> {
    if (!this.connected) {
      return null;
    }

    try {
      const cacheKey = this.buildKey(key);
      const value = await this.client.hGet(cacheKey, field);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache hget error', { key, field, error });
      return null;
    }
  }

  /**
   * Get all from hash
   */
  public async hgetall<T = any>(key: string): Promise<Record<string, T>> {
    if (!this.connected) {
      return {};
    }

    try {
      const cacheKey = this.buildKey(key);
      const values = await this.client.hGetAll(cacheKey);

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(values)) {
        result[field] = JSON.parse(value) as T;
      }

      return result;
    } catch (error) {
      logger.error('Cache hgetall error', { key, error });
      return {};
    }
  }

  /**
   * Add to set
   */
  public async sadd(key: string, ...members: string[]): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key);
      await this.client.sAdd(cacheKey, members);
    } catch (error) {
      logger.error('Cache sadd error', { key, error });
    }
  }

  /**
   * Check if member in set
   */
  public async sismember(key: string, member: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key);
      return await this.client.sIsMember(cacheKey, member);
    } catch (error) {
      logger.error('Cache sismember error', { key, error });
      return false;
    }
  }

  /**
   * Get all members of set
   */
  public async smembers(key: string): Promise<string[]> {
    if (!this.connected) {
      return [];
    }

    try {
      const cacheKey = this.buildKey(key);
      return await this.client.sMembers(cacheKey);
    } catch (error) {
      logger.error('Cache smembers error', { key, error });
      return [];
    }
  }

  /**
   * Close connection
   */
  public async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<any> {
    if (!this.connected) {
      return null;
    }

    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      return null;
    }
  }
}

// Export singleton instance
export const cache = CacheClient.getInstance();
export default cache;
