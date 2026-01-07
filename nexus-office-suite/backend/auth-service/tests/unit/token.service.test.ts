/**
 * Token Service Unit Tests
 */

import jwt from 'jsonwebtoken';
import { TokenService } from '../../src/services/token.service';
import { testUsers } from '../utils/mocks';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const user = testUsers.validUser as any;
      const token = tokenService.generateAccessToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user info in token payload', () => {
      const user = testUsers.validUser as any;
      const token = tokenService.generateAccessToken(user);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.roles).toEqual(user.roles);
    });

    it('should include tenant_id if present', () => {
      const user = testUsers.validUser as any;
      const token = tokenService.generateAccessToken(user);
      const decoded = jwt.decode(token) as any;

      expect(decoded.tenantId).toBe(user.tenant_id);
    });

    it('should set expiration time', () => {
      const user = testUsers.validUser as any;
      const token = tokenService.generateAccessToken(user);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a secure random token', () => {
      const token = tokenService.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(tokenService.generateRefreshToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should only contain hex characters', () => {
      const token = tokenService.generateRefreshToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const user = testUsers.validUser as any;
      const token = tokenService.generateAccessToken(user);
      const payload = tokenService.verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(user.id);
      expect(payload?.email).toBe(user.email);
    });

    it('should return null for an invalid token', () => {
      const payload = tokenService.verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for a malformed token', () => {
      const payload = tokenService.verifyAccessToken('not.a.valid.jwt.token');
      expect(payload).toBeNull();
    });

    it('should return null for a token signed with wrong secret', () => {
      const fakeToken = jwt.sign({ userId: 'test' }, 'wrong-secret', { expiresIn: '1h' });
      const payload = tokenService.verifyAccessToken(fakeToken);
      expect(payload).toBeNull();
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a valid JWT token', () => {
      const token = tokenService.generatePasswordResetToken('user-123');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include userId and type in payload', () => {
      const token = tokenService.generatePasswordResetToken('user-123');
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe('user-123');
      expect(decoded.type).toBe('password-reset');
    });

    it('should set short expiration (1 hour)', () => {
      const token = tokenService.generatePasswordResetToken('user-123');
      const decoded = jwt.decode(token) as any;

      const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600;
      expect(decoded.exp).toBeLessThanOrEqual(oneHourFromNow + 60); // Allow 1 minute buffer
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify a valid password reset token', () => {
      const token = tokenService.generatePasswordResetToken('user-123');
      const userId = tokenService.verifyPasswordResetToken(token);

      expect(userId).toBe('user-123');
    });

    it('should return null for wrong token type', () => {
      const token = jwt.sign(
        { userId: 'user-123', type: 'email-verification' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      const userId = tokenService.verifyPasswordResetToken(token);

      expect(userId).toBeNull();
    });

    it('should return null for invalid token', () => {
      const userId = tokenService.verifyPasswordResetToken('invalid-token');
      expect(userId).toBeNull();
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate a valid JWT token', () => {
      const token = tokenService.generateEmailVerificationToken('user-123');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include userId and type in payload', () => {
      const token = tokenService.generateEmailVerificationToken('user-123');
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe('user-123');
      expect(decoded.type).toBe('email-verification');
    });

    it('should set longer expiration (24 hours)', () => {
      const token = tokenService.generateEmailVerificationToken('user-123');
      const decoded = jwt.decode(token) as any;

      const twentyFourHoursFromNow = Math.floor(Date.now() / 1000) + 86400;
      expect(decoded.exp).toBeLessThanOrEqual(twentyFourHoursFromNow + 60);
    });
  });

  describe('verifyEmailVerificationToken', () => {
    it('should verify a valid email verification token', () => {
      const token = tokenService.generateEmailVerificationToken('user-123');
      const userId = tokenService.verifyEmailVerificationToken(token);

      expect(userId).toBe('user-123');
    });

    it('should return null for wrong token type', () => {
      const token = jwt.sign(
        { userId: 'user-123', type: 'password-reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      const userId = tokenService.verifyEmailVerificationToken(token);

      expect(userId).toBeNull();
    });

    it('should return null for invalid token', () => {
      const userId = tokenService.verifyEmailVerificationToken('invalid-token');
      expect(userId).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const user = testUsers.validUser as any;
      const token = tokenService.generateAccessToken(user);
      const decoded = tokenService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(user.id);
    });

    it('should decode even a token signed with wrong secret', () => {
      const fakeToken = jwt.sign({ userId: 'test', data: 'value' }, 'any-secret');
      const decoded = tokenService.decodeToken(fakeToken);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe('test');
      expect(decoded.data).toBe('value');
    });
  });
});
