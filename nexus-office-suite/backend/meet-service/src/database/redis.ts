import { createClient } from 'redis';
import { config } from '../config/config';
import logger from '../utils/logger';

class RedisClient {
  private client: ReturnType<typeof createClient>;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    this.client.on('error', (err) => logger.error('Redis Client Error', err));
    this.client.on('connect', () => {
      this.connected = true;
      logger.info('Redis connected');
    });
    this.client.on('disconnect', () => {
      this.connected = false;
      logger.warn('Redis disconnected');
    });
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.client.setEx(key, expirySeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    return await this.client.hSet(key, field, value);
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    return await this.client.hGet(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  async hDel(key: string, field: string): Promise<number> {
    return await this.client.hDel(key, field);
  }

  async sAdd(key: string, member: string): Promise<number> {
    return await this.client.sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<number> {
    return await this.client.sRem(key, member);
  }

  async sMembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  async sCard(key: string): Promise<number> {
    return await this.client.sCard(key);
  }

  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, callback);
  }
}

export const redis = new RedisClient();
