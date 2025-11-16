import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { JWTPayload } from '../types';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token', { error: err.message });
        res.status(403).json({
          success: false,
          error: 'Invalid or expired token',
        });
        return;
      }

      req.user = decoded as JWTPayload;
      next();
    });
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (!err) {
        req.user = decoded as JWTPayload;
      }
      next();
    });
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!req.user.tenant_id) {
    res.status(403).json({
      success: false,
      error: 'Tenant access required',
    });
    return;
  }

  next();
};

export const checkMeetingAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const meetingId = req.params.id || req.params.meetingId;
    if (!meetingId) {
      res.status(400).json({
        success: false,
        error: 'Meeting ID required',
      });
      return;
    }

    // Additional access checks can be implemented here
    // For now, we'll allow access if authenticated

    next();
  } catch (error) {
    logger.error('Error checking meeting access', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
