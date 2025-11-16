import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as any;

    req.user = {
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      email: decoded.email,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
