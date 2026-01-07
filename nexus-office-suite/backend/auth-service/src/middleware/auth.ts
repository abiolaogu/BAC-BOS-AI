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
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

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
