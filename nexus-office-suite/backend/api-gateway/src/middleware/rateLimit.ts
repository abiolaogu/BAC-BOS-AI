import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { createClient } from 'redis';
import { logger } from './logger';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

// Redis client for distributed rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

export const initializeRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    await redisClient.connect();
    logger.info('Redis connected for rate limiting');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
  }
};

// Custom key generator based on user ID or IP
const keyGenerator = (req: Request): string => {
  if (req.user?.userId) {
    return `rate-limit:user:${req.user.userId}`;
  }
  return `rate-limit:ip:${req.ip}`;
};

// General rate limiter
export const generalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP/user, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      key: keyGenerator(req),
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Custom tenant-based rate limiter
export const tenantRateLimiter = async (
  req: Request,
  res: Response,
  next: Function
): Promise<void> => {
  if (!redisClient || !req.user?.tenantId) {
    return next();
  }

  const tenantId = req.user.tenantId;
  const key = `rate-limit:tenant:${tenantId}`;
  const window = 60; // 1 minute
  const maxRequests = 1000; // 1000 requests per minute per tenant

  try {
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, window);
    }

    if (count > maxRequests) {
      logger.warn('Tenant rate limit exceeded', { tenantId, count });
      res.status(429).json({
        error: 'Tenant rate limit exceeded',
        message: 'Your organization has exceeded the rate limit.',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in tenant rate limiting', { error });
    next(); // Continue on error
  }
};

export { redisClient };
