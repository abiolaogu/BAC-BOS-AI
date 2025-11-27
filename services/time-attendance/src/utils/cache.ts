/**
 * NEXUS Time & Attendance - Redis Cache
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

class Cache {
  private client: RedisClientType | null = null;

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0'),
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    await this.client.connect();
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  /**
   * Get client instance
   */
  private getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return this.client;
  }

  /**
   * Set value with optional TTL
   */
  async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<void> {
    const client = this.getClient();
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  }

  /**
   * Get value
   */
  async get<T = any>(key: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const client = this.getClient();
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    await client.del(keys);
    return keys.length;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * Increment value
   */
  async increment(key: string, by: number = 1): Promise<number> {
    const client = this.getClient();
    return await client.incrBy(key, by);
  }

  /**
   * Decrement value
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    const client = this.getClient();
    return await client.decrBy(key, by);
  }

  /**
   * Set expiration
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, ttlSeconds);
  }

  /**
   * Get TTL
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Set multiple values
   */
  async mset(data: Record<string, any>): Promise<void> {
    const client = this.getClient();
    const serialized: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      serialized[key] = JSON.stringify(value);
    }

    await client.mSet(serialized);
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const client = this.getClient();
    const values = await client.mGet(keys);

    return values.map((value) => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as any;
      }
    });
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    const client = this.getClient();
    return await client.sAdd(key, members);
  }

  /**
   * Remove from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    const client = this.getClient();
    return await client.sRem(key, members);
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return await client.sMembers(key);
  }

  /**
   * Check if member in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const client = this.getClient();
    return await client.sIsMember(key, member);
  }

  /**
   * Add to sorted set
   */
  async zadd(
    key: string,
    score: number,
    member: string
  ): Promise<number> {
    const client = this.getClient();
    return await client.zAdd(key, { score, value: member });
  }

  /**
   * Get sorted set range
   */
  async zrange(
    key: string,
    start: number,
    stop: number
  ): Promise<string[]> {
    const client = this.getClient();
    return await client.zRange(key, start, stop);
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<void> {
    const client = this.getClient();
    await client.flushAll();
  }
}

export const cache = new Cache();
