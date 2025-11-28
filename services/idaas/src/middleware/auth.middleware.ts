/**
 * NEXUS IDaaS - Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { TokenPayload, IDaaSError, ErrorCode, TokenType } from '../types';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { db } from '../database';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authenticate request using JWT
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'No token provided',
        401
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = verifyToken(token);

    // Check if token is access token
    if (payload.type !== TokenType.ACCESS) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Invalid token type',
        401
      );
    }

    // Check if session exists (optional - can be disabled for performance)
    const sessionExists = await cache.exists(`session:${payload.userId}`);
    if (!sessionExists) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Session not found',
        401
      );
    }

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof IDaaSError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    } else {
      logger.error('Authentication error', { error });
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Authentication failed',
        },
      });
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload.type === TokenType.ACCESS) {
        req.user = payload;
      }
    }
  } catch (error) {
    // Silently ignore authentication errors in optional mode
    logger.debug('Optional authentication failed', { error });
  }

  next();
}

/**
 * Require specific permission
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new IDaaSError(
          ErrorCode.PERMISSION_DENIED,
          'Not authenticated',
          403
        );
      }

      // Check if user has permission
      // This is a simplified version - in production, you'd check against
      // the user's roles and permissions in the database
      const hasPermission = await checkPermission(
        req.user.userId,
        resource,
        action,
        req.user.organizationId
      );

      if (!hasPermission) {
        throw new IDaaSError(
          ErrorCode.PERMISSION_DENIED,
          'Insufficient permissions',
          403
        );
      }

      next();
    } catch (error) {
      if (error instanceof IDaaSError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        logger.error('Permission check error', { error });
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.PERMISSION_DENIED,
            message: 'Permission check failed',
          },
        });
      }
    }
  };
}

/**
 * Check if user has permission
 */
async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  organizationId?: string
): Promise<boolean> {
  try {
    // Check for system roles or organization roles
    const query = `
      SELECT COUNT(*) as count
      FROM permissions p
      JOIN roles r ON p.role_id = r.id
      JOIN organization_memberships om ON om.role = r.name
      WHERE om.user_id = $1
      AND (om.organization_id = $2 OR r.is_system = true)
      AND (p.resource = '*' OR p.resource = $3)
      AND (p.action = '*' OR p.action = $4)
    `;

    const result = await db.queryOne<{ count: string }>(query, [
      userId,
      organizationId || null,
      resource,
      action,
    ]);

    return parseInt(result?.count || '0', 10) > 0;
  } catch (error) {
    logger.error('Failed to check permission', { error, userId, resource, action });
    return false;
  }
}

/**
 * Require email verification
 */
export async function requireEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new IDaaSError(
        ErrorCode.PERMISSION_DENIED,
        'Not authenticated',
        403
      );
    }

    // Get user from cache or database
    const user = await cache.get(`user:${req.user.userId}`);
    if (!user || !user.emailVerified) {
      throw new IDaaSError(
        ErrorCode.EMAIL_NOT_VERIFIED,
        'Email verification required',
        403
      );
    }

    next();
  } catch (error) {
    if (error instanceof IDaaSError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    } else {
      next(error);
    }
  }
}

/**
 * Rate limit by user
 */
export function rateLimitByUser(maxRequests: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next();
      }

      const key = `ratelimit:user:${req.user.userId}`;
      const current = await cache.get<number>(key) || 0;

      if (current >= maxRequests) {
        throw new IDaaSError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          429
        );
      }

      await cache.set(key, current + 1, windowSeconds);
      next();
    } catch (error) {
      if (error instanceof IDaaSError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        next(error);
      }
    }
  };
}
