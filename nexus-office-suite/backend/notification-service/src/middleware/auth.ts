import { Request, Response, NextFunction } from 'express';

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
  // Extract user information from headers set by API Gateway
  const userId = req.headers['x-user-id'] as string;
  const email = req.headers['x-user-email'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;
  const rolesHeader = req.headers['x-user-roles'] as string;

  if (!userId || !email) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const roles = rolesHeader ? rolesHeader.split(',') : [];

  req.user = {
    userId,
    email,
    tenantId,
    roles,
  };

  next();
};
