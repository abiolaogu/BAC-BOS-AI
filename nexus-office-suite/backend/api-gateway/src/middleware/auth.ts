import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { getJwtSecret } from '../utils/security';

// Get JWT secret with proper validation - no hardcoded fallback
const JWT_SECRET = getJwtSecret();

export interface AuthPayload {
  userId: string;
  email: string;
  tenantId?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Token verification failed', { error });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.user = payload;
    } catch (error) {
      logger.warn('Optional auth token verification failed', { error });
    }
  }

  next();
};

export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
