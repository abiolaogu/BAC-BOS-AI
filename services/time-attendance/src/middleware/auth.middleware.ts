/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TimeAttendanceError, ErrorCode } from '../types';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    organizationId?: string;
  };
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new TimeAttendanceError(
        ErrorCode.UNAUTHORIZED,
        'No authentication token provided',
        401
      );
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      organizationId: decoded.organizationId,
    };

    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(
        new TimeAttendanceError(
          ErrorCode.UNAUTHORIZED,
          'Invalid authentication token',
          401
        )
      );
    }
    next(error);
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // TODO: Implement role checking with IDaaS integration
    next();
  };
}
