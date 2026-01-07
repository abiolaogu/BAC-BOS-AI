/**
 * Authentication Middleware Unit Tests
 */

import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middleware/auth';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/mocks';

describe('Authentication Middleware', () => {
  const JWT_SECRET = process.env.JWT_SECRET!;

  describe('authenticate', () => {
    it('should call next() with valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
        roles: ['user'],
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
      expect((req as any).user).toBeDefined();
      expect((req as any).user.userId).toBe('user-123');
      expect((req as any).user.email).toBe('test@example.com');
    });

    it('should return 401 when no token is provided', () => {
      const req = createMockRequest({
        headers: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is malformed', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'InvalidFormat token123',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      // When split by ' ' and getting [1], it would get 'token123'
      // which is not a valid JWT, so it should return 403
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when token is invalid', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when token is expired', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' }); // Already expired

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should return 403 when token is signed with wrong secret', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle token without Bearer prefix', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const req = createMockRequest({
        headers: {
          authorization: token, // No Bearer prefix
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      // Should return 401 or 403 since format is wrong
      expect(next).not.toHaveBeenCalled();
    });

    it('should include all payload fields in req.user', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
        roles: ['admin', 'user'],
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req as any, res as any, next);

      expect((req as any).user.userId).toBe(payload.userId);
      expect((req as any).user.email).toBe(payload.email);
      expect((req as any).user.tenantId).toBe(payload.tenantId);
      expect((req as any).user.roles).toEqual(payload.roles);
    });
  });
});
